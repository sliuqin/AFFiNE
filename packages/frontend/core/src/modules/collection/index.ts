export { Collection } from './entities/collection';
export type { CollectionMeta } from './services/collection';
export { CollectionService } from './services/collection';
export type { CollectionInfo } from './stores/collection';

import { type Framework } from '@toeverything/infra';

import { CollectionRulesService } from '../collection-rules';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { Collection } from './entities/collection';
import { CollectionService } from './services/collection';
import { CollectionStore } from './stores/collection';

export function configureCollectionModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(CollectionService, [CollectionStore])
    .store(CollectionStore, [WorkspaceService])
    .entity(Collection, [CollectionStore, CollectionRulesService]);
}
