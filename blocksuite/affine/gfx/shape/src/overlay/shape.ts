import type { Options, RoughCanvas } from '@blocksuite/affine-block-surface';
import type { ShapeName, ShapeStyle } from '@blocksuite/affine-model';
import type { XYWH } from '@blocksuite/global/gfx';

export abstract class Shape {
  options: Options;

  shapeStyle: ShapeStyle;

  xywh: XYWH;

  constructor(xywh: XYWH, options: Options, shapeStyle: ShapeStyle) {
    this.xywh = xywh;
    this.options = options;
    this.shapeStyle = shapeStyle;
  }

  abstract get type(): ShapeName;

  abstract draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void;
}
