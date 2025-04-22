import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { effects } from './effects';
import { FrameBlockSpec } from './frame-spec';

export class FrameViewExtension extends ViewExtensionProvider {
  override name = 'affine-frame-block';

  override effect(): void {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext): void {
    super.setup(context);
    context.register(FrameBlockSpec);
  }
}
