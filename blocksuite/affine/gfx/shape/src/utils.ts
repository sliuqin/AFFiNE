import { type ShapeName, ShapeType } from '@blocksuite/affine-model';
import type { IVec, XYWH } from '@blocksuite/global/gfx';

import {
  SHAPE_OVERLAY_HEIGHT,
  SHAPE_OVERLAY_OFFSET_X,
  SHAPE_OVERLAY_OFFSET_Y,
  SHAPE_OVERLAY_WIDTH,
} from './consts';

export function buildXYWHWith(
  type: ShapeName,
  [x, y]: IVec,
  shouldOffset = true
): XYWH {
  const xywh: XYWH = [x, y, SHAPE_OVERLAY_WIDTH, SHAPE_OVERLAY_HEIGHT];

  switch (type) {
    case 'roundedRect':
    case ShapeType.Rect:
      if (shouldOffset) {
        xywh[0] += SHAPE_OVERLAY_OFFSET_X;
        xywh[1] += SHAPE_OVERLAY_OFFSET_Y;
      }
      if (type === 'roundedRect') {
        xywh[2] += 40;
      }
      return xywh;
    case ShapeType.Capsule:
      xywh[2] += 50;
      return xywh;
    default:
      return xywh;
  }
}
