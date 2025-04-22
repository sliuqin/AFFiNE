import { AttachmentStoreExtension } from '@blocksuite/affine/blocks/attachment/store';
import { BookmarkStoreExtension } from '@blocksuite/affine/blocks/bookmark/store';
import { CalloutStoreExtension } from '@blocksuite/affine/blocks/callout/store';
import { CodeStoreExtension } from '@blocksuite/affine/blocks/code/store';
import { DataViewStoreExtension } from '@blocksuite/affine/blocks/data-view/store';
import { DatabaseStoreExtension } from '@blocksuite/affine/blocks/database/store';
import { DividerStoreExtension } from '@blocksuite/affine/blocks/divider/store';
import { EdgelessTextStoreExtension } from '@blocksuite/affine/blocks/edgeless-text/store';
import { EmbedStoreExtension } from '@blocksuite/affine/blocks/embed/store';
import { FrameStoreExtension } from '@blocksuite/affine/blocks/frame/store';
import { ImageStoreExtension } from '@blocksuite/affine/blocks/image/store';
import { LatexStoreExtension } from '@blocksuite/affine/blocks/latex/store';
import { ListStoreExtension } from '@blocksuite/affine/blocks/list/store';
import { NoteStoreExtension } from '@blocksuite/affine/blocks/note/store';
import { ParagraphStoreExtension } from '@blocksuite/affine/blocks/paragraph/store';
import { StoreExtensionManager } from '@blocksuite/affine/ext-loader';
import { MigratingStoreExtension } from '@blocksuite/affine/extensions/store';

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

export function getTestStoreManager() {
  return manager;
}
