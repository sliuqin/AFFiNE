import { WidgetComponent, WidgetViewExtension } from '@blocksuite/affine/std';
import { html } from 'lit';
import { literal, unsafeStatic } from 'lit/static-html.js';

export const AFFINE_BLOCK_DIFF_WIDGET = 'affine-block-diff-widget';

export class AffineBlockDiffWidget extends WidgetComponent {
  override render() {
    const attached = this.block?.blockId;
    return html`<div
      class="ai-panel-container"
      data-testid="ai-panel-container"
    >
        <h1>Block Diff</h1>
    </div>`;
  }
}

export const blockDiffWidget = WidgetViewExtension(
  'affine:paragraph',
  AFFINE_BLOCK_DIFF_WIDGET,
  literal`${unsafeStatic(AFFINE_BLOCK_DIFF_WIDGET)}`
);
