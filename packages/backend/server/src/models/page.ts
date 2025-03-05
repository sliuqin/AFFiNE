import { Injectable } from '@nestjs/common';
import { type WorkspaceDoc as Page } from '@prisma/client';

import { BaseModel } from './base';
import { PublicDocMode } from './common';
export type { Page };
export type UpdatePageInput = {
  mode?: PublicDocMode;
  public?: boolean;
};

@Injectable()
export class PageModel extends BaseModel {
  // #region page

  /**
   * Create or update the page.
   */
  async upsert(workspaceId: string, docId: string, data?: UpdatePageInput) {
    return await this.db.workspaceDoc.upsert({
      where: {
        workspaceId_docId: {
          workspaceId,
          docId,
        },
      },
      update: {
        ...data,
      },
      create: {
        ...data,
        workspaceId,
        docId,
      },
    });
  }

  /**
   * Get the page.
   * @param isPublic: if true, only return the public page. If false, only return the private page.
   * If not set, return public or private both.
   */
  async get(workspaceId: string, docId: string, isPublic?: boolean) {
    return await this.db.workspaceDoc.findUnique({
      where: {
        workspaceId_docId: {
          workspaceId,
          docId,
        },
        public: isPublic,
      },
    });
  }

  /**
   * Find the workspace public pages.
   */
  async findPublics(workspaceId: string) {
    return await this.db.workspaceDoc.findMany({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  /**
   * Get the workspace public pages count.
   */
  async getPublicsCount(workspaceId: string) {
    return await this.db.workspaceDoc.count({
      where: {
        workspaceId,
        public: true,
      },
    });
  }

  // #endregion
}
