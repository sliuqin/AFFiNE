import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { ShapeType } from '@blocksuite/affine-model';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class CapsuleShape extends Shape {
  get type() {
    return ShapeType.Capsule;
  }

  draw(ctx: CanvasRenderingContext2D, _: RoughCanvas): void {
    drawGeneralShape(ctx, this.type, this.xywh, this.options);
  }
}
