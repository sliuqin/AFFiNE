import { CodeBlockSchema } from '@blocksuite/affine-model';
import { textKeymap } from '@blocksuite/affine-rich-text';
import { KeymapExtension } from '@blocksuite/block-std';

export const CodeKeymapExtension = KeymapExtension(textKeymap, {
  flavour: CodeBlockSchema.model.flavour,
});
