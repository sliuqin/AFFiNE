import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { PaginationInput } from '../../base/graphql';
import { Models } from '../../models';
import { CurrentUser } from '../auth/session';
import { AccessController } from '../permission';
import { UserType } from '../user';
import { WorkspaceType } from '../workspaces';
import {
  CommentCreateInput,
  CommentObjectType,
  CommentResolveInput,
  CommentUpdateInput,
  PaginatedCommentChangeObjectType,
  PaginatedCommentObjectType,
  ReplyCreateInput,
  ReplyObjectType,
  ReplyUpdateInput,
} from './types';

@Resolver(() => WorkspaceType)
export class CommentResolver {
  constructor(
    // private readonly service: CommentService,
    private readonly ac: AccessController,
    private readonly models: Models
  ) {}

  @Mutation(() => CommentObjectType)
  async createComment(
    @CurrentUser() me: UserType,
    @Args('input') input: CommentCreateInput
  ): Promise<CommentObjectType> {
    console.log('createComment', me, input);
    // return this.service.createComment(me, input);
    return {
      id: '1',
      content: input.content,
      metadata: input.metadata,
      resolved: false,
      user: {
        id: me.id,
        name: me.name,
        avatarUrl: me.avatarUrl,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      replies: [],
    };
  }

  @Mutation(() => Boolean, {
    description: 'Update a comment content',
  })
  async updateComment(
    @CurrentUser() me: UserType,
    @Args('input') input: CommentUpdateInput
  ) {
    console.log('updateComment', me, input);
    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Resolve a comment or not',
  })
  async resolveComment(
    @CurrentUser() me: UserType,
    @Args('input') input: CommentResolveInput
  ) {
    console.log('resolveComment', me, input);
    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a comment',
  })
  async deleteComment(@CurrentUser() me: UserType, @Args('id') id: string) {
    console.log('deleteComment', me, id);
    return true;
  }

  @Mutation(() => ReplyObjectType)
  async createReply(
    @CurrentUser() me: UserType,
    @Args('input') input: ReplyCreateInput
  ): Promise<ReplyObjectType> {
    const reply = await this.models.comment.createReply({
      ...input,
      userId: me.id,
    });
    return {
      ...reply,
      content: reply.content as object,
      user: {
        id: me.id,
        name: me.name,
        avatarUrl: me.avatarUrl,
      },
    };
  }

  @Mutation(() => Boolean, {
    description: 'Update a reply content',
  })
  async updateReply(
    @CurrentUser() me: UserType,
    @Args('input') input: ReplyUpdateInput
  ) {
    console.log('updateReply', me, input);
    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a reply',
  })
  async deleteReply(@CurrentUser() me: UserType, @Args('id') id: string) {
    console.log('deleteReply', me, id);
    return true;
  }

  @ResolveField(() => PaginatedCommentObjectType, {
    description: 'Get comments of a doc',
  })
  async comments(
    @CurrentUser() me: UserType,
    @Parent() workspace: WorkspaceType,
    @Args('docId') docId: string,
    @Args(
      {
        name: 'pagination',
        nullable: true,
      },
      PaginationInput.decode
    )
    pagination: PaginationInput
  ): Promise<PaginatedCommentObjectType> {
    await this.ac
      .user(me.id)
      .workspace(workspace.id)
      .doc(docId)
      .assert('Doc.Read');

    console.log('comments', me, workspace, docId, pagination);
    // const [notifications, totalCount] = await Promise.all([
    //   this.service.findManyByUserId(me.id, pagination),
    //   this.service.countByUserId(me.id),
    // ]);
    // return paginate(notifications, 'createdAt', pagination, totalCount);
    return {
      totalCount: 0,
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  @ResolveField(() => PaginatedCommentChangeObjectType, {
    description: 'Get comment changes of a doc',
  })
  async commentChanges(
    @CurrentUser() me: UserType,
    @Parent() workspace: WorkspaceType,
    @Args('docId') docId: string,
    @Args(
      {
        name: 'pagination',
      },
      PaginationInput.decode
    )
    pagination: PaginationInput
  ): Promise<PaginatedCommentChangeObjectType> {
    await this.ac
      .user(me.id)
      .workspace(workspace.id)
      .doc(docId)
      .assert('Doc.Read');

    console.log('commentChanges', me, workspace, docId, pagination);
    return {
      totalCount: 0,
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }
}
