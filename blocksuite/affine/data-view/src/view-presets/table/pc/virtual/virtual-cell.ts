import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { effect, signal } from '@preact/signals-core';
import { cssVarV2 } from '@toeverything/theme/v2';
import { property } from 'lit/decorators.js';
import { ref } from 'lit/directives/ref.js';
import { html } from 'lit/static-html.js';

import { renderUniLit } from '../../../../core/index.js';
import type { SingleView } from '../../../../core/view-manager/single-view.js';
import type { TableColumn } from '../../table-view-manager.js';
import * as styles from './virtual-cell.css.js';
import type { GridCell } from './virtual-scroll.js';

export class VirtualCell extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  @property({ attribute: false })
  accessor column!: TableColumn;

  @property({ attribute: false })
  accessor rowId!: string;

  @property({ attribute: false })
  accessor gridCell!: GridCell;

  @property({ attribute: false })
  accessor view!: SingleView;

  ref$ = signal<HTMLElement | undefined>(undefined);

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.position = 'absolute';
    this.disposables.add(
      effect(() => {
        this.style.left = `${this.gridCell.left$.value}px`;
        this.style.top = `${this.gridCell.top$.value}px`;
        const hasTopBorder = this.gridCell.rowIndex !== 0;
        const hasLeftBorder = this.gridCell.columnIndex !== 0;
        this.style.width = `${this.gridCell.width$.value + (hasLeftBorder ? 1 : 0)}px`;
        this.style.height = `${this.gridCell.row.height$.value + (hasTopBorder ? 1 : 0)}px`;
        this.style.borderTop = hasTopBorder
          ? `1px solid ${cssVarV2.database.border}`
          : 'none';
        this.style.borderLeft = hasLeftBorder
          ? `1px solid ${cssVarV2.database.border}`
          : 'none';
      })
    );
    this.disposables.add(
      effect(() => {
        const div = this.ref$.value;
        if (div) {
          const resizeObserver = new ResizeObserver(() => {
            this.gridCell.updateHeight(div.clientHeight);
          });
          resizeObserver.observe(div);
          return () => {
            resizeObserver.disconnect();
          };
        }
      })
    );
  }
  override render() {
    if (!this.gridCell.isVisible$.value) {
      return null;
    }
    const cell = this.column.cellGet(this.rowId);
    const view = this.column.renderer$.value?.view;
    if (!view) {
      return html`<div class="${styles.cellContent}">No renderer</div>`;
    }

    return html`
      <div ${ref(this.ref$)} class="${styles.cell}">
        ${renderUniLit(view, {
          cell,
          isEditing$: signal(false),
          selectCurrentCell: () => {},
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtual-table-cell': VirtualCell;
  }
}
