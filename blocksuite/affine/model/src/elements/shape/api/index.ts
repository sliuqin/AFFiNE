import type { ShapeType } from '../../../consts/shape';
import { capsule } from './capsule';
import { diamond } from './diamond';
import { ellipse } from './ellipse';
import { rect } from './rect';
import { triangle } from './triangle';

export const shapeMethods: Record<ShapeType, typeof rect> = {
  rect,
  triangle,
  ellipse,
  diamond,
  capsule,
};
