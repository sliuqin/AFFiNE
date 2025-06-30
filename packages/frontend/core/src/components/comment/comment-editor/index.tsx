import { useConfirmModal, useLitPortalFactory } from '@affine/component';
import { LitDocEditor, PageEditor } from '@affine/core/blocksuite/editors';
import { getViewManager } from '@affine/core/blocksuite/manager/view';
import { SnapshotHelper } from '@affine/core/modules/comment/services/snapshot-helper';
import { ViewportElementExtension } from '@blocksuite/affine/shared/services';
import { type DocSnapshot, Store } from '@blocksuite/affine/store';
import { useFramework, useService } from '@toeverything/infra';
import clsx from 'clsx';
import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as styles from './style.css';

const usePatchSpecs = (readonly: boolean) => {
  const [reactToLit, portals] = useLitPortalFactory();
  const framework = useFramework();
  const confirmModal = useConfirmModal();

  const patchedSpecs = useMemo(() => {
    const manager = getViewManager()
      .config.init()
      .foundation(framework)
      .theme(framework)
      .editorConfig(framework)
      .editorView({
        framework,
        reactToLit,
        confirmModal,
      })
      .linkedDoc(framework)
      .paragraph(false)
      .codeBlockHtmlPreview(framework).value;
    return manager
      .get(readonly ? 'preview-page' : 'page')
      .concat([ViewportElementExtension('.comment-editor-viewport')]);
  }, [confirmModal, framework, reactToLit, readonly]);

  return [
    patchedSpecs,
    useMemo(
      () => (
        <>
          {portals.map(p => (
            <Fragment key={p.id}>{p.portal}</Fragment>
          ))}
        </>
      ),
      [portals]
    ),
  ] as const;
};

interface CommentEditorProps {
  readonly?: boolean;
  doc?: Store;
  defaultSnapshot?: DocSnapshot;
  // for performance, we only update the snapshot when the editor blurs
  onChange?: (snapshot: DocSnapshot) => void;
  autoFocus?: boolean;
}

export interface CommentEditorRef {
  getSnapshot: () => DocSnapshot | null | undefined;
}

// todo: get rid of circular data changes
const useSnapshotDoc = (defaultSnapshotOrDoc: DocSnapshot | Store) => {
  const snapshotHelper = useService(SnapshotHelper);
  const [doc, setDoc] = useState<Store | undefined>(
    defaultSnapshotOrDoc instanceof Store ? defaultSnapshotOrDoc : undefined
  );

  useEffect(() => {
    if (defaultSnapshotOrDoc instanceof Store) {
      return;
    }

    snapshotHelper
      .createStore(defaultSnapshotOrDoc)
      .then(d => {
        setDoc(d);
      })
      .catch(e => {
        console.error(e);
      });
  }, [defaultSnapshotOrDoc, snapshotHelper]);

  return doc;
};

export const CommentEditor = forwardRef<CommentEditorRef, CommentEditorProps>(
  function CommentEditor(
    { readonly, defaultSnapshot, doc: userDoc, onChange, autoFocus },
    ref
  ) {
    const defaultSnapshotOrDoc = defaultSnapshot ?? userDoc;
    if (!defaultSnapshotOrDoc) {
      throw new Error('Either defaultSnapshot or doc must be provided');
    }
    const [specs, portals] = usePatchSpecs(!!readonly);
    const doc = useSnapshotDoc(defaultSnapshotOrDoc);
    const snapshotHelper = useService(SnapshotHelper);
    const editorRef = useRef<PageEditor>(null);

    useImperativeHandle(
      ref,
      () => ({
        getSnapshot: () => {
          if (!doc) {
            return null;
          }
          return snapshotHelper.getSnapshot(doc);
        },
      }),
      [doc, snapshotHelper]
    );

    const handleCommitChange = useCallback(() => {
      if (!doc) {
        return;
      }
      const snapshot = snapshotHelper.getSnapshot(doc);
      if (snapshot) {
        onChange?.(snapshot);
      }
    }, [doc, onChange, snapshotHelper]);

    useEffect(() => {
      if (autoFocus && editorRef.current && doc) {
        // Focus the editor after a brief delay to ensure it's fully rendered
        const timeoutId = setTimeout(() => {
          editorRef.current?.focus();
        }, 100);

        return () => clearTimeout(timeoutId);
      }
      return;
    }, [autoFocus, doc]);

    return (
      <div className={clsx(styles.container, 'comment-editor-viewport')}>
        {doc && (
          <LitDocEditor
            ref={editorRef}
            specs={specs}
            doc={doc}
            onBlur={handleCommitChange}
          />
        )}
        {portals}
      </div>
    );
  }
);
