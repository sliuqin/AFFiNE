import type { BlockMeta } from '@blocksuite/affine-model';
import { type BlockModel, type Store, StoreExtension } from '@blocksuite/store';

import { FeatureFlagService } from './feature-flag-service';
import { UserProvider } from './user-service';

/**
 * The service is used to add following info to the block.
 * - createdAt: The time when the block is created.
 * - createdBy: The user who created the block.
 * - updatedAt: The time when the block is updated.
 * - updatedBy: The user who updated the block.
 */
export class BlockMetaService extends StoreExtension {
  static override key = 'affine-block-meta-service';

  get isBlockMetaEnabled() {
    return (
      this.store.get(FeatureFlagService).getFlag('enable_block_meta') === true
    );
  }

  constructor(store: Store) {
    super(store);

    if (!this.isBlockMetaEnabled) return;

    this.store.slots.blockUpdated.on(({ type, id }) => {
      if (!this.isBlockMetaEnabled) return;

      const model = this.store.getBlock(id)?.model;
      if (!model) return;

      if (type === 'add') {
        return this._onBlockCreated(model);
      }

      if (type === 'update') {
        return this._onBlockUpdated(model);
      }
    });
  }

  private readonly _onBlockCreated = (model: BlockModel<BlockMeta>): void => {
    if (!isBlockMetaSupported(model)) {
      return;
    }

    const currentUser = this._getCurrentUser();
    if (!currentUser) return;
    const now = getNow();

    this.store.withoutTransact(() => {
      const isFlatModel = model.schema.model.isFlatData;
      if (!isFlatModel) {
        model['meta:createdAt'] = now;
        model['meta:createdBy'] = currentUser.id;
        return;
      }

      model.props['meta:createdAt'] = now;
      model.props['meta:createdBy'] = currentUser.id;
    });
  };

  private readonly _onBlockUpdated = (model: BlockModel<BlockMeta>): void => {
    if (!isBlockMetaSupported(model)) {
      return;
    }

    const currentUser = this._getCurrentUser();
    if (!currentUser) return;
    const now = getNow();

    this.store.withoutTransact(() => {
      const isFlatModel = model.schema.model.isFlatData;
      if (!isFlatModel) {
        model['meta:updatedAt'] = now;
        model['meta:updatedBy'] = currentUser.id;
        if (!model['meta:createdAt']) {
          model['meta:createdAt'] = now;
          model['meta:createdBy'] = currentUser.id;
        }
        return;
      }

      model.props['meta:updatedAt'] = now;
      model.props['meta:updatedBy'] = currentUser.id;
      if (!model.props['meta:createdAt']) {
        model.props['meta:createdAt'] = now;
        model.props['meta:createdBy'] = currentUser.id;
      }
    });
  };

  private readonly _getCurrentUser = () => {
    return this.store.getOptional(UserProvider)?.getCurrentUser();
  };
}

function isBlockMetaSupported(model: BlockModel) {
  return [
    'meta:createdAt',
    'meta:createdBy',
    'meta:updatedAt',
    'meta:updatedBy',
  ].every(key => model.keys.includes(key));
}

function getNow() {
  return Date.now();
}
