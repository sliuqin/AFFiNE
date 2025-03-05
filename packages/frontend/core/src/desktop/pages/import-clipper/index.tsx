import { Button } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import { useWorkspaceName } from '@affine/core/components/hooks/use-workspace-info';
import { WorkspaceSelector } from '@affine/core/components/workspace-selector';
import { AuthService } from '@affine/core/modules/cloud';
import {
  type ClipperInput,
  ImportClipperService,
} from '@affine/core/modules/import-clipper';
import {
  type WorkspaceMetadata,
  WorkspacesService,
} from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { AllDocsIcon } from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { cssVar } from '@toeverything/theme';
import { useCallback, useEffect, useState } from 'react';

import * as styles from './style.css';

const clipperInput$ = new LiveData<ClipperInput | null>(null);

window.addEventListener('message', event => {
  if (
    typeof event.data === 'object' &&
    event.data.type === 'affine-clipper:import'
  ) {
    clipperInput$.value = event.data.payload;
  }
});

export const Component = () => {
  const importClipperService = useService(ImportClipperService);
  const t = useI18n();
  const session = useService(AuthService).session;
  const notLogin = useLiveData(session.status$) === 'unauthenticated';
  const isSessionRevalidating = useLiveData(session.isRevalidating$);

  const [importing, setImporting] = useState(false);
  const [importingError, setImportingError] = useState<any>(null);
  const clipperInput = useLiveData(clipperInput$);
  const [clipperInputSnapshot, setClipperInputSnapshot] =
    useState<ClipperInput | null>(null);
  const isMissingInput = !clipperInputSnapshot;
  const workspacesService = useService(WorkspacesService);
  const workspaces = useLiveData(workspacesService.list.workspaces$);
  const [rawSelectedWorkspace, setSelectedWorkspace] =
    useState<WorkspaceMetadata | null>(null);
  const selectedWorkspace =
    rawSelectedWorkspace ??
    workspaces.find(w => w.flavour !== 'local') ??
    workspaces.at(0);
  const selectedWorkspaceName = useWorkspaceName(selectedWorkspace);
  const { jumpToSignIn } = useNavigateHelper();

  const noWorkspace = workspaces.length === 0;

  useEffect(() => {
    workspacesService.list.revalidate();
  }, [workspacesService]);

  useEffect(() => {
    session.revalidate();
  }, [session]);

  useEffect(() => {
    if (!isSessionRevalidating && notLogin) {
      jumpToSignIn('/clipper/import');
    }
  }, [isSessionRevalidating, jumpToSignIn, notLogin]);

  useEffect(() => {
    if (!clipperInputSnapshot) {
      setClipperInputSnapshot(clipperInput);
    }
  }, [clipperInput, clipperInputSnapshot]);

  const handleSelectedWorkspace = useCallback(
    (workspaceMetadata: WorkspaceMetadata) => {
      return setSelectedWorkspace(workspaceMetadata);
    },
    []
  );

  const handleCreatedWorkspace = useCallback(
    (payload: { metadata: WorkspaceMetadata; defaultDocId?: string }) => {
      return setSelectedWorkspace(payload.metadata);
    },
    []
  );

  const handleImportToSelectedWorkspace = useAsyncCallback(async () => {
    if (clipperInputSnapshot && selectedWorkspace) {
      setImporting(true);
      try {
        await importClipperService.importToWorkspace(
          selectedWorkspace,
          clipperInputSnapshot
        );
        window.close();
      } catch (err) {
        setImportingError(err);
      } finally {
        setImporting(false);
      }
    }
  }, [clipperInputSnapshot, importClipperService, selectedWorkspace]);

  const handleImportToNewWorkspace = useAsyncCallback(async () => {
    if (!clipperInputSnapshot) {
      return;
    }
    setImporting(true);
    try {
      await importClipperService.importToNewWorkspace(
        'affine-cloud',
        'Workspace',
        clipperInputSnapshot
      );
      window.close();
    } catch (err) {
      setImportingError(err);
    } finally {
      setImporting(false);
    }
  }, [clipperInputSnapshot, importClipperService]);

  const disabled = isMissingInput || importing || notLogin;

  return (
    <div className={styles.container}>
      <AllDocsIcon className={styles.mainIcon} />
      <h6 className={styles.mainTitle}>
        {t['com.affine.import-clipper.dialog.createDocFromClipper']()}
      </h6>
      {noWorkspace ? (
        <p className={styles.desc}>A new workspace will be created.</p>
      ) : (
        <>
          <p className={styles.desc}>Choose a workspace.</p>
          <WorkspaceSelector
            workspaceMetadata={selectedWorkspace}
            onSelectWorkspace={handleSelectedWorkspace}
            onCreatedWorkspace={handleCreatedWorkspace}
            className={styles.workspaceSelector}
            showArrowDownIcon
            disable={disabled}
            menuContentOptions={{
              side: 'top',
              style: {
                maxHeight: 'min(600px, calc(50vh + 50px))',
                width: 352,
                maxWidth: 'calc(100vw - 20px)',
              },
            }}
          />
        </>
      )}
      <div className={styles.buttonContainer}>
        {importingError && (
          <span style={{ color: cssVar('warningColor') }}>
            {t['com.affine.import-clipper.dialog.errorImport']()}
          </span>
        )}
        {isMissingInput ? (
          <span style={{ color: cssVar('warningColor') }}>
            {t['com.affine.import-clipper.dialog.errorLoad']()}
          </span>
        ) : selectedWorkspace ? (
          <Button
            className={styles.mainButton}
            variant={disabled ? 'secondary' : 'primary'}
            loading={disabled}
            disabled={disabled}
            onClick={handleImportToSelectedWorkspace}
            data-testid="import-clipper-to-workspace-btn"
          >
            {selectedWorkspaceName &&
              t['com.affine.import-clipper.dialog.createDocToWorkspace']({
                workspace: selectedWorkspaceName,
              })}
          </Button>
        ) : (
          <Button
            className={styles.mainButton}
            variant="primary"
            loading={disabled}
            disabled={disabled}
            onClick={handleImportToNewWorkspace}
          >
            {t['com.affine.import-clipper.dialog.createDocToNewWorkspace']()}
          </Button>
        )}
      </div>
    </div>
  );
};
