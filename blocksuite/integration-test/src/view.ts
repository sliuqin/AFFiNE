import { AttachmentViewExtension } from '@blocksuite/affine/blocks/attachment/view';
import { BookmarkViewExtension } from '@blocksuite/affine/blocks/bookmark/view';
import { CalloutViewExtension } from '@blocksuite/affine/blocks/callout/view';
import { CodeBlockViewExtension } from '@blocksuite/affine/blocks/code/view';
import { DataViewViewExtension } from '@blocksuite/affine/blocks/data-view/view';
import { DatabaseViewExtension } from '@blocksuite/affine/blocks/database/view';
import { DividerViewExtension } from '@blocksuite/affine/blocks/divider/view';
import { EdgelessTextViewExtension } from '@blocksuite/affine/blocks/edgeless-text/view';
import { EmbedViewExtension } from '@blocksuite/affine/blocks/embed/view';
import { FrameViewExtension } from '@blocksuite/affine/blocks/frame/view';
import { ImageViewExtension } from '@blocksuite/affine/blocks/image/view';
import { LatexViewExtension } from '@blocksuite/affine/blocks/latex/view';
import { ListViewExtension } from '@blocksuite/affine/blocks/list/view';
import { NoteViewExtension } from '@blocksuite/affine/blocks/note/view';
import { ParagraphViewExtension } from '@blocksuite/affine/blocks/paragraph/view';
import { ViewExtensionManager } from '@blocksuite/affine/ext-loader';
import { MigratingViewExtension } from '@blocksuite/affine/extensions/view';

export function getTestViewManager() {
  const manager = new ViewExtensionManager([
    MigratingViewExtension,
    AttachmentViewExtension,
    BookmarkViewExtension,
    CalloutViewExtension,
    CodeBlockViewExtension,
    DataViewViewExtension,
    DatabaseViewExtension,
    DividerViewExtension,
    EdgelessTextViewExtension,
    EmbedViewExtension,
    FrameViewExtension,
    ImageViewExtension,
    LatexViewExtension,
    ListViewExtension,
    NoteViewExtension,
    ParagraphViewExtension,
  ]);
  return manager;
}
