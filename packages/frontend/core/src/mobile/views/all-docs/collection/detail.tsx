import { EmptyCollectionDetail } from '@affine/core/components/affine/empty';
import { PageHeader } from '@affine/core/mobile/components';
import { Page } from '@affine/core/mobile/components/page';
import type { Collection } from '@affine/core/modules/collection';
import { ViewLayersIcon } from '@blocksuite/icons/rc';
import { useLiveData } from '@toeverything/infra';

import { AllDocList } from '../doc/list';
import * as styles from './detail.css';

export const DetailHeader = ({ collection }: { collection: Collection }) => {
  const name = useLiveData(collection.name$);
  return (
    <PageHeader className={styles.header} back>
      <div className={styles.headerContent}>
        <ViewLayersIcon className={styles.headerIcon} />
        {name}
      </div>
    </PageHeader>
  );
};

export const CollectionDetail = ({
  collection,
}: {
  collection: Collection;
}) => {
  const info = useLiveData(collection.info$);
  if (info.allowList.length === 0 && info.rules.filters.length === 0) {
    return (
      <Page header={<DetailHeader collection={collection} />}>
        <div style={{ flexGrow: 1 }}>
          <EmptyCollectionDetail collection={collection} absoluteCenter />
        </div>
      </Page>
    );
  }

  return (
    <Page header={<DetailHeader collection={collection} />}>
      <AllDocList collection={collection} />
    </Page>
  );
};
