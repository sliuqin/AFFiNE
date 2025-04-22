import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { LatexBlockSchemaExtension } from '@blocksuite/affine-model';

import { LatexBlockAdapterExtensions } from './adapters/extension';

export class LatexStoreExtension extends StoreExtensionProvider {
  override name = 'affine-latex-block';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register([LatexBlockSchemaExtension]);
    context.register(LatexBlockAdapterExtensions);
  }
}
