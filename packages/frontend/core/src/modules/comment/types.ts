import type { CommentChangeAction, PublicUserType } from '@affine/graphql';
import type {
  BaseSelection,
  DocSnapshot,
  Store,
} from '@blocksuite/affine/store';

export type CommentId = string;

export interface CommentProvider {
  addComment: (selections: Selection[]) => Promise<void>;
  resolveComment: (id: CommentId) => Promise<void>;
  highlightComment: (id: CommentId | null) => void;
  getComments: () => CommentId[];
  onCommentAdded: (callback: (id: CommentId) => void) => Disposable;
  onCommentResolved: (callback: (id: CommentId) => void) => Disposable;
  onCommentDeleted: (callback: (id: CommentId) => void) => Disposable;
  onCommentHighlighted: (
    callback: (id: CommentId | null) => void
  ) => Disposable;
}

export interface BaseComment {
  id: string;
  content: DocCommentContent;
  createdAt: number;
  updatedAt: number;
  user: PublicUserType;
}

export interface DocComment extends BaseComment {
  resolved: boolean;
  replies?: DocCommentReply[];
}

export type PendingComment = {
  id: string;
  doc: Store;
  preview?: string;
  selections?: BaseSelection[];
  commentId?: string; // only for replies, points to the parent comment
};

export type DocCommentReply = BaseComment;

export type DocCommentContent = {
  snapshot: DocSnapshot; // blocksuite snapshot
  preview?: string; // text preview of the target
};

export interface DocCommentListResult {
  comments: DocComment[];
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
}

export interface DocCommentChange {
  action: CommentChangeAction;
  comment: DocComment;
  commentId?: string; // a change with comment id is a reply
}

export type DocCommentChangeListResult = DocCommentChange[];
