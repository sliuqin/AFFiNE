import { toGfxBlockComponent } from '@blocksuite/std';

import { CodeBlockComponent } from './code-block.js';

export class CodeEdgelessBlockComponent extends toGfxBlockComponent(
  CodeBlockComponent
) {}

declare global {
  interface HTMLElementTagNameMap {
    'affine-edgeless-code': CodeEdgelessBlockComponent;
  }
}
