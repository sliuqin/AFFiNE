import { EmptyDocs } from '@affine/core/components/affine/empty';
import { useBlockSuiteDocMeta } from '@affine/core/components/hooks/use-block-suite-page-meta';
import {
  type ItemGroupProps,
  useAllDocDisplayProperties,
} from '@affine/core/components/page-list';
import type { Collection } from '@affine/core/modules/collection';
import { DocsService } from '@affine/core/modules/doc';
import type { Tag } from '@affine/core/modules/tag';
import { WorkspaceService } from '@affine/core/modules/workspace';
import type { DocMeta } from '@blocksuite/affine/store';
import { ToggleDownIcon } from '@blocksuite/icons/rc';
import * as Collapsible from '@radix-ui/react-collapsible';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo, useState } from 'react';

import * as styles from './list.css';
import { MasonryDocs } from './masonry';

export const DocGroup = ({ group }: { group: ItemGroupProps<DocMeta> }) => {
  const [properties] = useAllDocDisplayProperties();
  const showTags = properties.displayProperties.tags;

  if (group.id === 'all') {
    return <MasonryDocs items={group.items} showTags={showTags} />;
  }

  return (
    <Collapsible.Root defaultOpen>
      <Collapsible.Trigger className={styles.groupTitle}>
        {group.label}
        <ToggleDownIcon className={styles.groupTitleIcon} />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <MasonryDocs items={group.items} showTags={showTags} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
};

export interface AllDocListProps {
  collection?: Collection;
  tag?: Tag;
  trash?: boolean;
}

export const AllDocList = ({ trash, collection, tag }: AllDocListProps) => {
  const [properties] = useAllDocDisplayProperties();
  const workspace = useService(WorkspaceService).workspace;
  const allPageMetas = useBlockSuiteDocMeta(workspace.docCollection);
  const docsService = useService(DocsService);

  const allTrashPageIds = useLiveData(
    LiveData.from(docsService.allTrashDocIds$(), [])
  );

  const tagPageIds = useLiveData(tag?.pageIds$);

  const [filteredPageIds, setFilteredPageIds] = useState<string[]>([]);

  useEffect(() => {
    const subscription = collection?.watch().subscribe(docIds => {
      setFilteredPageIds(docIds);
    });
    return () => subscription?.unsubscribe();
  }, [collection]);

  const finalPageMetas = useMemo(() => {
    const collectionFilteredPageMetas = collection
      ? allPageMetas.filter(page => filteredPageIds.includes(page.id))
      : allPageMetas;

    const filteredPageMetas = collectionFilteredPageMetas.filter(
      page => allTrashPageIds.includes(page.id) === !!trash
    );

    if (tag) {
      const pageIdsSet = new Set(tagPageIds);
      return filteredPageMetas.filter(page => pageIdsSet.has(page.id));
    }
    return filteredPageMetas;
  }, [
    allPageMetas,
    allTrashPageIds,
    collection,
    filteredPageIds,
    tag,
    tagPageIds,
    trash,
  ]);

  if (!finalPageMetas.length) {
    return (
      <>
        <EmptyDocs absoluteCenter tagId={tag?.id} />
        <div className={styles.emptySpaceY} />
      </>
    );
  }

  return (
    <MasonryDocs
      items={finalPageMetas}
      showTags={properties.displayProperties.tags}
    />
  );
};
