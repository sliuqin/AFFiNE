import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { ShapeStyle, ShapeType } from '@blocksuite/affine-model';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class TriangleShape extends Shape {
  get type() {
    return ShapeType.Triangle;
  }

  draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void {
    if (this.shapeStyle === ShapeStyle.General) {
      drawGeneralShape(ctx, this.type, this.xywh, this.options);
      return;
    }

    const [x, y, w, h] = this.xywh;
    rc.polygon(
      [
        [x + w / 2, y],
        [x, y + h],
        [x + w, y + h],
      ],
      this.options
    );
  }
}
