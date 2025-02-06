import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  Cache,
  DocHistoryNotFound,
  DocNotFound,
  EventBus,
  FailedToSaveUpdates,
  FailedToUpsertSnapshot,
  metrics,
  Mutex,
  retryable,
} from '../../../base';
import { DocStorageOptions } from '../options';
import {
  DocRecord,
  DocStorageAdapter,
  DocUpdate,
  HistoryFilter,
} from '../storage';

const UPDATES_QUEUE_CACHE_KEY = 'doc:manager:updates';
declare global {
  interface Events {
    'doc.snapshot.deleted': {
      workspaceId: string;
      docId: string;
    };
    'doc.snapshot.updated': {
      workspaceId: string;
      docId: string;
    };
    'doc.update.pushed': {
      workspaceId: string;
      docId: string;
      editor?: string;
    };
  }
}
@Injectable()
export class PgWorkspaceDocStorageAdapter extends DocStorageAdapter {
  private readonly logger = new Logger(PgWorkspaceDocStorageAdapter.name);

  constructor(
    private readonly db: PrismaClient,
    private readonly mutex: Mutex,
    private readonly cache: Cache,
    private readonly event: EventBus,
    protected override readonly options: DocStorageOptions
  ) {
    super(options);
  }

  async pushDocUpdate(
    workspaceId: string,
    docId: string,
    update: Uint8Array,
    editorId: string
  ) {
    try {
      return await retryable(async () => {
        const timestamp = Date.now();
        await this.db.update.create({
          data: {
            workspaceId,
            id: docId,
            blob: Buffer.from(update),
            createdAt: new Date(timestamp),
            createdBy: editorId || null,
          },
        });
        this.event.emit('doc.update.pushed', {
          workspaceId,
          docId,
          editor: editorId,
        });
        await this.updateCachedUpdatesCount(workspaceId, docId, 1);
        return timestamp;
      });
    } catch (e) {
      this.logger.error('Failed to insert doc updates', e);
      metrics.doc.counter('doc_update_insert_failed').add(1);
      throw new FailedToSaveUpdates();
    }
  }

