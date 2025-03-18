import { BlockViewExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { EdgelessFrameManager, FrameOverlay } from './frame-manager';

export const FrameBlockSpec: ExtensionType[] = [
  BlockViewExtension('affine:frame', literal`affine-frame`),
  FrameOverlay,
  EdgelessFrameManager,
];
