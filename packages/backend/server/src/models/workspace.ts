import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { type Workspace } from '@prisma/client';

import { DocIsNotPublic, EventBus } from '../base';
import { BaseModel } from './base';
import { DocRole, PublicDocMode } from './common';

declare global {
  interface Events {
    'workspace.deleted': {
      id: string;
    };
  }
}

export type { Workspace };
export type UpdateWorkspaceInput = Pick<
  Partial<Workspace>,
  'public' | 'enableAi' | 'enableUrlPreview'
>;

@Injectable()
export class WorkspaceModel extends BaseModel {
  constructor(private readonly event: EventBus) {
    super();
  }

  // #region workspace
  /**
   * Create a new workspace for the user, default to private.
   */
  @Transactional()
  async create(userId: string) {
    const workspace = await this.db.workspace.create({
      data: { public: false },
    });
    this.logger.log(`Workspace created with id ${workspace.id}`);
    await this.models.workspaceUser.setOwner(workspace.id, userId);
    return workspace;
  }

  /**
   * Update the workspace with the given data.
   */
  async update(workspaceId: string, data: UpdateWorkspaceInput) {
    const workspace = await this.db.workspace.update({
      where: {
        id: workspaceId,
      },
      data,
    });
    this.logger.log(
      `Updated workspace ${workspaceId} with data ${JSON.stringify(data)}`
    );
    return workspace;
  }

  async get(workspaceId: string) {
    return await this.db.workspace.findUnique({
      where: {
        id: workspaceId,
      },
    });
  }

  async findMany(ids: string[]) {
    return await this.db.workspace.findMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async delete(workspaceId: string) {
    const rawResult = await this.db.workspace.deleteMany({
      where: {
        id: workspaceId,
      },
    });

    if (rawResult.count > 0) {
      this.event.emit('workspace.deleted', { id: workspaceId });
      this.logger.log(`Workspace [${workspaceId}] deleted`);
    }
  }

  async allowUrlPreview(workspaceId: string) {
    const workspace = await this.get(workspaceId);
    return workspace?.enableUrlPreview ?? false;
  }
  // #endregion

  // #region doc
  async getDoc(workspaceId: string, docId: string) {
    return await this.db.workspaceDoc.findUnique({
      where: {
        workspaceId_docId: { workspaceId, docId },
      },
    });
  }

  async isPublicPage(workspaceId: string, docId: string) {
    const doc = await this.getDoc(workspaceId, docId);
    if (doc?.public) {
      return true;
    }

    const workspace = await this.get(workspaceId);
    return workspace?.public ?? false;
  }

  async publishDoc(
    workspaceId: string,
    docId: string,
    mode: PublicDocMode = PublicDocMode.Page
  ) {
    return await this.db.workspaceDoc.upsert({
      where: { workspaceId_docId: { workspaceId, docId } },
      update: { public: true, mode },
      create: { workspaceId, docId, public: true, mode },
    });
  }

  @Transactional()
  async revokePublicDoc(workspaceId: string, docId: string) {
    const doc = await this.getDoc(workspaceId, docId);

    if (!doc?.public) {
      throw new DocIsNotPublic();
    }

    return await this.db.workspaceDoc.update({
      where: { workspaceId_docId: { workspaceId, docId } },
      data: { public: false },
    });
  }

  async hasPublicDoc(workspaceId: string) {
    const count = await this.db.workspaceDoc.count({
      where: {
        workspaceId,
        public: true,
      },
    });

    return count > 0;
  }

  async getPublicDocs(workspaceId: string) {
    return await this.db.workspaceDoc.findMany({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  async setDocDefaultRole(workspaceId: string, docId: string, role: DocRole) {
    await this.db.workspaceDoc.upsert({
      where: { workspaceId_docId: { workspaceId, docId } },
      update: { defaultRole: role },
      create: { workspaceId, docId, defaultRole: role },
    });
  }
  // #endregion
}
