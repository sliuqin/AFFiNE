import { ArrowRightIcon, EnterIcon } from '@blocksuite/affine/components/icons';
import { WithDisposable } from '@blocksuite/affine/global/lit';
import {
  EditorHost,
  PropTypes,
  requiredProperties,
} from '@blocksuite/affine/std';
import { HoverController } from '@blocksuite/affine-components/hover';
import { flip, offset } from '@floating-ui/dom';
import { css, html, LitElement, nothing } from 'lit';
import { property, query } from 'lit/decorators.js';

import { SUBMENU_OFFSET_CROSS_AXIS, SUBMENU_OFFSET_MAIN_AXIS } from './const';
import { menuItemStyles } from './styles';
import type { AIItemConfig } from './types';

@requiredProperties({
  host: PropTypes.instanceOf(EditorHost),
  item: PropTypes.object,
})
export class AIItem extends WithDisposable(LitElement) {
  static override styles = css`
    ${menuItemStyles}
  `;

  private _hoverController: HoverController | null = null;

  private readonly _setupHoverController = () => {
    if (!this.item.subItem?.length || !this.menuItem) {
      return;
    }

    this._hoverController = new HoverController(
      this,
      ({ abortController }) => {
        const subMenuOffset = {
          mainAxis: this.item.subItemOffset?.[0] ?? SUBMENU_OFFSET_MAIN_AXIS,
          crossAxis: this.item.subItemOffset?.[1] ?? SUBMENU_OFFSET_CROSS_AXIS,
        };

        if (!this.menuItem) {
          return null;
        }
        return {
          template: html`<ai-sub-item-list
            data-testid=${this.item.testId ? this.item.testId + '-menu' : ''}
            .item=${this.item}
            .host=${this.host}
            .onClick=${this.onClick}
            .abortController=${abortController}
          ></ai-sub-item-list>`,
          computePosition: {
            referenceElement: this.menuItem,
            placement: 'right-start',
            middleware: [flip(), offset(subMenuOffset)],
            autoUpdate: true,
          },
          portalStyles: {
            zIndex: 'var(--affine-z-index-popover)',
          },
          closeOnClickAway: true,
        };
      },
      {
        allowMultiple: true,
      }
    );

    this._hoverController.setReference(this.menuItem);
    this._hoverController.onAbort = () => {
      console.log('ai-item abort');
    };
  };

  override firstUpdated() {
    if (this.item.subItem?.length) {
      this._setupHoverController();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this._hoverController) {
      this._hoverController.abort();
      this._hoverController = null;
    }
  }

  override render() {
    const { item } = this;
    const className = item.name.split(' ').join('-').toLocaleLowerCase();
    const testId = item.testId;

    return html`<div
      data-testid=${testId}
      class="menu-item ${className}"
      @pointerdown=${(e: MouseEvent) => e.stopPropagation()}
      @click=${() => {
        this.onClick?.();
        if (typeof item.handler === 'function') {
          item.handler(this.host);
        }
      }}
    >
      <span class="item-icon">${item.icon}</span>
      <div class="item-name">
        ${item.name}${item.beta
          ? html`<div class="item-beta">(Beta)</div>`
          : nothing}
      </div>
      ${item.subItem
        ? html`<span class="arrow-right-icon">${ArrowRightIcon}</span>`
        : html`<span class="enter-icon">${EnterIcon}</span>`}
    </div>`;
  }

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor item!: AIItemConfig;

  @query('.menu-item')
  accessor menuItem: HTMLDivElement | null = null;

  @property({ attribute: false })
  accessor onClick: (() => void) | undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-item': AIItem;
  }
}
