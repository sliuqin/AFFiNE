import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { effects } from './effects';
import { EmbedFigmaViewExtensions } from './embed-figma-block';
import { EmbedGithubViewExtensions } from './embed-github-block';
import { EmbedHtmlViewExtensions } from './embed-html-block';
import { EmbedIframeViewExtensions } from './embed-iframe-block';
import { EmbedLinkedDocViewExtensions } from './embed-linked-doc-block';
import { EmbedLoomViewExtensions } from './embed-loom-block';
import { EmbedSyncedDocViewExtensions } from './embed-synced-doc-block';
import { EmbedYoutubeViewExtensions } from './embed-youtube-block';
export class EmbedViewExtension extends ViewExtensionProvider {
  override name = 'affine-embed-block';

  override effect(): void {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register(EmbedFigmaViewExtensions);
    context.register(EmbedGithubViewExtensions);
    context.register(EmbedLoomViewExtensions);
    context.register(EmbedYoutubeViewExtensions);
    context.register(EmbedHtmlViewExtensions);
    context.register(EmbedLinkedDocViewExtensions);
    context.register(EmbedSyncedDocViewExtensions);
    context.register(EmbedIframeViewExtensions);
  }
}
