import { BookmarkBlockSchema } from '@blocksuite/affine-model';
import { ToolbarModuleExtension } from '@blocksuite/affine-shared/services';
import { SlashMenuConfigExtension } from '@blocksuite/affine-widget-slash-menu';
import {
  BlockFlavourIdentifier,
  BlockViewExtension,
  FlavourExtension,
} from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { BookmarkBlockAdapterExtensions } from './adapters/extension';
import { bookmarkSlashMenuConfig } from './configs/slash-menu';
import { builtinToolbarConfig } from './configs/toolbar';

const flavour = BookmarkBlockSchema.model.flavour;

export const BookmarkBlockSpec: ExtensionType[] = [
  FlavourExtension(flavour),
  BlockViewExtension(flavour, model => {
    return model.parent?.flavour === 'affine:surface'
      ? literal`affine-edgeless-bookmark`
      : literal`affine-bookmark`;
  }),
  BookmarkBlockAdapterExtensions,
  ToolbarModuleExtension({
    id: BlockFlavourIdentifier(flavour),
    config: builtinToolbarConfig,
  }),
  SlashMenuConfigExtension(flavour, bookmarkSlashMenuConfig),
].flat();
