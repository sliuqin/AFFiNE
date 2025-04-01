import { WithDisposable } from '@blocksuite/affine/global/lit';
import {
  EditorHost,
  PropTypes,
  requiredProperties,
} from '@blocksuite/affine/std';
import { baseTheme } from '@toeverything/theme';
import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import type { AIItemConfig, AIItemGroupConfig } from './types';

@requiredProperties({ host: PropTypes.instanceOf(EditorHost) })
export class AIItemList extends WithDisposable(LitElement) {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      font-family: ${unsafeCSS(baseTheme.fontSansFamily)};
      user-select: none;
    }
    .group-name {
      display: flex;
      padding: 4px calc(var(--item-padding, 8px) + 4px);
      align-items: center;
      color: var(--affine-text-secondary-color);
      text-align: justify;
      font-size: var(--affine-font-xs);
      font-style: normal;
      font-weight: 500;
      line-height: 20px;
      width: 100%;
      box-sizing: border-box;
    }
  `;

  private readonly _itemClassName = (item: AIItemConfig) => {
    return 'ai-item-' + item.name.split(' ').join('-').toLocaleLowerCase();
  };

  override render() {
    return html`${repeat(this.groups, group => {
      return html`
        ${group.name
          ? html`<div class="group-name">
              ${group.name.toLocaleUpperCase()}
            </div>`
          : nothing}
        ${repeat(
          group.items,
          item => item.name,
          item =>
            html`<ai-item
              .onClick=${this.onClick}
              .item=${item}
              .host=${this.host}
              class=${this._itemClassName(item)}
            ></ai-item>`
        )}
      `;
    })}`;
  }

  @property({ attribute: false })
  accessor groups: AIItemGroupConfig[] = [];

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor onClick: (() => void) | undefined = undefined;

  @property({ attribute: 'data-testid', reflect: true })
  accessor testId = 'ai-item-list';
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-item-list': AIItemList;
  }
}
