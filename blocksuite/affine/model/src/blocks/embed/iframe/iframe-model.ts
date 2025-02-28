import { BlockModel } from '@blocksuite/store';

import { defineEmbedModel, type EmbedCardStyle } from '../../../utils/index.js';

export const EmbedIframeStyles: EmbedCardStyle[] = ['figma'] as const;

export type EmbedIframeBlockProps = {
  originalUrl?: string;
  iframeUrl?: string;
  width?: number;
  height?: number;
  caption: string | null;
  title: string | null;
  description: string | null;
};

export class EmbedIframeModel extends defineEmbedModel<EmbedIframeBlockProps>(
  BlockModel
) {}
