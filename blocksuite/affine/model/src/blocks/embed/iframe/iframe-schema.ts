import { BlockSchemaExtension } from '@blocksuite/store';

import { createEmbedBlockSchema } from '../../../utils/helper';
import { type EmbedIframeBlockProps, EmbedIframeModel } from './iframe-model';

const defaultEmbedIframeProps: EmbedIframeBlockProps = {
  originalUrl: '',
  iframeUrl: '',
  width: undefined,
  height: undefined,
  caption: null,
  title: null,
  description: null,
};

export const EmbedIframeBlockSchema = createEmbedBlockSchema({
  name: 'iframe',
  version: 1,
  toModel: () => new EmbedIframeModel(),
  props: (): EmbedIframeBlockProps => defaultEmbedIframeProps,
});

export const EmbedIframeBlockSchemaExtension = BlockSchemaExtension(
  EmbedIframeBlockSchema
);
