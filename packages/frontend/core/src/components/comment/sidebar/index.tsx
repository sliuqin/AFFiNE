import { Avatar, Button, IconButton, Menu } from '@affine/component';
import { type DocCommentEntity } from '@affine/core/modules/comment/entities/doc-comment';
import { CommentPanelService } from '@affine/core/modules/comment/services/comment-panel-service';
import { DocCommentManagerService } from '@affine/core/modules/comment/services/doc-comment-manager';
import type {
  DocComment,
  DocCommentReply,
} from '@affine/core/modules/comment/types';
import { DocService } from '@affine/core/modules/doc';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { i18nTime, useI18n } from '@affine/i18n';
import type { DocSnapshot } from '@blocksuite/affine/store';
import { FilterIcon } from '@blocksuite/icons/rc';
import {
  LiveData,
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

const ReplyItem = ({
  reply,
  entity,
}: {
  reply: DocCommentReply;
  entity: DocCommentEntity;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = useAsyncCallback(async () => {
    await entity.deleteReply(reply.id);
  }, [entity, reply.id]);

  const handleUpdate = useAsyncCallback(
    async (snapshot: DocSnapshot) => {
      await entity.updateReply(reply.id, {
        snapshot,
        preview: 'Updated reply', // TODO: generate preview
      });
      setIsEditing(false);
    },
    [entity, reply.id]
  );

  if (isEditing) {
    return (
      <CommentEditor
        defaultSnapshot={reply.content.snapshot}
        onChange={handleUpdate}
      />
    );
  }

  return (
    <div className={styles.replyItem}>
      <div>{'removed' in reply.user ? 'Removed User' : reply.user.name}</div>
      <CommentEditor
        readonly
        defaultSnapshot={reply.content.snapshot}
        onChange={() => {}}
      />
      <Button onClick={() => setIsEditing(true)}>Edit</Button>
      <Button onClick={handleDelete}>Delete</Button>
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
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [pendingReplyId, setPendingReplyId] = useState<string | null>(null);
  const workbench = useService(WorkbenchService);
  const highlighting = useLiveData(entity.commentHighlighted$) === comment.id;

  const pendingReply = useLiveData(
    LiveData.computed(get => {
      const pendingComments = get(entity.pendingComments$);
      return pendingReplyId ? pendingComments.get(pendingReplyId) : null;
    })
  );

  const commentRef = useRef<HTMLDivElement>(null);

  const handleDelete = useAsyncCallback(async () => {
    await entity.deleteComment(comment.id);
  }, [entity, comment.id]);

  const handleUpdate = useAsyncCallback(
    async (snapshot: DocSnapshot) => {
      await entity.updateComment(comment.id, {
        snapshot,
        preview: 'Updated comment', // TODO: generate preview
      });
      setIsEditing(false);
    },
    [entity, comment.id]
  );

  const handleStartReply = useAsyncCallback(async () => {
    if (isReplying) {
      // Cancel existing reply
      if (pendingReplyId) {
        entity.dismissDraftComment(pendingReplyId);
        setPendingReplyId(null);
      }
      setIsReplying(false);
      return;
    }
    setIsReplying(true);

    const replyId = await entity.addReply(comment.id);
    setPendingReplyId(replyId);
  }, [isReplying, entity, comment.id, pendingReplyId]);

  const handleCommitReply = useAsyncCallback(async () => {
    if (!pendingReplyId) return;

    await entity.commitReply(pendingReplyId);
    setIsReplying(false);
    setPendingReplyId(null);
  }, [entity, pendingReplyId]);

  const handleCancelReply = useCallback(() => {
    if (!pendingReplyId) return;

    entity.dismissDraftComment(pendingReplyId);
    setIsReplying(false);
    setPendingReplyId(null);
  }, [entity, pendingReplyId]);

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
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [comment.id, entity.commentHighlighted$]);

  if (isEditing) {
    return (
      <CommentEditor
        defaultSnapshot={comment.content.snapshot}
        onChange={handleUpdate}
      />
    );
  }

  return (
    <div
      onClick={handleClickPreview}
      data-comment-id={comment.id}
      data-highlighting={highlighting}
      className={styles.commentItem}
      ref={commentRef}
    >
      <div className={styles.previewContainer}>{comment.content.preview}</div>
      <div className={styles.commentEditorContainer}>
        <div className={styles.userContainer}>
          <Avatar url={comment.user.avatarUrl} size={24} />
          <div className={styles.userName}>{comment.user.name}</div>
          <div className={styles.time}>
            {i18nTime(comment.createdAt, {
              absolute: { accuracy: 'minute' },
            })}
          </div>
        </div>
        <div style={{ margin: '-10px 0 -10px 34px' }}>
          <CommentEditor readonly defaultSnapshot={comment.content.snapshot} />
        </div>
      </div>

      <div className={styles.repliesContainer}>
        {comment.replies
          ?.toSorted((a, b) => a.createdAt - b.createdAt)
          .map(reply => (
            <ReplyItem key={reply.id} reply={reply} entity={entity} />
          ))}
      </div>

      {highlighting && (
        <div>
          <Button onClick={() => setIsEditing(true)}>Edit</Button>
          <Button onClick={handleDelete}>Delete</Button>
          <Button onClick={handleStartReply}>Reply</Button>
        </div>
      )}

      {isReplying && pendingReply && (
        <div>
          <CommentEditor autoFocus doc={pendingReply.doc} />
          <div>
            <Button onClick={handleCommitReply}>Submit Reply</Button>
            <Button onClick={handleCancelReply}>Cancel</Button>
          </div>
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

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {t['com.affine.comment.comments']()}
        </div>
        {sortedComments.length > 0 && <SortFilterButton />}
      </div>
      {sortedComments.length === 0 && !newPendingComment && (
        <div className={styles.empty}>
          {t['com.affine.comment.no-comments']()}
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

const CommentInput = ({ entity }: { entity: DocCommentEntity }) => {
  const newPendingComment = useLiveData(entity.pendingComment$);
  const pendingPreview = newPendingComment?.preview;

  const handleCommit = useAsyncCallback(async () => {
    if (!newPendingComment?.id) return;
    await entity.commitComment(newPendingComment.id);
  }, [entity, newPendingComment]);

  const handleCancel = useCallback(() => {
    if (!newPendingComment?.id) return;

    entity.dismissDraftComment(newPendingComment.id);
  }, [entity, newPendingComment]);

  if (!newPendingComment) {
    return null;
  }

  return (
    <div className={styles.pendingComment}>
      {pendingPreview && (
        <div className={styles.previewContainer}>{pendingPreview}</div>
      )}
      <CommentEditor autoFocus doc={newPendingComment.doc} />
      <div>
        <Button onClick={handleCommit}>Submit</Button>
        <Button onClick={handleCancel}>Cancel</Button>
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
      <CommentInput entity={entity} />
    </div>
  );
};
