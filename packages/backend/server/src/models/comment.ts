import { Injectable } from '@nestjs/common';
import {
  Comment,
  Reply,
  // Prisma,
} from '@prisma/client';
import { z } from 'zod';

import { CommentNotFound } from '../base';
import { BaseModel } from './base';

export type { Comment, Reply };

// TODO(@fengmk2): move IdSchema to common/base.ts
const IdSchema = z.string().trim().min(1).max(100);
const JSONSchema = z.record(z.any());

export const CommentCreateSchema = z.object({
  workspaceId: IdSchema,
  docId: IdSchema,
  userId: IdSchema,
  content: JSONSchema,
  metadata: JSONSchema,
});

export const CommentUpdateSchema = z.object({
  id: IdSchema,
  content: JSONSchema,
});

export const CommentResolveSchema = z.object({
  id: IdSchema,
  resolved: z.boolean(),
});

export const ReplyCreateSchema = z.object({
  commentId: IdSchema,
  userId: IdSchema,
  content: JSONSchema,
});

export const ReplyUpdateSchema = z.object({
  id: IdSchema,
  content: JSONSchema,
});

export type CommentCreate = z.input<typeof CommentCreateSchema>;
export type CommentUpdate = z.input<typeof CommentUpdateSchema>;
export type CommentResolve = z.input<typeof CommentResolveSchema>;
export type ReplyCreate = z.input<typeof ReplyCreateSchema>;
export type ReplyUpdate = z.input<typeof ReplyUpdateSchema>;

@Injectable()
export class CommentModel extends BaseModel {
  // #region Comment

  async get(id: string) {
    return await this.db.comment.findUnique({
      where: { id },
    });
  }

  /**
   * Create a comment
   * @param input - The comment create input
   * @returns The created comment
   */
  async create(input: CommentCreate) {
    return await this.db.comment.create({
      data: input,
    });
  }

  /**
   * Update a comment content
   * @param input - The comment update input
   * @returns The updated comment
   */
  async update(input: CommentUpdate) {
    return await this.db.comment.update({
      where: { id: input.id },
      data: {
        content: input.content,
      },
    });
  }

  /**
   * Delete a comment or reply
   * @param id - The id of the comment or reply
   * @returns The deleted comment or reply
   */
  async delete(id: string) {
    await this.db.comment.deleteMany({
      where: { id },
    });
    this.logger.log(`Comment ${id} deleted`);
  }

  /**
   * Resolve a comment or not
   * @param input - The comment resolve input
   * @returns The resolved comment
   */
  async resolve(input: CommentResolve) {
    return await this.db.comment.update({
      where: { id: input.id },
      data: { resolved: input.resolved },
    });
  }

  // #endregion

  // #region Reply

  async getReply(id: string) {
    return await this.db.reply.findUnique({
      where: { id },
    });
  }

  /**
   * Reply to a comment
   * @param input - The reply create input
   * @returns The created reply
   */
  async createReply(input: ReplyCreate) {
    // find comment
    const comment = await this.db.comment.findUnique({
      where: { id: input.commentId },
    });
    if (!comment) {
      throw new CommentNotFound();
    }

    return await this.db.reply.create({
      data: {
        ...input,
        workspaceId: comment.workspaceId,
        docId: comment.docId,
      },
    });
  }

  /**
   * Update a reply content
   * @param input - The reply update input
   * @returns The updated reply
   */
  async updateReply(input: ReplyUpdate) {
    return await this.db.reply.update({
      where: { id: input.id },
      data: { content: input.content },
    });
  }

  /**
   * Delete a reply
   * @param id - The id of the reply
   * @returns The deleted reply
   */
  async deleteReply(id: string) {
    await this.db.reply.delete({ where: { id } });
    this.logger.log(`Reply ${id} deleted`);
  }

  // #endregion
}
