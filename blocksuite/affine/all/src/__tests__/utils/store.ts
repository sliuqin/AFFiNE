import { AttachmentStoreExtension } from '@blocksuite/affine-block-attachment/store';
import { BookmarkStoreExtension } from '@blocksuite/affine-block-bookmark/store';
import { CalloutStoreExtension } from '@blocksuite/affine-block-callout/store';
import { CodeStoreExtension } from '@blocksuite/affine-block-code/store';
import { DataViewStoreExtension } from '@blocksuite/affine-block-data-view/store';
import { DatabaseStoreExtension } from '@blocksuite/affine-block-database/store';
import { DividerStoreExtension } from '@blocksuite/affine-block-divider/store';
import { EdgelessTextStoreExtension } from '@blocksuite/affine-block-edgeless-text/store';
import { EmbedStoreExtension } from '@blocksuite/affine-block-embed/store';
import { FrameStoreExtension } from '@blocksuite/affine-block-frame/store';
import { ImageStoreExtension } from '@blocksuite/affine-block-image/store';
import { LatexStoreExtension } from '@blocksuite/affine-block-latex/store';
import { ListStoreExtension } from '@blocksuite/affine-block-list/store';
import { NoteStoreExtension } from '@blocksuite/affine-block-note/store';
import { ParagraphStoreExtension } from '@blocksuite/affine-block-paragraph/store';
import { StoreExtensionManager } from '@blocksuite/affine-ext-loader';

import { MigratingStoreExtension } from '../../extensions/store';

const manager = new StoreExtensionManager([
  AttachmentStoreExtension,
  BookmarkStoreExtension,
  CalloutStoreExtension,
  CodeStoreExtension,
  DataViewStoreExtension,
  DatabaseStoreExtension,
  DividerStoreExtension,
  EdgelessTextStoreExtension,
  EmbedStoreExtension,
  FrameStoreExtension,
  ImageStoreExtension,
  LatexStoreExtension,
  ListStoreExtension,
  NoteStoreExtension,
  ParagraphStoreExtension,

  MigratingStoreExtension,
]);

export const testStoreExtensions = manager.get('store');
