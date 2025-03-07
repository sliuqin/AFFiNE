import { SlashMenuConfigExtension } from '@blocksuite/affine-widget-slash-menu';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/block-std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import { calloutSlashMenuConfig } from './configs/slash-menu';

export const CalloutBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:callout'),
  BlockViewExtension('affine:callout', literal`affine-callout`),
  SlashMenuConfigExtension('affine:callout', calloutSlashMenuConfig),
];
