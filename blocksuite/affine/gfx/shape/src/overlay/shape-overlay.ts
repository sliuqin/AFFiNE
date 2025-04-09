import {
  type Options,
  type RoughCanvas,
  type SurfaceBlockComponent,
  ToolOverlay,
} from '@blocksuite/affine-block-surface';
import {
  type Color,
  DefaultTheme,
  type ShapeName,
  type ShapeStyle,
} from '@blocksuite/affine-model';
import { ThemeProvider } from '@blocksuite/affine-shared/services';
import { assertType } from '@blocksuite/global/utils';
import type { GfxController } from '@blocksuite/std/gfx';
import { effect } from '@preact/signals-core';

import type { ShapeTool } from '../shape-tool';
import { buildXYWHWith } from '../utils';
import { ShapeFactory } from './factory';
import type { Shape } from './shape';

export class ShapeOverlay extends ToolOverlay {
  shape: Shape;

  constructor(
    gfx: GfxController,
    type: ShapeName,
    options: Options,
    style: {
      shapeStyle: ShapeStyle;
      fillColor: Color;
      strokeColor: Color;
    }
  ) {
    super(gfx);
    const { shapeStyle, fillColor, strokeColor } = style;
    const fill = this.gfx.std
      .get(ThemeProvider)
      .getColorValue(fillColor, DefaultTheme.shapeFillColor, true);
    const stroke = this.gfx.std
      .get(ThemeProvider)
      .getColorValue(strokeColor, DefaultTheme.shapeStrokeColor, true);

    options.fill = fill;
    options.stroke = stroke;

    const xywh = buildXYWHWith(type, [this.x, this.y]);
    this.shape = ShapeFactory.createShape(type, xywh, options, shapeStyle);
    this.disposables.add(
      effect(() => {
        const currentTool = this.gfx.tool.currentTool$.value;

        if (currentTool?.toolName !== 'shape') return;

        assertType<ShapeTool>(currentTool);

        const { shapeName } = currentTool.activatedOption;
        const newOptions = {
          ...options,
        };

        const xywh = buildXYWHWith(shapeName, [this.x, this.y]);
        this.shape = ShapeFactory.createShape(
          shapeName,
          xywh,

          newOptions,
          shapeStyle
        );

        (this.gfx.surfaceComponent as SurfaceBlockComponent).refresh();
      })
    );
  }

  override render(ctx: CanvasRenderingContext2D, rc: RoughCanvas): void {
    const { globalAlpha, x, y, shape } = this;
    ctx.globalAlpha = globalAlpha;
    shape.xywh = buildXYWHWith(shape.type, [x, y]);
    shape.draw(ctx, rc);
  }
}
