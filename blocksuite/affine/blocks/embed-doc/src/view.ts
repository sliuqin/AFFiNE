import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { effects } from './effects';
import {
  EdgelessClipboardEmbedLinkedDocConfig,
  EmbedLinkedDocInteraction,
  EmbedLinkedDocViewExtensions,
} from './embed-linked-doc-block';
import {
  EdgelessClipboardEmbedSyncedDocConfig,
  EmbedSyncedDocInteraction,
  EmbedSyncedDocViewExtensions,
} from './embed-synced-doc-block';

export class EmbedDocViewExtension extends ViewExtensionProvider {
  override name = 'affine-embed-doc-block';

  override effect(): void {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register(EmbedLinkedDocViewExtensions);
    context.register(EmbedSyncedDocViewExtensions);
    const isEdgeless = this.isEdgeless(context.scope);
    if (isEdgeless) {
      context.register([
        EdgelessClipboardEmbedLinkedDocConfig,
        EdgelessClipboardEmbedSyncedDocConfig,
        EmbedLinkedDocInteraction,
        EmbedSyncedDocInteraction,
      ]);
    }
  }
}
