import {
  FrameHighlightManager,
  FrameTool,
  PresentTool,
} from '@blocksuite/affine-block-frame';
import { ConnectionOverlay } from '@blocksuite/affine-block-surface';
import {
  BrushTool,
  EraserTool,
  HighlighterTool,
} from '@blocksuite/affine-gfx-brush';
import {
  ConnectorFilter,
  ConnectorTool,
} from '@blocksuite/affine-gfx-connector';
import {
  MindMapDragExtension,
  MindMapIndicatorOverlay,
} from '@blocksuite/affine-gfx-mindmap';
import { NoteTool } from '@blocksuite/affine-gfx-note';
import { ShapeTool } from '@blocksuite/affine-gfx-shape';
import { TemplateTool } from '@blocksuite/affine-gfx-template';
import { TextTool } from '@blocksuite/affine-gfx-text';
import { InteractivityManager } from '@blocksuite/std/gfx';
import type { ExtensionType } from '@blocksuite/store';

import { EdgelessElementToolbarExtension } from './configs/toolbar';
import { EdgelessRootBlockSpec } from './edgeless-root-spec.js';
import { DefaultTool } from './gfx-tool/default-tool.js';
import { EmptyTool } from './gfx-tool/empty-tool.js';
import { PanTool } from './gfx-tool/pan-tool.js';
import { AltCloneExtension } from './interact-extensions/clone-ext.js';
import { DblClickAddEdgelessText } from './interact-extensions/dblclick-add-edgeless-text.js';
import { SnapExtension } from './interact-extensions/snap-manager.js';
import { EditPropsMiddlewareBuilder } from './middlewares/base.js';
import { SnapOverlay } from './utils/snap-manager.js';

export const EdgelessToolExtension: ExtensionType[] = [
  DefaultTool,
  PanTool,
  EraserTool,
  TextTool,
  ShapeTool,
  NoteTool,
  BrushTool,
  ConnectorTool,
  TemplateTool,
  EmptyTool,
  FrameTool,
  PresentTool,
  HighlighterTool,
];

export const EdgelessEditExtensions: ExtensionType[] = [
  InteractivityManager,
  ConnectorFilter,
  SnapExtension,
  MindMapDragExtension,
  FrameHighlightManager,
  DblClickAddEdgelessText,
];

export const EdgelessBuiltInManager: ExtensionType[] = [
  ConnectionOverlay,
  MindMapIndicatorOverlay,
  SnapOverlay,
  AltCloneExtension,
  EditPropsMiddlewareBuilder,
  EdgelessElementToolbarExtension,
].flat();

export const EdgelessBuiltInSpecs: ExtensionType[] = [
  EdgelessRootBlockSpec,
  EdgelessToolExtension,
  EdgelessBuiltInManager,
  EdgelessEditExtensions,
].flat();
