import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';

import { JobQueue, OnJob } from '../../base';
import { PgWorkspaceDocStorageAdapter } from '../doc';

declare global {
  interface Jobs {
    'doc.mergePendingDocUpdates': {
      workspaceId: string;
      docId: string;
    };
  }
}

@Injectable()
export class DocServiceCronJob {
  constructor(
    private readonly workspace: PgWorkspaceDocStorageAdapter,
    private readonly prisma: PrismaClient,
    private readonly job: JobQueue
  ) {}

  @OnJob('doc.mergePendingDocUpdates')
  async mergePendingDocUpdates({
    workspaceId,
    docId,
  }: Jobs['doc.mergePendingDocUpdates']) {
    await this.workspace.getDoc(workspaceId, docId);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async schedule() {
    const group = await this.prisma.update.groupBy({
      by: ['workspaceId', 'id'],
      _count: true,
    });

    for (const update of group) {
      if (update._count > 100) {
        await this.job.add(
          'doc.mergePendingDocUpdates',
          {
            workspaceId: update.workspaceId,
            docId: update.id,
          },
          {
            jobId: `doc:merge-pending-updates:${update.workspaceId}:${update.id}`,
            priority: update._count,
            delay: 0,
          }
        );
      }
    }
  }
}
