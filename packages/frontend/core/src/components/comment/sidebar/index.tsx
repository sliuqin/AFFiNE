import { Button, IconButton, Menu } from '@affine/component';
import { type DocCommentEntity } from '@affine/core/modules/comment/entities/doc-comment';
import { DocCommentManagerService } from '@affine/core/modules/comment/services/doc-comment-manager';
import { SnapshotHelper } from '@affine/core/modules/comment/services/snapshot-helper';
import type {
  DocComment,
  DocCommentReply,
} from '@affine/core/modules/comment/types';
import { DocService } from '@affine/core/modules/doc';
import type { DocSnapshot } from '@blocksuite/affine/store';
import { FilterIcon } from '@blocksuite/icons/rc';
import {
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
        preview
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
  const snapshotHelper = useService(SnapshotHelper);
  const [replySnapshot, setReplySnapshot] = useState<DocSnapshot | null>(null);

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
      setReplySnapshot(null);
      return;
    }
    setIsReplying(true);

    await entity.addReply(comment.id);
    const pendingComments = entity.pendingComments$.value;
    const newPendingReply = Array.from(pendingComments.entries()).find(
      ([_, pc]) => pc.commentId === comment.id // This is a reply to this comment
    );
    if (newPendingReply) {
      setPendingReplyId(newPendingReply[0]);
      const snapshot = snapshotHelper.getSnapshot(newPendingReply[1].doc);
      if (snapshot) {
        setReplySnapshot(snapshot);
      }
    }
  }, [isReplying, entity, comment.id, snapshotHelper, pendingReplyId]);

  const handleCommitReply = useAsyncCallback(async () => {
    if (!pendingReplyId) return;

    await entity.commitComment(pendingReplyId);
    setIsReplying(false);
    setReplySnapshot(null);
    setPendingReplyId(null);
  }, [entity, pendingReplyId]);

  const handleCancelReply = useCallback(() => {
    if (!pendingReplyId) return;

    entity.dismissDraftComment(pendingReplyId);
    setIsReplying(false);
    setReplySnapshot(null);
    setPendingReplyId(null);
  }, [entity, pendingReplyId]);

  const handleReplyChange = useCallback((snapshot: DocSnapshot) => {
    setReplySnapshot(snapshot);
  }, []);

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
      <div>
        {'removed' in comment.user ? 'Removed User' : comment.user.name}
      </div>
      <CommentEditor
        preview
        defaultSnapshot={comment.content.snapshot}
        onChange={() => {}}
      />
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

      {isReplying && replySnapshot && (
        <div>
          <CommentEditor
            defaultSnapshot={replySnapshot}
            onChange={handleReplyChange}
          />
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
  const [pendingSnapshot, setPendingSnapshot] = useState<DocSnapshot | null>(
    null
  );
  const snapshotHelper = useService(SnapshotHelper);

  const handleStartComment = useAsyncCallback(async () => {
    if (pendingCommentId) return; // Already has a pending comment

    await entity.addComment();
    const newPendingComments = entity.pendingComments$.value;
    const newPendingComment = Array.from(newPendingComments.values()).find(
      comment => !comment.commentId // Not a reply
    );
    if (newPendingComment) {
      setPendingCommentId(newPendingComment.id);
      // Get initial snapshot from the store
      const snapshot = snapshotHelper.getSnapshot(newPendingComment.doc);
      if (snapshot) {
        setPendingSnapshot(snapshot);
      }
    }
  }, [entity, pendingCommentId, snapshotHelper]);

  const handleCommit = useAsyncCallback(async () => {
    if (!pendingCommentId) return;

    await entity.commitComment(pendingCommentId);
    setPendingCommentId(null);
    setPendingSnapshot(null);
  }, [entity, pendingCommentId]);

  const handleCancel = useCallback(() => {
    if (!pendingCommentId) return;

    entity.dismissDraftComment(pendingCommentId);
    setPendingCommentId(null);
    setPendingSnapshot(null);
  }, [entity, pendingCommentId]);

  const handleEditorChange = useCallback((snapshot: DocSnapshot) => {
    setPendingSnapshot(snapshot);
  }, []);

  if (!pendingCommentId || !pendingSnapshot) {
    return (
      <div>
        <Button onClick={handleStartComment}>Add Comment</Button>
      </div>
    );
  }

  return (
    <div>
      <CommentEditor
        defaultSnapshot={pendingSnapshot}
        onChange={handleEditorChange}
      />
      <div>
        <Button onClick={handleCommit}>Submit</Button>
        <Button onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  );
};

const useCommentEntity = (docId: string | undefined) => {
  const docCommentManager = useService(DocCommentManagerService);
  const [entity, setEntity] = useState<DocCommentEntity | null>(null);
  useEffect(() => {
    if (!docId) {
      return;
    }

    const entityRef = docCommentManager.get(docId);
    setEntity(entityRef.obj);
    entityRef.obj.start();
    entityRef.obj.revalidate();
    return () => {
      entityRef.release();
    };
  }, [docCommentManager, docId]);
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
