import {
  DatabaseBlockDataSource,
  type PropertyMetaConfig,
} from '@blocksuite/affine/blocks';
import type { ExtensionType } from '@blocksuite/affine/store';

import { filePropertyConfig } from '../database-block/properties/file/view';

const propertiesPresets: PropertyMetaConfig<string, any, any>[] = [
  filePropertyConfig,
];

export function patchDatabaseBlockConfigService(): ExtensionType {
  //TODO use service
  DatabaseBlockDataSource.externalProperties.value = propertiesPresets;
  return {
    setup: () => {},
  };
}
