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
      setIsReplying(false);
      return;
    }
    setIsReplying(true);
    const snapshot = await snapshotHelper.createEmptySnapshot();
    if (snapshot) {
      setReplySnapshot(snapshot);
    }
  }, [isReplying, snapshotHelper]);

  const handleCreateReply = useAsyncCallback(
    async (snapshot: DocSnapshot) => {
      // HACK: use private store, should be fixed later by exposing a public method
      // @ts-expect-error - store is private
      await entity.store.createReply(comment.id, {
        content: {
          snapshot,
          preview: 'New reply', // TODO: generate preview
        },
      });
      entity.revalidate();
      setIsReplying(false);
      setReplySnapshot(null);
    },
    [entity, comment.id]
  );

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
        <CommentEditor
          defaultSnapshot={replySnapshot}
          onChange={handleCreateReply}
        />
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
  const [initialSnapshot, setInitialSnapshot] = useState<DocSnapshot | null>(
    null
  );
  const [currentSnapshot, setCurrentSnapshot] = useState<DocSnapshot | null>(
    null
  );
  const snapshotHelper = useService(SnapshotHelper);

  const resetEditor = useCallback(() => {
    snapshotHelper
      .createEmptySnapshot()
      .then(s => {
        if (s) {
          setInitialSnapshot(s);
          setCurrentSnapshot(s);
        }
      })
      .catch(err => {
        console.error(err);
      });
  }, [snapshotHelper]);

  useEffect(() => {
    resetEditor();
  }, [resetEditor]);

  const handleCommit = useAsyncCallback(async () => {
    if (!currentSnapshot) {
      return;
    }
    // HACK: use private store, should be fixed later
    // @ts-expect-error - store is private
    await entity.store.createComment({
      content: {
        snapshot: currentSnapshot,
        preview: 'New comment', // todo: get preview from selections
      },
    });
    entity.revalidate();
    resetEditor();
  }, [entity, currentSnapshot, resetEditor]);

  if (!initialSnapshot) {
    return null;
  }

  return (
    <div>
      <CommentEditor
        defaultSnapshot={initialSnapshot}
        onChange={setCurrentSnapshot}
      />
      <Button onClick={handleCommit}>Submit</Button>
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
