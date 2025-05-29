import {
  createUnionType,
  Field,
  ID,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-scalars';

import { Paginated } from '../../base';
import {
  Comment,
  CommentCreate,
  CommentResolve,
  CommentUpdate,
  Reply,
  ReplyCreate,
  ReplyUpdate,
} from '../../models';
import { PublicUserType } from '../user';

@ObjectType()
export class CommentObjectType implements Partial<Comment> {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSONObject, {
    description: 'The content of the comment',
  })
  content!: object;

  @Field(() => GraphQLJSONObject, {
    description: 'The metadata of the comment',
  })
  metadata!: object;

  @Field(() => Boolean, {
    description: 'Whether the comment is resolved',
  })
  resolved!: boolean;

  @Field(() => PublicUserType, {
    description: 'The user who created the comment',
  })
  user!: PublicUserType;

  @Field(() => String, {
    description: 'The created at time of the comment',
  })
  createdAt!: Date;

  @Field(() => String, {
    description: 'The updated at time of the comment',
  })
  updatedAt!: Date;

  @Field(() => [ReplyObjectType], {
    description: 'The replies of the comment',
  })
  replies!: ReplyObjectType[];
}

@ObjectType()
export class ReplyObjectType implements Partial<Reply> {
  @Field(() => ID)
  commentId!: string;

  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSONObject, {
    description: 'The content of the reply',
  })
  content!: object;

  @Field(() => PublicUserType, {
    description: 'The user who created the reply',
  })
  user!: PublicUserType;

  @Field(() => String, {
    description: 'The created at time of the reply',
  })
  createdAt!: Date;

  @Field(() => String, {
    description: 'The updated at time of the reply',
  })
  updatedAt!: Date;
}

@ObjectType()
export class DeletedCommentObjectType {
  @Field(() => ID, {
    description: 'The id of the comment or reply',
  })
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  commentId?: string;
}

export const UnionCommentObjectType = createUnionType({
  name: 'UnionCommentObjectType',
  types: () =>
    [CommentObjectType, ReplyObjectType, DeletedCommentObjectType] as const,
});

export enum CommentChangeAction {
  create = 'create',
  update = 'update',
  delete = 'delete',
}
registerEnumType(CommentChangeAction, {
  name: 'CommentChangeAction',
  description: 'Comment change action',
});

@ObjectType()
export class CommentChangeObjectType {
  @Field(() => CommentChangeAction, {
    description: 'The action of the comment change',
  })
  action!: CommentChangeAction;

  @Field(() => GraphQLJSONObject, {
    description:
      'The item of the comment or reply, different types have different fields, see UnionCommentObjectType',
  })
  item!: object;
}

@ObjectType()
export class PaginatedCommentObjectType extends Paginated(CommentObjectType) {}

@ObjectType()
export class PaginatedCommentChangeObjectType extends Paginated(
  CommentChangeObjectType
) {}

@InputType()
export class CommentCreateInput implements Partial<CommentCreate> {
  @Field(() => ID)
  workspaceId!: string;

  @Field(() => ID)
  docId!: string;

  @Field(() => GraphQLJSONObject)
  content!: object;

  @Field(() => GraphQLJSONObject)
  metadata!: object;
}

@InputType()
export class CommentUpdateInput implements Partial<CommentUpdate> {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSONObject)
  content!: object;
}

@InputType()
export class CommentResolveInput implements Partial<CommentResolve> {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean, {
    description: 'Whether the comment is resolved',
  })
  resolved!: boolean;
}

@InputType()
export class ReplyCreateInput implements Partial<ReplyCreate> {
  @Field(() => ID)
  commentId!: string;

  @Field(() => GraphQLJSONObject)
  content!: object;
}

@InputType()
export class ReplyUpdateInput implements Partial<ReplyUpdate> {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLJSONObject)
  content!: object;
}