  protected async getDocUpdates(workspaceId: string, docId: string) {
    const rows = await this.db.update.findMany({
      where: {
        workspaceId,
        id: docId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return rows.map(row => ({
      bin: row.blob,
      timestamp: row.createdAt.getTime(),
      editor: row.createdBy || undefined,
    }));
  }

  async deleteDoc(workspaceId: string, docId: string) {
    const ident = { where: { workspaceId, id: docId } };
    await this.db.$transaction([
      this.db.snapshot.deleteMany(ident),
      this.db.update.deleteMany(ident),
      this.db.snapshotHistory.deleteMany(ident),
    ]);
  }

  async deleteSpace(workspaceId: string) {
    const ident = { where: { workspaceId } };
    await this.db.$transaction([
      this.db.snapshot.deleteMany(ident),
      this.db.update.deleteMany(ident),
      this.db.snapshotHistory.deleteMany(ident),
    ]);
  }

  async getSpaceDocTimestamps(workspaceId: string, after?: number) {
    const snapshots = await this.db.snapshot.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
      where: {
        workspaceId,
        ...(after
          ? {
              updatedAt: {
                gt: new Date(after),
              },
            }
          : {}),
      },
    });

    const updates = await this.db.update.groupBy({
      where: {
        workspaceId,
        ...(after
          ? {
              // [createdAt] in updates table is indexed, so it's fast
              createdAt: {
                gt: new Date(after),
              },
            }
          : {}),
      },
      by: ['id'],
      _max: {
        createdAt: true,
      },
    });

    const result: Record<string, number> = {};

    snapshots.forEach(s => {
      result[s.id] = s.updatedAt.getTime();
    });

    updates.forEach(u => {
      if (u._max.createdAt) {
        result[u.id] = u._max.createdAt.getTime();
      }
    });

    return result;
  }

  protected async markUpdatesMerged(
    workspaceId: string,
    docId: string,
    updates: DocUpdate[]
  ) {
    const result = await this.db.update.deleteMany({
      where: {
        workspaceId,
        id: docId,
        createdAt: {
          in: updates.map(u => new Date(u.timestamp)),
        },
      },
    });

    await this.updateCachedUpdatesCount(workspaceId, docId, -result.count);
    return result.count;
  }

  async listDocHistories(
    workspaceId: string,
    docId: string,
    query: HistoryFilter
  ) {
    const histories = await this.db.snapshotHistory.findMany({
      select: {
        timestamp: true,
        createdByUser: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
      where: {
        workspaceId,
        id: docId,
        timestamp: {
          lt: query.before ? new Date(query.before) : new Date(),
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: query.limit,
    });

    return histories.map(h => ({
      timestamp: h.timestamp.getTime(),
      editor: h.createdByUser,
    }));
  }

  async getDocHistory(workspaceId: string, docId: string, timestamp: number) {
    const history = await this.db.snapshotHistory.findUnique({
      where: {
        workspaceId_id_timestamp: {
          workspaceId,
          id: docId,
          timestamp: new Date(timestamp),
        },
      },
    });

    if (!history) {
      return null;
    }

    return {
      spaceId: workspaceId,
      docId,
      bin: history.blob,
      timestamp,
      editor: history.createdBy || undefined,
    };
  }

  override async rollbackDoc(
    spaceId: string,
    docId: string,
    timestamp: number,
    editorId?: string
  ): Promise<void> {
    await using _lock = await this.lockDocForUpdate(spaceId, docId);
    const toSnapshot = await this.getDocHistory(spaceId, docId, timestamp);
    if (!toSnapshot) {
      throw new DocHistoryNotFound({ spaceId, docId, timestamp });
    }

    const fromSnapshot = await this.getDocSnapshot(spaceId, docId);

    if (!fromSnapshot) {
      throw new DocNotFound({ spaceId, docId });
    }

    // force create a new history record after rollback
    await this.createDocHistory(
      {
        ...fromSnapshot,
        // override the editor to the one who requested the rollback
        editor: editorId,
      },
      true
    );
    // WARN:
    //  we should never do the snapshot updating in recovering,
    //  which is not the solution in CRDT.
    //  let user revert in client and update the data in sync system
    //    const change = this.generateChangeUpdate(fromSnapshot.bin, toSnapshot.bin);
    //    await this.pushDocUpdates(spaceId, docId, [change]);

    metrics.doc
      .counter('history_recovered_counter', {
        description: 'How many times history recovered request happened',
      })
      .add(1);
  }

  protected async createDocHistory(snapshot: DocRecord, force = false) {
    const last = await this.lastDocHistory(snapshot.spaceId, snapshot.docId);

    let shouldCreateHistory = false;

    if (!last) {
      // never created
      shouldCreateHistory = true;
    } else {
      const lastHistoryTimestamp = last.timestamp.getTime();
      if (lastHistoryTimestamp === snapshot.timestamp) {
        // no change
        shouldCreateHistory = false;
      } else if (
        // force
        force ||
        // last history created before interval in configs
        lastHistoryTimestamp <
          snapshot.timestamp - this.options.historyMinInterval(snapshot.spaceId)
      ) {
        shouldCreateHistory = true;
      }
    }

    if (shouldCreateHistory) {
      if (this.isEmptyBin(snapshot.bin)) {
        this.logger.debug(
          `Doc is empty, skip creating history record for ${snapshot.docId} in workspace ${snapshot.spaceId}`
        );
        return false;
      }

      const historyMaxAge = await this.options
        .historyMaxAge(snapshot.spaceId)
        .catch(
          () =>
            0 /* edgecase: user deleted but owned workspaces not handled correctly */
        );

      if (historyMaxAge === 0) {
        return false;
      }

      await this.db.snapshotHistory
        .create({
          select: {
            timestamp: true,
          },
          data: {
            workspaceId: snapshot.spaceId,
            id: snapshot.docId,
            timestamp: new Date(snapshot.timestamp),
            blob: Buffer.from(snapshot.bin),
            createdBy: snapshot.editor,
            expiredAt: new Date(Date.now() + historyMaxAge),
          },
        })
        .catch(() => {
          // safe to ignore
          // only happens when duplicated history record created in multi processes
        });

      metrics.doc
        .counter('history_created_counter', {
          description: 'How many times the snapshot history created',
        })
        .add(1);
      this.logger.debug(
        `History created for ${snapshot.docId} in workspace ${snapshot.spaceId}.`
      );
      return true;
    }

    return false;
  }

  protected async getDocSnapshot(workspaceId: string, docId: string) {
    const snapshot = await this.db.snapshot.findUnique({
      where: {
        workspaceId_id: {
          workspaceId,
          id: docId,
        },
      },
    });

    if (!snapshot) {
      return null;
    }

    return {
      spaceId: workspaceId,
      docId,
      bin: snapshot.blob,
      timestamp: snapshot.updatedAt.getTime(),
      // creator and editor may null if their account is deleted
      editor: snapshot.updatedBy || snapshot.createdBy || undefined,
    };
  }

  protected async setDocSnapshot(snapshot: DocRecord) {
    const { spaceId, docId, bin, timestamp } = snapshot;

    if (this.isEmptyBin(bin)) {
      return false;
    }

    const updatedAt = new Date(timestamp);

    // CONCERNS:
    //   i. Because we save the real user's last seen action time as `updatedAt`,
    //      it's possible to simply compare the `updatedAt` to determine if the snapshot is older than the one we are going to save.
    //
    //  ii. Prisma doesn't support `upsert` with additional `where` condition along side unique constraint.
    //      In our case, we need to manually check the `updatedAt` to avoid overriding the newer snapshot.
    //      where: { workspaceId_id: {}, updatedAt: { lt: updatedAt } }
    //                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    try {
      const result: { updatedAt: Date }[] = await this.db.$queryRaw`
        INSERT INTO "snapshots" ("workspace_id", "guid", "blob", "created_at", "updated_at", "created_by", "updated_by")
        VALUES (${spaceId}, ${docId}, ${bin}, DEFAULT, ${updatedAt}, ${snapshot.editor}, ${snapshot.editor})
        ON CONFLICT ("workspace_id", "guid")
        DO UPDATE SET "blob" = ${bin}, "updated_at" = ${updatedAt}, "updated_by" = ${snapshot.editor}
        WHERE "snapshots"."workspace_id" = ${spaceId} AND "snapshots"."guid" = ${docId} AND "snapshots"."updated_at" <= ${updatedAt}
        RETURNING "snapshots"."workspace_id" as "workspaceId", "snapshots"."guid" as "id", "snapshots"."updated_at" as "updatedAt"
      `;

      // const result = await this.db.snapshot.upsert({
      //   select: {
      //     updatedAt: true,
      //     seq: true,
      //   },
      //   where: {
      //     workspaceId_id: {
      //       workspaceId,
      //       id: guid,
      //     },
      //     ⬇️ NOT SUPPORTED BY PRISMA YET
      //     updatedAt: {
      //       lt: updatedAt,
      //     },
      //   },
      //   update: {
      //     blob,
      //     state,
      //     updatedAt,
      //   },
      //   create: {
      //     workspaceId,
      //     id: guid,
      //     blob,
      //     state,
      //     updatedAt,
      //     seq,
      //   },
      // });

      // if the condition `snapshot.updatedAt > updatedAt` is true, by which means the snapshot has already been updated by other process,
      // the updates has been applied to current `doc` must have been seen by the other process as well.
      // The `updatedSnapshot` will be `undefined` in this case.
      const updatedSnapshot = result.at(0);

      if (updatedSnapshot) {
        this.event.emit('doc.snapshot.updated', {
          workspaceId: snapshot.spaceId,
          docId: snapshot.docId,
        });
      }

      return !!updatedSnapshot;
    } catch (e) {
      metrics.doc.counter('snapshot_upsert_failed').add(1);
      this.logger.error('Failed to upsert snapshot', e);
      throw new FailedToUpsertSnapshot();
    }
  }

  protected override async lockDocForUpdate(
    workspaceId: string,
    docId: string
  ) {
    const lock = await this.mutex.acquire(`doc:update:${workspaceId}:${docId}`);

    if (!lock) {
      throw new Error('Too many concurrent writings');
    }

    return lock;
  }

  protected async lastDocHistory(workspaceId: string, id: string) {
    return this.db.snapshotHistory.findFirst({
      where: {
        workspaceId,
        id,
      },
      select: {
        timestamp: true,
        state: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
  }

  // for auto merging
  async randomDoc() {
    const key = await this.cache.mapRandomKey(UPDATES_QUEUE_CACHE_KEY);

    if (key) {
      const cachedCount = await this.cache.mapIncrease(
        UPDATES_QUEUE_CACHE_KEY,
        key,
        0
      );

      if (cachedCount > 0) {
        const [workspaceId, id] = key.split('::');
        const count = await this.db.update.count({
          where: {
            workspaceId,
            id,
          },
        });

        // FIXME(@forehalo): somehow the update count in cache is not accurate
        if (count === 0) {
          metrics.doc
            .counter('doc_update_count_inconsistent_with_cache')
            .add(1);
          await this.cache.mapDelete(UPDATES_QUEUE_CACHE_KEY, key);
          return null;
        }

        return { workspaceId, docId: id };
      }
    }

    return null;
  }

  private async updateCachedUpdatesCount(
    workspaceId: string,
    guid: string,
    count: number
  ) {
    const result = await this.cache.mapIncrease(
      UPDATES_QUEUE_CACHE_KEY,
      `${workspaceId}::${guid}`,
      count
    );

    if (result <= 0) {
      await this.cache.mapDelete(
        UPDATES_QUEUE_CACHE_KEY,
        `${workspaceId}::${guid}`
      );
    }
  }
}
