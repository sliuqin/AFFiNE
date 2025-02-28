import type { EmbedIframeModel } from '@blocksuite/affine-model';
import { FeatureFlagService } from '@blocksuite/affine-shared/services';
import { BlockSelection } from '@blocksuite/block-std';
import { computed, type ReadonlySignal } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

import { EmbedBlockComponent } from '../common/embed-block-element.js';
import { styles } from './style.js';

export class EmbedIframeBlockComponent extends EmbedBlockComponent<EmbedIframeModel> {
  static override styles = styles;

  open = () => {
    let link = this.model.originalUrl;
    window.open(link, '_blank');
  };

  refreshData = () => {};

  private _handleDoubleClick(event: MouseEvent) {
    event.stopPropagation();
    this.open();
  }

  private _selectBlock() {
    const selectionManager = this.host.selection;
    const blockSelection = selectionManager.create(BlockSelection, {
      blockId: this.blockId,
    });
    selectionManager.setGroup('note', [blockSelection]);
  }

  protected _handleClick(event: MouseEvent) {
    event.stopPropagation();
    this._selectBlock();
  }

  private readonly _embedIframeBlockEnabled$: ReadonlySignal = computed(() => {
    const featureFlagService = this.doc.get(FeatureFlagService);
    const flag = featureFlagService.getFlag('enable_embed_iframe_block');
    return flag ?? false;
  });

  override renderBlock() {
    if (!this._embedIframeBlockEnabled$.value) {
      return nothing;
    }

    const { iframeUrl, width, height } = this.model;
    return html`
      <div
        class="affine-embed-iframe-block"
        @click=${this._handleClick}
        @dblclick=${this._handleDoubleClick}
      >
        <iframe
          src=${ifDefined(iframeUrl)}
          width=${width ?? '100%'}
          height=${height ?? '360px'}
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    `;
  }
}
