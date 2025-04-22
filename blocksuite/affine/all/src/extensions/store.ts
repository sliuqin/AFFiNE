import { CodeMarkdownPreprocessorExtension } from '@blocksuite/affine-block-code';
import { DatabaseSelectionExtension } from '@blocksuite/affine-block-database';
import { EmbedIframeConfigExtensions } from '@blocksuite/affine-block-embed';
import { ImageStoreSpec } from '@blocksuite/affine-block-image';
import { LatexMarkdownPreprocessorExtension } from '@blocksuite/affine-block-latex';
import {
  RootBlockHtmlAdapterExtension,
  RootBlockMarkdownAdapterExtension,
  RootBlockNotionHtmlAdapterExtension,
} from '@blocksuite/affine-block-root';
import { SurfaceBlockSchemaExtension } from '@blocksuite/affine-block-surface';
import {
  TableBlockAdapterExtensions,
  TableSelectionExtension,
} from '@blocksuite/affine-block-table';
import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import {
  HtmlInlineToDeltaAdapterExtensions,
  InlineDeltaToHtmlAdapterExtensions,
  InlineDeltaToMarkdownAdapterExtensions,
  InlineDeltaToPlainTextAdapterExtensions,
  MarkdownInlineToDeltaAdapterExtensions,
  NotionHtmlInlineToDeltaAdapterExtensions,
} from '@blocksuite/affine-inline-preset';
import {
  RootBlockSchemaExtension,
  SurfaceRefBlockSchemaExtension,
  TableBlockSchemaExtension,
  TranscriptionBlockSchemaExtension,
} from '@blocksuite/affine-model';
import {
  HtmlAdapterFactoryExtension,
  MarkdownAdapterFactoryExtension,
  MixTextAdapterFactoryExtension,
  NotionHtmlAdapterFactoryExtension,
  NotionTextAdapterFactoryExtension,
  PlainTextAdapterFactoryExtension,
} from '@blocksuite/affine-shared/adapters';
import { HighlightSelectionExtension } from '@blocksuite/affine-shared/selection';
import {
  BlockMetaService,
  EmbedIframeService,
  FeatureFlagService,
  FileSizeLimitService,
  LinkPreviewerService,
} from '@blocksuite/affine-shared/services';
import {
  BlockSelectionExtension,
  CursorSelectionExtension,
  SurfaceSelectionExtension,
  TextSelectionExtension,
} from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';

function getAdapterFactoryExtensions(): ExtensionType[] {
  return [
    MarkdownAdapterFactoryExtension,
    PlainTextAdapterFactoryExtension,
    HtmlAdapterFactoryExtension,
    NotionTextAdapterFactoryExtension,
    NotionHtmlAdapterFactoryExtension,
    MixTextAdapterFactoryExtension,
  ];
}

const defaultBlockHtmlAdapterMatchers = [RootBlockHtmlAdapterExtension];

const defaultBlockMarkdownAdapterMatchers = [RootBlockMarkdownAdapterExtension];

const defaultMarkdownPreprocessors = [
  LatexMarkdownPreprocessorExtension,
  CodeMarkdownPreprocessorExtension,
];

const defaultBlockNotionHtmlAdapterMatchers: ExtensionType[] = [
  RootBlockNotionHtmlAdapterExtension,
];

const defaultBlockPlainTextAdapterMatchers: ExtensionType[] = [];

function getHtmlAdapterExtensions(): ExtensionType[] {
  return [
    ...HtmlInlineToDeltaAdapterExtensions,
    ...defaultBlockHtmlAdapterMatchers,
    ...InlineDeltaToHtmlAdapterExtensions,
  ];
}

function getMarkdownAdapterExtensions(): ExtensionType[] {
  return [
    ...MarkdownInlineToDeltaAdapterExtensions,
    ...defaultBlockMarkdownAdapterMatchers,
    ...InlineDeltaToMarkdownAdapterExtensions,
    ...defaultMarkdownPreprocessors,
  ];
}

function getNotionHtmlAdapterExtensions(): ExtensionType[] {
  return [
    ...NotionHtmlInlineToDeltaAdapterExtensions,
    ...defaultBlockNotionHtmlAdapterMatchers,
  ];
}

function getPlainTextAdapterExtensions(): ExtensionType[] {
  return [
    ...defaultBlockPlainTextAdapterMatchers,
    ...InlineDeltaToPlainTextAdapterExtensions,
  ];
}

const MigratingStoreExtensions: ExtensionType[] = [
  RootBlockSchemaExtension,
  SurfaceBlockSchemaExtension,
  SurfaceRefBlockSchemaExtension,
  TableBlockSchemaExtension,
  TranscriptionBlockSchemaExtension,

  BlockSelectionExtension,
  TextSelectionExtension,
  SurfaceSelectionExtension,
  CursorSelectionExtension,
  HighlightSelectionExtension,
  DatabaseSelectionExtension,
  TableSelectionExtension,

  TableBlockAdapterExtensions,
  getHtmlAdapterExtensions(),
  getMarkdownAdapterExtensions(),
  getNotionHtmlAdapterExtensions(),
  getPlainTextAdapterExtensions(),
  getAdapterFactoryExtensions(),

  FeatureFlagService,
  LinkPreviewerService,
  FileSizeLimitService,
  ImageStoreSpec,
  BlockMetaService,
  EmbedIframeConfigExtensions,
  EmbedIframeService,
].flat();

export class MigratingStoreExtension extends StoreExtensionProvider {
  override name = 'migrating';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(MigratingStoreExtensions);
  }
}
