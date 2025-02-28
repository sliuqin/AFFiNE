import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

export const EmbedFigmaBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:embed-iframe'),
  BlockViewExtension('affine:embed-iframe', model => {
    return model.parent?.flavour === 'affine:surface'
      ? literal`affine-embed-edgeless-iframe-block`
      : literal`affine-embed-iframe-block`;
  }),
].flat();
