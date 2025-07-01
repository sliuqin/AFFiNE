import type { CommentChangeAction } from '@affine/graphql';
import type { BaseSelection } from '@blocksuite/affine/store';
import {
  effect,
  Entity,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { catchError, of, Subject, switchMap, tap, timer } from 'rxjs';

import type { SnapshotHelper } from '../services/snapshot-helper';
import type {
  CommentId,
  DocComment,
  DocCommentChangeListResult,
  DocCommentContent,
  DocCommentListResult,
  PendingComment,
} from '../types';
import { DocCommentStore } from './doc-comment-store';

type DisposeCallback = () => void;

export class DocCommentEntity extends Entity<{
  docId: string;
}> {
  constructor(private readonly snapshotHelper: SnapshotHelper) {
    super();
  }
  private readonly store = this.framework.createEntity(DocCommentStore, {
    docId: this.props.docId,
  });

  loading$ = new LiveData<boolean>(false);
  comments$ = new LiveData<DocComment[]>([]);

  // pending comment is a comment that is not yet committed to the server
  readonly pendingComments$ = new LiveData<Map<string, PendingComment>>(
    new Map()
  );

  // the last pending comment is the latest comment that is not yet committed to the server
  readonly pendingComment$ = LiveData.computed(get => {
    const pendingComments = get(this.pendingComments$);
    return Array.from(pendingComments.values()).findLast(
      comment => !comment.commentId
    );
  });

  private readonly commentAdded$ = new Subject<{
    id: CommentId;
    selections: BaseSelection[];
  }>();
  private readonly commentResolved$ = new Subject<CommentId>();
  private readonly commentDeleted$ = new Subject<CommentId>();
  readonly commentHighlighted$ = new LiveData<CommentId | null>(null);

  private pollingDisposable?: DisposeCallback;
  private startCursor?: string;

  async addComment(
    selections?: BaseSelection[],
    preview?: string
  ): Promise<string> {
    // todo: may need to properly bind the doc to the editor
    const doc = await this.snapshotHelper.createStore();
    if (!doc) {
      throw new Error('Failed to create doc');
    }
    const id = nanoid();
    const existing = this.pendingComments$.value;
    const pendingComment: PendingComment = {
      id,
      doc,
      preview,
      selections,
    };

    this.pendingComments$.setValue(
      new Map([...existing, [id, pendingComment]])
    );
    return id;
  }

  async addReply(commentId: string): Promise<string> {
    const doc = await this.snapshotHelper.createStore();
    if (!doc) {
      throw new Error('Failed to create doc');
    }
    const id = nanoid();
    const existing = this.pendingComments$.value;
    const pendingComment: PendingComment = {
      id,
      doc,
      commentId,
    };

    this.pendingComments$.setValue(
      new Map([...existing, [id, pendingComment]])
    );
    return id;
  }

  dismissDraftComment(id: string): void {
    const existing = this.pendingComments$.value;
    const newMap = new Map(existing);
    newMap.delete(id);
    this.pendingComments$.setValue(newMap);
  }

  async commitComment(id: string): Promise<void> {
    const existing = this.pendingComments$.value;
    const pendingComment = existing.get(id);
    if (!pendingComment) {
      console.warn('Pending comment not found:', id);
      return;
    }
    const { doc, preview } = pendingComment;
    const snapshot = this.snapshotHelper.getSnapshot(doc);
    if (!snapshot) {
      throw new Error('Failed to get snapshot');
    }
    const comment = await this.store.createComment({
      content: {
        snapshot,
        preview,
      },
    });
    const currentComments = this.comments$.value;
    this.comments$.setValue([...currentComments, comment]);
    this.commentAdded$.next({
      id: comment.id,
      selections: pendingComment.selections || [],
    });
    this.dismissDraftComment(id);
    this.revalidate();
  }

  async commitReply(id: string): Promise<void> {
    const existing = this.pendingComments$.value;
    const pendingReply = existing.get(id);
    if (!pendingReply) {
      console.warn('Pending reply not found:', id);
      return;
    }
    const { doc } = pendingReply;
    const snapshot = this.snapshotHelper.getSnapshot(doc);
    if (!snapshot) {
      throw new Error('Failed to get snapshot');
    }

    if (!pendingReply.commentId) {
      throw new Error('Pending reply has no commentId');
    }

    const reply = await this.store.createReply(pendingReply.commentId, {
      content: {
        snapshot,
      },
    });
    const currentComments = this.comments$.value;
    const updatedComments = currentComments.map(comment =>
      comment.id === pendingReply.commentId
        ? { ...comment, replies: [...(comment.replies || []), reply] }
        : comment
    );
    this.comments$.setValue(updatedComments);
    this.dismissDraftComment(id);
    this.revalidate();
  }

  async deleteComment(id: string): Promise<void> {
    await this.store.deleteComment(id);
    const currentComments = this.comments$.value;
    this.comments$.setValue(currentComments.filter(c => c.id !== id));
    this.commentDeleted$.next(id);
    this.revalidate();
  }

  async deleteReply(id: string): Promise<void> {
    await this.store.deleteReply(id);
    const currentComments = this.comments$.value;
    const updatedComments = currentComments.map(comment =>
      comment.id === id
        ? {
            ...comment,
            replies: comment.replies?.filter(r => r.id !== id),
          }
        : comment
    );
    this.comments$.setValue(updatedComments);
    this.revalidate();
  }

  async updateComment(id: string, content: DocCommentContent): Promise<void> {
    await this.store.updateComment(id, { content });
    const currentComments = this.comments$.value;
    const updatedComments = currentComments.map(comment =>
      comment.id === id ? { ...comment, content } : comment
    );
    this.comments$.setValue(updatedComments);
    this.revalidate();
  }

  async updateReply(id: string, content: DocCommentContent): Promise<void> {
    await this.store.updateReply(id, { content });
    const currentComments = this.comments$.value;
    const updatedComments = currentComments.map(comment =>
      comment.id === id ? { ...comment, content } : comment
    );
    this.comments$.setValue(updatedComments);
    this.revalidate();
  }

  async resolveComment(id: CommentId): Promise<void> {
    try {
      await this.store.resolveComment(id);

      // Update local state
      const currentComments = this.comments$.value;
      const updatedComments = currentComments.map(comment =>
        comment.id === id ? { ...comment, resolved: true } : comment
      );
      this.comments$.setValue(updatedComments);

      this.commentResolved$.next(id);
      this.revalidate();
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      throw error;
    }
  }

  highlightComment(id: CommentId | null): void {
    this.commentHighlighted$.next(id);
  }

  getComments(): CommentId[] {
    return this.comments$.value.map(comment => comment.id);
  }

  onCommentAdded(
    callback: (id: CommentId, selections: BaseSelection[]) => void
  ): DisposeCallback {
    const subscription = this.commentAdded$.subscribe(({ id, selections }) =>
      callback(id, selections)
    );
    return () => subscription.unsubscribe();
  }

  onCommentResolved(callback: (id: CommentId) => void): DisposeCallback {
    const subscription = this.commentResolved$.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  onCommentDeleted(callback: (id: CommentId) => void): DisposeCallback {
    const subscription = this.commentDeleted$.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  onCommentHighlighted(
    callback: (id: CommentId | null) => void
  ): DisposeCallback {
    const subscription = this.commentHighlighted$.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  // Start polling comments every 30s
  // 1. when comments$ is empty, fetch all comments
  // 2. when comments$ is not empty, fetch changes (using end cursor)
  // 3. loop. when doc is not loaded, skip
  start(): void {
    if (this.pollingDisposable) {
      this.pollingDisposable();
    }

    // Initial load
    this.revalidate();

    // Set up polling every 10 seconds
    const polling$ = timer(10000, 10000).pipe(
      switchMap(() => {
        // If we have comments, fetch changes; otherwise fetch all
        if (this.comments$.value.length > 0) {
          return fromPromise(async () => {
            return await this.store.listCommentChanges({
              after: this.startCursor,
            });
          }).pipe(
            tap(changes => {
              if (changes) {
                this.handleCommentChanges(changes);
              }
            }),
            catchError(error => {
              console.error('Failed to fetch comment changes:', error);
              return of(null);
            })
          );
        } else {
          return fromPromise(async () => {
            const allComments: DocComment[] = [];
            let cursor = '';
            let firstResult: DocCommentListResult | null = null;

            // Fetch all pages of comments
            while (true) {
              const result = await this.store.listComments({ after: cursor });
              if (!firstResult) {
                firstResult = result;
                // Store the startCursor from the first page for future polling
                this.startCursor = result.startCursor;
              }
              allComments.push(...result.comments);
              cursor = result.endCursor;
              if (!result.hasNextPage) {
                break;
              }
            }

            // Update state with all comments
            this.comments$.setValue(allComments);

            return allComments;
          }).pipe(
            catchError(error => {
              console.error('Failed to fetch comments:', error);
              return of(null);
            })
          );
        }
      })
    );

    const subscription = polling$.subscribe();
    this.pollingDisposable = () => subscription.unsubscribe();
  }

  stop(): void {
    if (this.pollingDisposable) {
      this.pollingDisposable();
    }
  }

  private handleCommentChanges(changes: DocCommentChangeListResult): void {
    if (!changes || changes.length === 0) {
      return;
    }

    const currentComments = [...this.comments$.value];
    let commentsUpdated = false;

    for (const change of changes) {
      const { action, comment, commentId } = change;

      if (commentId) {
        // This is a reply change - handle separately
        this.handleReplyChange(currentComments, action, comment, commentId);
        commentsUpdated = true;
      } else {
        // This is a top-level comment change
        switch (action) {
          case 'update': {
            // Update existing comment or add new comment if it doesn't exist
            const updateIndex = currentComments.findIndex(
              c => c.id === comment.id
            );
            if (updateIndex !== -1) {
              // Update existing comment
              currentComments[updateIndex] = comment;
              commentsUpdated = true;
            } else {
              // Add new comment if it doesn't exist (create event)
              currentComments.push(comment);
              commentsUpdated = true;
            }
            break;
          }

          case 'delete': {
            // Remove comment
            const deleteIndex = currentComments.findIndex(
              c => c.id === comment.id
            );
            if (deleteIndex !== -1) {
              currentComments.splice(deleteIndex, 1);
              commentsUpdated = true;
            }
            break;
          }

          default:
            console.warn('Unknown comment change action:', action);
        }
      }
    }

    // Update the comments list if any changes were made
    if (commentsUpdated) {
      this.comments$.setValue(currentComments);
    }
  }

  private handleReplyChange(
    currentComments: DocComment[],
    action: CommentChangeAction,
    reply: DocComment,
    parentCommentId: string
  ): void {
    const parentIndex = currentComments.findIndex(
      c => c.id === parentCommentId
    );
    if (parentIndex === -1) {
      console.warn('Parent comment not found for reply:', parentCommentId);
      return;
    }

    const parentComment = currentComments[parentIndex];
    const replies = [...(parentComment.replies || [])];

    switch (action) {
      case 'update': {
        // Update existing reply or add new reply if it doesn't exist
        const updateIndex = replies.findIndex(r => r.id === reply.id);
        if (updateIndex !== -1) {
          // Update existing reply
          replies[updateIndex] = reply;
          currentComments[parentIndex] = { ...parentComment, replies };
        } else {
          // Add new reply if it doesn't exist (create event)
          replies.push(reply);
          currentComments[parentIndex] = { ...parentComment, replies };
        }
        break;
      }

      case 'delete': {
        // Remove reply
        const deleteIndex = replies.findIndex(r => r.id === reply.id);
        if (deleteIndex !== -1) {
          replies.splice(deleteIndex, 1);
          currentComments[parentIndex] = { ...parentComment, replies };
        }
        break;
      }

      default:
        console.warn('Unknown reply change action:', action);
    }
  }

  revalidate = effect(
    switchMap(() => {
      return fromPromise(async () => {
        const allComments: DocComment[] = [];
        let cursor = '';
        let firstResult: DocCommentListResult | null = null;

        // Fetch all pages of comments
        while (true) {
          const result = await this.store.listComments({ after: cursor });
          if (!firstResult) {
            firstResult = result;
            // Store the startCursor from the first page for polling
            this.startCursor = result.startCursor;
          }
          allComments.push(...result.comments);
          cursor = result.endCursor;
          if (!result.hasNextPage) {
            break;
          }
        }

        return allComments;
      }).pipe(
        tap(allComments => {
          // Update state with all comments
          this.comments$.setValue(allComments);
        }),
        onStart(() => this.loading$.setValue(true)),
        onComplete(() => this.loading$.setValue(false)),
        catchError(error => {
          console.error('Failed to fetch comments:', error);
          this.loading$.setValue(false);
          return of([]);
        })
      );
    })
  );

  override dispose(): void {
    this.stop();
    this.commentAdded$.complete();
    this.commentResolved$.complete();
    this.commentDeleted$.complete();
    this.commentHighlighted$.complete();
    super.dispose();
  }
}
