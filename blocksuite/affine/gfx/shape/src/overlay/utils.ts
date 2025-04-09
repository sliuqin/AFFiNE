import type { Options } from '@blocksuite/affine-block-surface';
import {
  shapeMethods,
  type ShapeName,
  ShapeType,
} from '@blocksuite/affine-model';
import { Bound, type XYWH } from '@blocksuite/global/gfx';

export const drawGeneralShape = (
  ctx: CanvasRenderingContext2D,
  type: ShapeName,
  xywh: XYWH,
  options: Options
) => {
  ctx.setLineDash(options.strokeLineDash ?? []);
  ctx.strokeStyle = options.stroke ?? 'transparent';
  ctx.lineWidth = options.strokeWidth ?? 2;
  ctx.fillStyle = options.fill ?? 'transparent';

  ctx.beginPath();

  const bound = Bound.fromXYWH(xywh);
  switch (type) {
    case ShapeType.Rect:
      shapeMethods.rect.draw(ctx, bound);
      break;
    case ShapeType.Triangle:
      shapeMethods.triangle.draw(ctx, bound);
      break;
    case ShapeType.Diamond:
      shapeMethods.diamond.draw(ctx, bound);
      break;
    case ShapeType.Ellipse:
      shapeMethods.ellipse.draw(ctx, bound);
      break;
    case 'roundedRect':
      drawRoundedRect(ctx, xywh);
      break;
    case ShapeType.Capsule:
      shapeMethods.capsule.draw(ctx, bound);
      break;
    default:
      throw new Error(`Unknown shape type: ${type}`);
  }

  ctx.closePath();

  ctx.fill();
  ctx.stroke();
};

function drawRoundedRect(ctx: CanvasRenderingContext2D, xywh: XYWH): void {
  const [x, y, w, h] = xywh;
  const width = w;
  const height = h;
  const radius = 0.1;
  const cornerRadius = Math.min(width * radius, height * radius);
  ctx.moveTo(x + cornerRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, cornerRadius);
  ctx.arcTo(x + width, y + height, x, y + height, cornerRadius);
  ctx.arcTo(x, y + height, x, y, cornerRadius);
  ctx.arcTo(x, y, x + width, y, cornerRadius);
}
