import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { ShapeStyle, ShapeType } from '@blocksuite/affine-model';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class DiamondShape extends Shape {
  get type() {
    return ShapeType.Diamond;
  }

  draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas) {
    if (this.shapeStyle === ShapeStyle.General) {
      drawGeneralShape(ctx, this.type, this.xywh, this.options);
      return;
    }

    const [x, y, w, h] = this.xywh;
    rc.polygon(
      [
        [x + w / 2, y],
        [x + w, y + h / 2],
        [x + w / 2, y + h],
        [x, y + h / 2],
      ],
      this.options
    );
  }
}
