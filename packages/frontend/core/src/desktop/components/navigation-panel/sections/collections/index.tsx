import { IconButton, usePromptModal } from '@affine/component';
import { createEmptyCollection } from '@affine/core/components/page-list/use-collection-manager';
import { CollectionService } from '@affine/core/modules/collection';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { AddCollectionIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';

import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelCollectionNode } from '../../nodes/collection';
import { NavigationPanelTreeRoot } from '../../tree';
import { RootEmpty } from './empty';
import * as styles from './index.css';

export const NavigationPanelCollections = () => {
  const t = useI18n();
  const { collectionService, workbenchService, navigationPanelService } =
    useServices({
      CollectionService,
      WorkbenchService,
      NavigationPanelService,
    });
  const navigationPanelSection = navigationPanelService.sections.collections;
  const collections = useLiveData(collectionService.collections$);
  const { openPromptModal } = usePromptModal();

  const handleCreateCollection = useCallback(() => {
    openPromptModal({
      title: t['com.affine.editCollection.saveCollection'](),
      label: t['com.affine.editCollectionName.name'](),
      inputOptions: {
        placeholder: t['com.affine.editCollectionName.name.placeholder'](),
      },
      children: (
        <div className={styles.createTips}>
          {t['com.affine.editCollectionName.createTips']()}
        </div>
      ),
      confirmText: t['com.affine.editCollection.save'](),
      cancelText: t['com.affine.editCollection.button.cancel'](),
      confirmButtonOptions: {
        variant: 'primary',
      },
      onConfirm(name) {
        const id = nanoid();
        collectionService.addCollection(createEmptyCollection(id, { name }));
        track.$.navigationPanel.organize.createOrganizeItem({
          type: 'collection',
        });
        workbenchService.workbench.openCollection(id);
        navigationPanelSection.setCollapsed(false);
      },
    });
  }, [
    collectionService,
    navigationPanelSection,
    openPromptModal,
    t,
    workbenchService.workbench,
  ]);

  return (
    <CollapsibleSection
      name="collections"
      testId="navigation-panel-collections"
      title={t['com.affine.rootAppSidebar.collections']()}
      actions={
        <IconButton
          data-testid="navigation-panel-bar-add-collection-button"
          onClick={handleCreateCollection}
          size="16"
          tooltip={t[
            'com.affine.rootAppSidebar.explorer.collection-section-add-tooltip'
          ]()}
        >
          <AddCollectionIcon />
        </IconButton>
      }
    >
      <NavigationPanelTreeRoot
        placeholder={<RootEmpty onClickCreate={handleCreateCollection} />}
      >
        {collections.map(collection => (
          <NavigationPanelCollectionNode
            key={collection.id}
            collectionId={collection.id}
            reorderable={false}
            location={{
              at: 'navigation-panel:collection:list',
            }}
          />
        ))}
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};
