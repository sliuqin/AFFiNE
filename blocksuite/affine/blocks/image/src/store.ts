import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { ImageBlockSchemaExtension } from '@blocksuite/affine-model';
import { ImageSelectionExtension } from '@blocksuite/affine-shared/selection';
import { z } from 'zod';

import { ImageBlockAdapterExtensions } from './adapters/extension';
import { ImageProxyService } from './image-proxy-service';

const ImageStoreExtensionOptionsSchema = z.object({
  imageProxyURL: z.string().optional(),
});

export class ImageStoreExtension extends StoreExtensionProvider<
  z.infer<typeof ImageStoreExtensionOptionsSchema>
> {
  override name = 'affine-image-block';

  override schema = ImageStoreExtensionOptionsSchema;

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register([
      ImageBlockSchemaExtension,
      ImageProxyService,
      ImageSelectionExtension,
    ]);
    context.register(ImageBlockAdapterExtensions);
    // TODO(@mirone): set image proxy url
  }
}
