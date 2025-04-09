import type { Options } from '@blocksuite/affine-block-surface';
import {
  type ShapeName,
  type ShapeStyle,
  ShapeType,
} from '@blocksuite/affine-model';
import type { XYWH } from '@blocksuite/global/gfx';

import { CapsuleShape } from './capsule';
import { DiamondShape } from './diamond';
import { EllipseShape } from './ellipse';
import { RectShape } from './rect';
import { RoundedRectShape } from './rounded-rect';
import type { Shape } from './shape';
import { TriangleShape } from './triangle';

export class ShapeFactory {
  static createShape(
    type: ShapeName,
    xywh: XYWH,
    options: Options,
    shapeStyle: ShapeStyle
  ): Shape {
    switch (type) {
      case ShapeType.Rect:
        return new RectShape(xywh, options, shapeStyle);
      case 'roundedRect':
        return new RoundedRectShape(xywh, options, shapeStyle);
      case ShapeType.Triangle:
        return new TriangleShape(xywh, options, shapeStyle);
      case ShapeType.Diamond:
        return new DiamondShape(xywh, options, shapeStyle);
      case ShapeType.Ellipse:
        return new EllipseShape(xywh, options, shapeStyle);
      case ShapeType.Capsule:
        return new CapsuleShape(xywh, options, shapeStyle);
      default:
        throw new Error(`Unknown shape type: ${type}`);
    }
  }
}
