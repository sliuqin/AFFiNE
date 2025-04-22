import { usePageHelper } from '@affine/core/blocksuite/block-suite-page-list/utils';
import { NavigationPanelTreeRoot } from '@affine/core/desktop/components/navigation-panel';
import type { FavoriteSupportTypeUnion } from '@affine/core/modules/favorite';
import { FavoriteService } from '@affine/core/modules/favorite';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { useLiveData, useServices } from '@toeverything/infra';
import { useCallback } from 'react';

import { AddItemPlaceholder } from '../../layouts/add-item-placeholder';
import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelCollectionNode } from '../../nodes/collection';
import { NavigationPanelDocNode } from '../../nodes/doc';
import { NavigationPanelFolderNode } from '../../nodes/folder';
import { NavigationPanelTagNode } from '../../nodes/tag';

export const NavigationPanelFavorites = () => {
  const { favoriteService, workspaceService, navigationPanelService } =
    useServices({
      FavoriteService,
      WorkspaceService,
      NavigationPanelService,
    });

  const t = useI18n();
  const navigationPanelSection = navigationPanelService.sections.favorites;
  const favorites = useLiveData(favoriteService.favoriteList.sortedList$);
  const isLoading = useLiveData(favoriteService.favoriteList.isLoading$);
  const { createPage } = usePageHelper(
    workspaceService.workspace.docCollection
  );

  const handleCreateNewFavoriteDoc = useCallback(() => {
    const newDoc = createPage();
    favoriteService.favoriteList.add(
      'doc',
      newDoc.id,
      favoriteService.favoriteList.indexAt('before')
    );
    navigationPanelSection.setCollapsed(false);
  }, [createPage, navigationPanelSection, favoriteService.favoriteList]);

  return (
    <CollapsibleSection
      name="favorites"
      title={t['com.affine.rootAppSidebar.favorites']()}
      testId="navigation-panel-favorites"
      headerTestId="navigation-panel-favorite-category-divider"
    >
      <NavigationPanelTreeRoot placeholder={isLoading ? 'Loading' : null}>
        {favorites.map(favorite => (
          <FavoriteNode key={favorite.id} favorite={favorite} />
        ))}
        <AddItemPlaceholder
          data-testid="navigation-panel-bar-add-favorite-button"
          data-event-props="$.navigationPanel.favorites.createDoc"
          data-event-args-control="addFavorite"
          onClick={handleCreateNewFavoriteDoc}
          label={t['New Page']()}
        />
      </NavigationPanelTreeRoot>
    </CollapsibleSection>
  );
};

export const FavoriteNode = ({
  favorite,
}: {
  favorite: {
    id: string;
    type: FavoriteSupportTypeUnion;
  };
}) => {
  return favorite.type === 'doc' ? (
    <NavigationPanelDocNode docId={favorite.id} />
  ) : favorite.type === 'tag' ? (
    <NavigationPanelTagNode tagId={favorite.id} />
  ) : favorite.type === 'folder' ? (
    <NavigationPanelFolderNode nodeId={favorite.id} />
  ) : (
    <NavigationPanelCollectionNode collectionId={favorite.id} />
  );
};
