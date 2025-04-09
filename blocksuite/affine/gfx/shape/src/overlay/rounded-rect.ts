import type { RoughCanvas } from '@blocksuite/affine-block-surface';
import { type ShapeName, ShapeStyle } from '@blocksuite/affine-model';

import { Shape } from './shape';
import { drawGeneralShape } from './utils';

export class RoundedRectShape extends Shape {
  get type(): ShapeName {
    return 'roundedRect';
  }

  draw(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void {
    if (this.shapeStyle === ShapeStyle.General) {
      drawGeneralShape(ctx, this.type, this.xywh, this.options);
      return;
    }

    const [x, y, w, h] = this.xywh;
    const radius = 0.1;
    const r = Math.min(w * radius, h * radius);
    const x0 = x + r;
    const x1 = x + w - r;
    const y0 = y + r;
    const y1 = y + h - r;
    const path = `
        M${x0},${y} L${x1},${y}
        A${r},${r} 0 0 1 ${x1},${y0}
        L${x1},${y1}
        A${r},${r} 0 0 1 ${x1 - r},${y1}
        L${x0 + r},${y1}
        A${r},${r} 0 0 1 ${x0},${y1 - r}
        L${x0},${y0}
        A${r},${r} 0 0 1 ${x0 + r},${y}
      `;

    rc.path(path, this.options);
  }
}
