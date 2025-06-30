import { Button, IconButton, Menu } from '@affine/component';
import { type DocCommentEntity } from '@affine/core/modules/comment/entities/doc-comment';
import { CommentPanelService } from '@affine/core/modules/comment/services/comment-panel-service';
import { DocCommentManagerService } from '@affine/core/modules/comment/services/doc-comment-manager';
import { SnapshotHelper } from '@affine/core/modules/comment/services/snapshot-helper';
import type {
  DocComment,
  DocCommentReply,
} from '@affine/core/modules/comment/types';
import { DocService } from '@affine/core/modules/doc';
import { WorkbenchService } from '@affine/core/modules/workbench';
import type { DocSnapshot } from '@blocksuite/affine/store';
import { FilterIcon } from '@blocksuite/icons/rc';
import {
  LiveData,
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

const Header = () => {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitle}>Comments</div>
      <SortFilterButton />
    </div>
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

  const pendingReply = useLiveData(
    LiveData.computed(get => {
      const pendingComments = get(entity.pendingComments$);
      return pendingReplyId ? pendingComments.get(pendingReplyId) : null;
    })
  );

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

  const handleMouseEnter = useCallback(() => {
    entity.highlightComment(comment.id);
  }, [entity, comment.id]);

  const handleMouseLeave = useCallback(() => {
    entity.highlightComment(null);
  }, [entity]);

  const handleClickPreview = useCallback(() => {
    // todo: support handling focus the comment id
    workbench.workbench.openDoc(
      {
        docId: entity.props.docId,
      },
      {
        show: true,
      }
    );
  }, [entity.props.docId, workbench.workbench]);

  if (isEditing) {
    return (
      <CommentEditor
        defaultSnapshot={comment.content.snapshot}
        onChange={handleUpdate}
      />
    );
  }

  return (
    <div className={styles.commentItem}>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClickPreview}
      >
        {'removed' in comment.user ? 'Removed User' : comment.user.name}
        <pre>{comment.content.preview}</pre>
      </div>
      <CommentEditor readonly defaultSnapshot={comment.content.snapshot} />
      <Button onClick={() => setIsEditing(true)}>Edit</Button>
      <Button onClick={handleDelete}>Delete</Button>
      <Button onClick={handleStartReply}>Reply</Button>

      <div className={styles.repliesContainer}>
        {comment.replies
          ?.toSorted((a, b) => a.createdAt - b.createdAt)
          .map(reply => (
            <ReplyItem key={reply.id} reply={reply} entity={entity} />
          ))}
      </div>

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

  // Sort comments by created date (newest first)
  const sortedComments = useMemo(() => {
    return comments.toSorted((a, b) => b.createdAt - a.createdAt);
  }, [comments]);

  return (
    <div>
      {sortedComments.map(comment => (
        <CommentItem key={comment.id} comment={comment} entity={entity} />
      ))}
    </div>
  );
};

const CommentInput = ({ entity }: { entity: DocCommentEntity }) => {
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);
  const snapshotHelper = useService(SnapshotHelper);
  const pendingComments = useLiveData(entity.pendingComments$);

  const newPendingComment = useMemo(() => {
    return Array.from(pendingComments.values()).find(
      comment => comment.id === pendingCommentId
    );
  }, [pendingComments, pendingCommentId]);

  const pendingPreview = newPendingComment?.preview;

  // Watch for new pending comments (not replies) and automatically show them
  useEffect(() => {
    const newPendingComment = Array.from(pendingComments.values()).find(
      comment => !comment.commentId && !pendingCommentId // Not a reply and not already showing one
    );

    if (newPendingComment && !pendingCommentId) {
      setPendingCommentId(newPendingComment.id);
    }
  }, [pendingComments, pendingCommentId, snapshotHelper]);

  const handleCommit = useAsyncCallback(async () => {
    if (!pendingCommentId) return;
    await entity.commitComment(pendingCommentId);
    setPendingCommentId(null);
  }, [entity, pendingCommentId]);

  const handleCancel = useCallback(() => {
    if (!pendingCommentId) return;

    entity.dismissDraftComment(pendingCommentId);
    setPendingCommentId(null);
  }, [entity, pendingCommentId]);

  if (!newPendingComment) {
    return <div>Start commenting by selecting text & comment</div>;
  }

  return (
    <div>
      {pendingPreview && (
        <div className={styles.pendingPreview}>
          <strong>Commenting on:</strong> {pendingPreview}
        </div>
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

  if (!entity) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Header />
      <CommentList entity={entity} />
      <CommentInput entity={entity} />
    </div>
  );
};
