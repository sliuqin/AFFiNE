import { Entity, LiveData } from '@toeverything/infra';
import { uniq } from 'lodash-es';
import { map, switchMap } from 'rxjs';

import type { CollectionRulesService } from '../../collection-rules';
import type { CollectionInfo, CollectionStore } from '../stores/collection';

export class Collection extends Entity<{ id: string }> {
  constructor(
    private readonly store: CollectionStore,
    private readonly rulesService: CollectionRulesService
  ) {
    super();
  }

  id = this.props.id;

  info$ = LiveData.from<CollectionInfo>(
    this.store.watchCollectionInfo(this.id).pipe(
      map(
        info =>
          ({
            // default fields in case collection info is not found
            name: '',
            id: this.id,
            rules: {
              filters: [],
            },
            allowList: [],
            ...info,
          }) as CollectionInfo
      )
    ),
    {} as CollectionInfo
  );

  name$ = this.info$.map(info => info.name);
  allowList$ = this.info$.map(info => info.allowList);
  rules$ = this.info$.map(info => info.rules);

  /**
   * Returns a list of document IDs that match the collection rules and allow list.
   *
   * For performance optimization,
   * Developers must explicitly call `watch()` to retrieve the result and properly manage the subscription lifecycle.
   */
  watch() {
    return this.info$.pipe(
      switchMap(info => {
        return this.rulesService
          .watch(
            info.rules.filters.length > 0
              ? [
                  ...info.rules.filters,
                  // if we have more than one filter, we need to add a system filter to exclude trash
                  {
                    type: 'system',
                    key: 'trash',
                    method: 'is',
                    value: 'false',
                  },
                ]
              : [], // If no filters are provided, an empty filter list will match no documents
            undefined,
            undefined,
            info.allowList
          )
          .pipe(map(result => result.groups.map(group => group.items).flat()));
      })
    );
  }

  updateInfo(info: Partial<CollectionInfo>) {
    this.store.updateCollectionInfo(this.id, info);
  }

  addDoc(...docIds: string[]) {
    this.store.updateCollectionInfo(this.id, {
      allowList: uniq([...this.info$.value.allowList, ...docIds]),
    });
  }

  removeDoc(...docIds: string[]) {
    this.store.updateCollectionInfo(this.id, {
      allowList: this.info$.value.allowList.filter(id => !docIds.includes(id)),
    });
  }
}
