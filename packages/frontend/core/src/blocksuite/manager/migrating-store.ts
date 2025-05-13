import { FeatureFlagStoreExtension } from '@affine/core/blocksuite/extensions/feature-flag';
import type { FeatureFlagService } from '@affine/core/modules/feature-flag';
import {
  type StoreExtensionContext,
  StoreExtensionManager,
  StoreExtensionProvider,
} from '@blocksuite/affine/ext-loader';
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store';

import { AIChatBlockSchemaExtension } from '../ai/blocks/ai-chat-block/model';
import { TranscriptionBlockSchemaExtension } from '../ai/blocks/transcription-block/model';

class MigratingAffineStoreExtension extends StoreExtensionProvider {
  override name = 'affine-store-extensions';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(AIChatBlockSchemaExtension);
    context.register(TranscriptionBlockSchemaExtension);
  }
}

interface Configure {
  init: () => Configure;

  featureFlag: (featureFlagService?: FeatureFlagService) => Configure;

  value: StoreExtensionManager;
}

class StoreProvider {
  static instance: StoreProvider | null = null;
  static getInstance() {
    if (!StoreProvider.instance) {
      StoreProvider.instance = new StoreProvider();
    }
    return StoreProvider.instance;
  }

  private readonly _manager: StoreExtensionManager;

  constructor() {
    this._manager = new StoreExtensionManager([
      ...getInternalStoreExtensions(),
      MigratingAffineStoreExtension,
      FeatureFlagStoreExtension,
    ]);
  }

  get config(): Configure {
    return {
      init: this._initDefaultConfig,
      featureFlag: this._configureFeatureFlag,
      value: this._manager,
    };
  }

  get value(): StoreExtensionManager {
    return this._manager;
  }

  private readonly _initDefaultConfig = () => {
    this.config.featureFlag();

    return this.config;
  };

  private readonly _configureFeatureFlag = (
    featureFlagService?: FeatureFlagService
  ) => {
    this._manager.configure(FeatureFlagStoreExtension, { featureFlagService });
    return this.config;
  };
}

export function getStoreManager() {
  return StoreProvider.getInstance();
}
