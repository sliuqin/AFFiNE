import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { BlockViewExtension } from '@blocksuite/std';
import { literal } from 'lit/static-html.js';

import { effects } from './effects';

export class EdgelessTextViewExtension extends ViewExtensionProvider {
  override name = 'affine-edgeless-text-block';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    const isEdgeless =
      context.scope === 'edgeless' ||
      context.scope === 'preview-edgeless' ||
      context.scope === 'mobile-edgeless';

    if (isEdgeless) {
      context.register([
        BlockViewExtension(
          'affine:edgeless-text',
          literal`affine-edgeless-text`
        ),
      ]);
    }
  }
}
