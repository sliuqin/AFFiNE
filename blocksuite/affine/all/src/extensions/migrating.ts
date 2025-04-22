import {
  EdgelessBuiltInSpecs,
  PageRootBlockSpec,
  PreviewEdgelessRootBlockSpec,
  PreviewPageRootBlockSpec,
  ReadOnlyClipboard,
} from '@blocksuite/affine-block-root';
import {
  EdgelessSurfaceBlockAdapterExtensions,
  EdgelessSurfaceBlockSpec,
  PageSurfaceBlockSpec,
  SurfaceBlockAdapterExtensions,
} from '@blocksuite/affine-block-surface';
import {
  EdgelessSurfaceRefBlockSpec,
  PageSurfaceRefBlockSpec,
} from '@blocksuite/affine-block-surface-ref';
import { TableBlockSpec } from '@blocksuite/affine-block-table';
import {
  brushToMarkdownAdapterMatcher,
  brushToPlainTextAdapterMatcher,
} from '@blocksuite/affine-gfx-brush';
import {
  connectorToMarkdownAdapterMatcher,
  connectorToPlainTextAdapterMatcher,
} from '@blocksuite/affine-gfx-connector';
import {
  groupToMarkdownAdapterMatcher,
  groupToPlainTextAdapterMatcher,
} from '@blocksuite/affine-gfx-group';
import {
  mindmapToMarkdownAdapterMatcher,
  mindmapToPlainTextAdapterMatcher,
} from '@blocksuite/affine-gfx-mindmap';
import {
  shapeToMarkdownAdapterMatcher,
  shapeToPlainTextAdapterMatcher,
} from '@blocksuite/affine-gfx-shape';
import {
  textToMarkdownAdapterMatcher,
  textToPlainTextAdapterMatcher,
} from '@blocksuite/affine-gfx-text';
import { inlinePresetExtensions } from '@blocksuite/affine-inline-preset';
import {
  DefaultOpenDocExtension,
  DocDisplayMetaService,
  EditPropsStore,
  FontLoaderService,
} from '@blocksuite/affine-shared/services';
import type { ExtensionType } from '@blocksuite/store';

const elementToPlainTextAdapterMatchers = [
  groupToPlainTextAdapterMatcher,
  shapeToPlainTextAdapterMatcher,
  connectorToPlainTextAdapterMatcher,
  brushToPlainTextAdapterMatcher,
  textToPlainTextAdapterMatcher,
  mindmapToPlainTextAdapterMatcher,
];

const elementToMarkdownAdapterMatchers = [
  groupToMarkdownAdapterMatcher,
  shapeToMarkdownAdapterMatcher,
  connectorToMarkdownAdapterMatcher,
  brushToMarkdownAdapterMatcher,
  textToMarkdownAdapterMatcher,
  mindmapToMarkdownAdapterMatcher,
];

const CommonBlockSpecs: ExtensionType[] = [
  inlinePresetExtensions,
  DocDisplayMetaService,
  EditPropsStore,
  TableBlockSpec,
  DefaultOpenDocExtension,
  FontLoaderService,

  elementToPlainTextAdapterMatchers,
  elementToMarkdownAdapterMatchers,
].flat();

const PageFirstPartyBlockSpecs: ExtensionType[] = [
  CommonBlockSpecs,
  PageSurfaceBlockSpec,
  PageSurfaceRefBlockSpec,

  ...SurfaceBlockAdapterExtensions,
].flat();

const EdgelessFirstPartyBlockSpecs: ExtensionType[] = [
  CommonBlockSpecs,
  EdgelessSurfaceBlockSpec,
  EdgelessSurfaceRefBlockSpec,

  ...EdgelessSurfaceBlockAdapterExtensions,
].flat();

export const MigratingEdgelessEditorBlockSpecs: ExtensionType[] = [
  EdgelessBuiltInSpecs,
  EdgelessFirstPartyBlockSpecs,
].flat();

export const MigratingPageEditorBlockSpecs: ExtensionType[] = [
  PageRootBlockSpec,
  PageFirstPartyBlockSpecs,
].flat();

export const MigratingPreviewEdgelessEditorBlockSpecs: ExtensionType[] = [
  PreviewEdgelessRootBlockSpec,
  EdgelessFirstPartyBlockSpecs,
  ReadOnlyClipboard,
].flat();

export const MigratingPreviewPageEditorBlockSpecs: ExtensionType[] = [
  PreviewPageRootBlockSpec,
  PageFirstPartyBlockSpecs,
  ReadOnlyClipboard,
].flat();
