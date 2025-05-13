import { IconButton, Menu, toast } from '@affine/component';
import { useBlockSuiteDocMeta } from '@affine/core/components/hooks/use-block-suite-page-meta';
import {
  CollectionRulesService,
  type FilterParams,
} from '@affine/core/modules/collection-rules';
import { CompatibleFavoriteItemsAdapter } from '@affine/core/modules/favorite';
import { ShareDocsListService } from '@affine/core/modules/share-doc';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { Trans, useI18n } from '@affine/i18n';
import type { DocMeta } from '@blocksuite/affine/store';
import { FilterIcon } from '@blocksuite/icons/rc';
import { useLiveData, useServices } from '@toeverything/infra';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Filters } from '../../filter';
import { AddFilterMenu } from '../../filter/add-filter';
import { AffineShapeIcon, FavoriteTag } from '..';
import { usePageHeaderColsDef } from '../header-col-def';
import { PageListItemRenderer } from '../page-group';
import { ListTableHeader } from '../page-header';
import { SelectorLayout } from '../selector/selector-layout';
import type { ListItem } from '../types';
import { VirtualizedList } from '../virtualized-list';
import * as styles from './select-page.css';
import { useSearch } from './use-search';

export const SelectPage = ({
  init = [],
  onConfirm,
  onCancel,
  onChange: propsOnChange,
  header,
  buttons,
}: {
  onChange?: (values: string[]) => void;
  confirmText?: ReactNode;
  header?: ReactNode;
  buttons?: ReactNode;
  init?: string[];
  onConfirm?: (data: string[]) => void;
  onCancel?: () => void;
}) => {
  const t = useI18n();
  const [value, setValue] = useState(init);
  const onChange = useCallback(
    (value: string[]) => {
      propsOnChange?.(value);
      setValue(value);
    },
    [propsOnChange]
  );
  const confirm = useCallback(() => {
    onConfirm?.(value);
  }, [value, onConfirm]);
  const clearSelected = useCallback(() => {
    onChange([]);
  }, [onChange]);
  const {
    workspaceService,
    compatibleFavoriteItemsAdapter,
    shareDocsListService,
    collectionRulesService,
  } = useServices({
    ShareDocsListService,
    WorkspaceService,
    CompatibleFavoriteItemsAdapter,
    CollectionRulesService,
  });
  const workspace = workspaceService.workspace;
  const docCollection = workspace.docCollection;
  const pageMetas = useBlockSuiteDocMeta(docCollection);
  const favourites = useLiveData(compatibleFavoriteItemsAdapter.favorites$);

  useEffect(() => {
    shareDocsListService.shareDocs?.revalidate();
  }, [shareDocsListService.shareDocs]);

  const isFavorite = useCallback(
    (meta: DocMeta) => favourites.some(fav => fav.id === meta.id),
    [favourites]
  );

  const onToggleFavoritePage = useCallback(
    (page: DocMeta) => {
      const status = isFavorite(page);
      compatibleFavoriteItemsAdapter.toggle(page.id, 'doc');
      toast(
        status
          ? t['com.affine.toastMessage.removedFavorites']()
          : t['com.affine.toastMessage.addedFavorites']()
      );
    },
    [compatibleFavoriteItemsAdapter, isFavorite, t]
  );

  const pageHeaderColsDef = usePageHeaderColsDef();
  const [filters, setFilters] = useState<FilterParams[]>([]);

  const [filteredDocIds, setFilteredDocIds] = useState<string[]>([]);
  const filteredPageMetas = useMemo(() => {
    const idSet = new Set(filteredDocIds);
    return pageMetas.filter(page => idSet.has(page.id));
  }, [pageMetas, filteredDocIds]);

  const { searchText, updateSearchText, searchedList } =
    useSearch(filteredPageMetas);

  useEffect(() => {
    const subscription = collectionRulesService
      .watch([
        ...filters,
        {
          type: 'system',
          key: 'empty-journal',
          method: 'is',
          value: 'false',
        },
        {
          type: 'system',
          key: 'trash',
          method: 'is',
          value: 'false',
        },
      ])
      .subscribe(result => {
        setFilteredDocIds(result.groups.flatMap(group => group.items));
      });
    return () => {
      subscription.unsubscribe();
    };
  }, [collectionRulesService, filters]);

  const operationsRenderer = useCallback(
    (item: ListItem) => {
      const page = item as DocMeta;
      return (
        <FavoriteTag
          style={{ marginRight: 8 }}
          onClick={() => onToggleFavoritePage(page)}
          active={isFavorite(page)}
        />
      );
    },
    [isFavorite, onToggleFavoritePage]
  );

  const pageHeaderRenderer = useCallback(() => {
    return <ListTableHeader headerCols={pageHeaderColsDef} />;
  }, [pageHeaderColsDef]);

  const pageItemRenderer = useCallback((item: ListItem) => {
    return <PageListItemRenderer {...item} />;
  }, []);

  return (
    <SelectorLayout
      searchPlaceholder={t['com.affine.editCollection.search.placeholder']()}
      selectedCount={value.length}
      onSearch={updateSearchText}
      onClear={clearSelected}
      onCancel={onCancel}
      onConfirm={confirm}
      actions={buttons}
    >
      <div className={styles.pagesTab}>
        <div className={styles.pagesTabContent}>
          {header ?? (
            <div style={{ fontSize: 12, lineHeight: '20px', fontWeight: 600 }}>
              {t['com.affine.selectPage.title']()}
            </div>
          )}
          {filters.length === 0 ? (
            <Menu
              items={
                <AddFilterMenu
                  onAdd={params => setFilters([...filters, params])}
                />
              }
            >
              <IconButton icon={<FilterIcon />} />
            </Menu>
          ) : null}
        </div>
        {filters.length !== 0 ? (
          <div style={{ padding: '12px 16px 16px' }}>
            <Filters filters={filters} onChange={setFilters} />
          </div>
        ) : null}
        {searchedList.length ? (
          <VirtualizedList
            className={styles.pageList}
            items={searchedList}
            docCollection={docCollection}
            selectable
            onSelectedIdsChange={onChange}
            selectedIds={value}
            operationsRenderer={operationsRenderer}
            itemRenderer={pageItemRenderer}
            headerRenderer={pageHeaderRenderer}
          />
        ) : (
          <EmptyList search={searchText} />
        )}
      </div>
    </SelectorLayout>
  );
};
export const EmptyList = ({ search }: { search?: string }) => {
  const t = useI18n();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      <AffineShapeIcon />
      <div
        style={{
          margin: '18px 0',
          fontSize: 20,
          lineHeight: '28px',
          fontWeight: 600,
        }}
      >
        {t['com.affine.selectPage.empty']()}
      </div>
      {search ? (
        <div
          className={styles.ellipsis}
          style={{ maxWidth: 300, fontSize: 15, lineHeight: '24px' }}
        >
          <Trans i18nKey="com.affine.selectPage.empty.tips" values={{ search }}>
            No page titles contain
            <span
              style={{ fontWeight: 600, color: 'var(--affine-primary-color)' }}
            >
              search
            </span>
          </Trans>
        </div>
      ) : null}
    </div>
  );
};
