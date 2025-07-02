import {
  Avatar,
  IconButton,
  Loading,
  Menu,
  useConfirmModal,
} from '@affine/component';
import { AuthService } from '@affine/core/modules/cloud/services/auth';
import { type DocCommentEntity } from '@affine/core/modules/comment/entities/doc-comment';
import { CommentPanelService } from '@affine/core/modules/comment/services/comment-panel-service';
import { DocCommentManagerService } from '@affine/core/modules/comment/services/doc-comment-manager';
import type { DocComment } from '@affine/core/modules/comment/types';
import { DocService } from '@affine/core/modules/doc';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { i18nTime, useI18n } from '@affine/i18n';
import type { DocSnapshot } from '@blocksuite/affine/store';
import { DeleteIcon, DoneIcon, FilterIcon } from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAsyncCallback } from '../../hooks/affine-async-hooks';
import { CommentEditor } from '../comment-editor';
import * as styles from './style.css';

const SortFilterButton = () => {
  return (
    <Menu rootOptions={{ modal: false }} items={[]}>
      <IconButton icon={<FilterIcon />} />
    </Menu>
  );
};

const ReadonlyCommentRenderer = ({
  avatarUrl,
  name,
  time,
  snapshot,
}: {
  avatarUrl: string | null;
  name: string;
  time: number;
  snapshot: DocSnapshot;
}) => {
  return (
    <div data-time={time} className={styles.readonlyCommentContainer}>
      <div className={styles.userContainer}>
        <Avatar url={avatarUrl} size={24} />
        <div className={styles.userName}>{name}</div>
        <div className={styles.time}>
          {i18nTime(time, {
            absolute: { accuracy: 'minute' },
          })}
        </div>
      </div>
      <div style={{ marginLeft: '34px' }}>
        <CommentEditor readonly defaultSnapshot={snapshot} />
      </div>
    </div>
  );
};

