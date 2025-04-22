import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { effects } from './effects';
import { ImageBlockSpec } from './image-spec';

export class ImageViewExtension extends ViewExtensionProvider {
  override name = 'affine-image-block';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register(ImageBlockSpec);
  }
}
