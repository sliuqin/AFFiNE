import { useBlockSuiteDocMeta } from '@affine/core/components/hooks/use-block-suite-page-meta';
import { VirtualizedTrashList } from '@affine/core/components/page-list';
import { Header } from '@affine/core/components/pure/header';
import { DocsService } from '@affine/core/modules/doc';
import { GlobalContextService } from '@affine/core/modules/global-context';
import { WorkspacePermissionService } from '@affine/core/modules/permissions';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { DeleteIcon } from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo } from 'react';

import {
  useIsActiveView,
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '../../../modules/workbench';
import { EmptyPageList } from './page-list-empty';
import * as styles from './trash-page.css';

const TrashHeader = () => {
  const t = useI18n();
  return (
    <Header
      left={
        <div className={styles.trashTitle}>
          <DeleteIcon className={styles.trashIcon} />
          {t['com.affine.workspaceSubPath.trash']()}
        </div>
      }
    />
  );
};

export const TrashPage = () => {
  const globalContextService = useService(GlobalContextService);
  const currentWorkspace = useService(WorkspaceService).workspace;
  const permissionService = useService(WorkspacePermissionService);
  const isAdmin = useLiveData(permissionService.permission.isAdmin$);
  const isOwner = useLiveData(permissionService.permission.isOwner$);
  const docCollection = currentWorkspace.docCollection;
  const docsService = useService(DocsService);
  const allTrashPageIds = useLiveData(
    LiveData.from(docsService.allTrashDocIds$(), [])
  );

  const pageMetas = useBlockSuiteDocMeta(docCollection);
  const filteredPageMetas = useMemo(() => {
    return pageMetas.filter(page => allTrashPageIds.includes(page.id));
  }, [pageMetas, allTrashPageIds]);

  const isActiveView = useIsActiveView();

  useEffect(() => {
    if (isActiveView) {
      globalContextService.globalContext.isTrash.set(true);

      return () => {
        globalContextService.globalContext.isTrash.set(false);
      };
    }
    return;
  }, [globalContextService.globalContext.isTrash, isActiveView]);

  const t = useI18n();
  return (
    <>
      <ViewTitle title={t['Trash']()} />
      <ViewIcon icon={'trash'} />
      <ViewHeader>
        <TrashHeader />
      </ViewHeader>
      <ViewBody>
        <div className={styles.body}>
          {filteredPageMetas.length > 0 ? (
            <VirtualizedTrashList
              disableMultiDelete={!isAdmin && !isOwner}
              disableMultiRestore={!isAdmin && !isOwner}
            />
          ) : (
            <EmptyPageList type="trash" />
          )}
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => {
  return <TrashPage />;
};