const CommentItem = ({
  comment,
  entity,
}: {
  comment: DocComment;
  entity: DocCommentEntity;
}) => {
  const workbench = useService(WorkbenchService);
  const highlighting = useLiveData(entity.commentHighlighted$) === comment.id;
  const t = useI18n();
  const { openConfirmModal } = useConfirmModal();

  const session = useService(AuthService).session;
  const account = useLiveData(session.account$);

  const pendingReply = useLiveData(entity.pendingReply$);
  // Check if the pending reply belongs to this comment
  const isReplyingToThisComment = pendingReply?.commentId === comment.id;

  const commentRef = useRef<HTMLDivElement>(null);

  const handleDelete = useAsyncCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      openConfirmModal({
        title: t['com.affine.comment.delete.confirm.title'](),
        description: t['com.affine.comment.delete.confirm.description'](),
        confirmText: t['Delete'](),
        cancelText: t['Cancel'](),
        confirmButtonOptions: {
          variant: 'error',
        },
        onConfirm: async () => {
          await entity.deleteComment(comment.id);
        },
      });
    },
    [entity, comment.id, openConfirmModal, t]
  );

  const handleResolve = useAsyncCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await entity.resolveComment(comment.id);
    },
    [entity, comment.id]
  );

  const handleCommitReply = useAsyncCallback(async () => {
    if (!pendingReply?.id) return;

    await entity.commitReply(pendingReply.id);
  }, [entity, pendingReply]);

  const handleCancelReply = useCallback(() => {
    if (!pendingReply?.id) return;

    entity.dismissDraftReply();
  }, [entity, pendingReply]);

  const handleClickPreview = useCallback(() => {
    entity.highlightComment(comment.id);
    // todo: support handling focus the comment id
    workbench.workbench.openDoc(
      {
        docId: entity.props.docId,
      },
      {
        show: true,
      }
    );
  }, [comment.id, entity, workbench.workbench]);

  useEffect(() => {
    const subscription = entity.commentHighlighted$
      .distinctUntilChanged()
      .subscribe(id => {
        if (id === comment.id && commentRef.current) {
          commentRef.current.scrollIntoView({ behavior: 'smooth' });

          // Auto-start reply when comment becomes highlighted
          if (!isReplyingToThisComment) {
            entity.addReply(comment.id).catch(() => {
              // Handle error if adding reply fails
              console.error('Failed to add reply');
            });
          }
        } else if (
          id !== comment.id &&
          isReplyingToThisComment &&
          pendingReply
        ) {
          // Cancel reply when comment is no longer highlighted
          entity.dismissDraftReply();
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    comment.id,
    entity.commentHighlighted$,
    isReplyingToThisComment,
    pendingReply,
    entity,
  ]);

  return (
    <div
      onClick={handleClickPreview}
      data-comment-id={comment.id}
      data-highlighting={highlighting}
      className={styles.commentItem}
      ref={commentRef}
    >
      <div className={styles.commentActions}>
        <IconButton
          variant="solid"
          onClick={handleResolve}
          icon={<DoneIcon />}
        />
        <IconButton
          variant="solid"
          onClick={handleDelete}
          icon={<DeleteIcon />}
        />
      </div>
      <div className={styles.previewContainer}>{comment.content.preview}</div>

      <div className={styles.repliesContainer}>
        <ReadonlyCommentRenderer
          avatarUrl={comment.user.avatarUrl}
          name={comment.user.name}
          time={comment.createdAt}
          snapshot={comment.content.snapshot}
        />

        {/* unlike comment, replies are sorted by createdAt in ascending order */}
        {comment.replies
          ?.toSorted((a, b) => a.createdAt - b.createdAt)
          .map(reply => (
            <ReadonlyCommentRenderer
              key={reply.id}
              avatarUrl={reply.user.avatarUrl}
              name={reply.user.name}
              time={reply.createdAt}
              snapshot={reply.content.snapshot}
            />
          ))}
      </div>

      {highlighting && isReplyingToThisComment && pendingReply && account && (
        <div className={styles.commentInputContainer}>
          <div className={styles.userContainer}>
            <Avatar url={account.avatar} size={24} />
          </div>
          <CommentEditor
            autoFocus
            doc={pendingReply.doc}
            onCommit={handleCommitReply}
            onCancel={handleCancelReply}
          />
        </div>
      )}
    </div>
  );
};

const CommentList = ({ entity }: { entity: DocCommentEntity }) => {
  const comments = useLiveData(entity.comments$);
  const t = useI18n();

  // Sort comments by created date (newest first)
  const sortedComments = useMemo(() => {
    return comments.toSorted((a, b) => b.createdAt - a.createdAt);
  }, [comments]);

  const newPendingComment = useLiveData(entity.pendingComment$);
  const loading = useLiveData(entity.loading$);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {t['com.affine.comment.comments']()}
        </div>
        {sortedComments.length > 0 && <SortFilterButton />}
      </div>
      <CommentInput entity={entity} />
      {sortedComments.length === 0 && !newPendingComment && !loading && (
        <div className={styles.empty}>
          {t['com.affine.comment.no-comments']()}
        </div>
      )}
      {loading && sortedComments.length === 0 && !newPendingComment && (
        <div className={styles.loading}>
          <Loading size={32} />
        </div>
      )}
      <div className={styles.commentList}>
        {sortedComments.map(comment => (
          <CommentItem key={comment.id} comment={comment} entity={entity} />
        ))}
      </div>
    </>
  );
};

// handling pending comment
const CommentInput = ({ entity }: { entity: DocCommentEntity }) => {
  const newPendingComment = useLiveData(entity.pendingComment$);
  const pendingPreview = newPendingComment?.preview;

  const handleCommit = useAsyncCallback(async () => {
    if (!newPendingComment?.id) return;
    await entity.commitComment(newPendingComment.id);
  }, [entity, newPendingComment]);

  const handleCancel = useCallback(() => {
    if (!newPendingComment?.id) return;

    entity.dismissDraftComment();
  }, [entity, newPendingComment]);

  const session = useService(AuthService).session;
  const account = useLiveData(session.account$);

  if (!newPendingComment || !account) {
    return null;
  }

  return (
    <div className={styles.pendingComment}>
      {pendingPreview && (
        <div className={styles.previewContainer}>{pendingPreview}</div>
      )}
      <div className={styles.commentInputContainer}>
        <div className={styles.userContainer}>
          <Avatar url={account.avatar} size={24} />
        </div>
        <CommentEditor
          autoFocus
          doc={newPendingComment.doc}
          onCommit={handleCommit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

const useCommentEntity = (docId: string | undefined) => {
  const docCommentManager = useService(DocCommentManagerService);
  const commentPanelService = useService(CommentPanelService);
  const [entity, setEntity] = useState<DocCommentEntity | null>(null);

  useEffect(() => {
    if (!docId) {
      return;
    }

    const entityRef = docCommentManager.get(docId);
    setEntity(entityRef.obj);
    entityRef.obj.start();
    entityRef.obj.revalidate();

    // Set up pending comment watching to auto-open sidebar
    const unwatchPending = commentPanelService.watchForPendingComments(
      entityRef.obj
    );

    return () => {
      unwatchPending();
      entityRef.release();
    };
  }, [docCommentManager, commentPanelService, docId]);

  return entity;
};

export const CommentSidebar = () => {
  const doc = useServiceOptional(DocService)?.doc;
  const entity = useCommentEntity(doc?.id);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    // dismiss the highlight when ESC is pressed
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        entity?.highlightComment(null);
      }
    };
    const handleContainerClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-comment-id]')) {
        entity?.highlightComment(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    container?.addEventListener('click', handleContainerClick);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      container?.removeEventListener('click', handleContainerClick);
      entity?.highlightComment(null);
    };
  }, [entity]);

  if (!entity) {
    return null;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <CommentList entity={entity} />
    </div>
  );
};
