import type {
  CanvasRenderer,
  RoughCanvas,
} from '@blocksuite/affine-block-surface';
import type {
  LocalShapeElementModel,
  ShapeElementModel,
} from '@blocksuite/affine-model';

import { type Colors, drawGeneralShape } from './utils';

// AKA `Pill` shape
export function capsule(
  model: ShapeElementModel | LocalShapeElementModel,
  ctx: CanvasRenderingContext2D,
  matrix: DOMMatrix,
  renderer: CanvasRenderer,
  _rc: RoughCanvas,
  colors: Colors
) {
  const { strokeWidth, filled, rotate } = model;
  const [, , w, h] = model.deserializedXYWH;
  const renderOffset = Math.max(strokeWidth, 0) / 2;
  const renderWidth = Math.max(1, w - renderOffset * 2);
  const renderHeight = Math.max(1, h - renderOffset * 2);
  const cx = renderWidth / 2;
  const cy = renderHeight / 2;

  const { fillColor, strokeColor } = colors;

  ctx.setTransform(
    matrix
      .translateSelf(renderOffset, renderOffset)
      .translateSelf(cx, cy)
      .rotateSelf(rotate)
      .translateSelf(-cx, -cy)
  );

  drawGeneralShape(ctx, model, renderer, filled, fillColor, strokeColor);
}
