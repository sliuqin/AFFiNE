import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { computed, effect, signal } from '@preact/signals-core';
import { css } from 'lit';
import { property } from 'lit/decorators.js';

import { renderUniLit } from '../../../../core';
import type {
  CellRenderProps,
  DataViewCellLifeCycle,
} from '../../../../core/property';
import type { SingleView } from '../../../../core/view-manager/single-view';
import {
  TableViewAreaSelection,
  type TableViewSelectionWithType,
} from '../../selection';
import type { VirtualTableView } from '../table-view';
import type { TableGridCell } from '../types';
import { rowSelectedBg } from './row-header.css';
export class DatabaseCellContainer extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    affine-database-virtual-cell-container {
      display: flex;
      align-items: start;
      width: 100%;
      border: none;
      outline: none;
      box-sizing: content-box;
    }

    affine-database-virtual-cell-container * {
      box-sizing: border-box;
    }

    affine-database-virtual-cell-container uni-lit > *:first-child {
      padding: 6px;
    }
  `;

  private readonly _cell = signal<DataViewCellLifeCycle>();

  cell$ = computed(() => {
    return this.view.cellGet(this.rowId, this.columnId);
  });

  selectCurrentCell = (editing: boolean) => {
    if (this.view.readonly$.value) {
      return;
    }
    const selectionView = this.selectionView;
    if (selectionView) {
      const selection = selectionView.selection;
      if (selection && this.isSelected(selection) && editing) {
        selectionView.selection = TableViewAreaSelection.create({
          groupKey: this.groupKey,
          focus: {
            rowIndex: this.rowIndex$.value,
            columnIndex: this.columnIndex$.value,
          },
          isEditing: true,
        });
      } else {
        selectionView.selection = TableViewAreaSelection.create({
          groupKey: this.groupKey,
          focus: {
            rowIndex: this.rowIndex$.value,
            columnIndex: this.columnIndex$.value,
          },
          isEditing: false,
        });
      }
    }
  };

  get cell(): DataViewCellLifeCycle | undefined {
    return this._cell.value;
  }

  private get selectionView() {
    return this.tableView?.selectionController;
  }

  get rowSelected$() {
    return this.gridCell.row.data.selected$;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.disposables.addFromEvent(this.parentElement, 'click', () => {
      if (!this.isEditing$.value) {
        this.selectCurrentCell(!this.column$.value?.readonly$.value);
      }
    });
    this.disposables.addFromEvent(this.parentElement, 'mouseenter', () => {
      this.gridCell.data.hover$.value = true;
    });
    this.disposables.addFromEvent(this.parentElement, 'mouseleave', () => {
      this.gridCell.data.hover$.value = false;
    });
    this.disposables.add(
      effect(() => {
        const rowSelected = this.rowSelected$.value;
        if (rowSelected) {
          this.parentElement?.classList.add(rowSelectedBg);
        } else {
          this.parentElement?.classList.remove(rowSelectedBg);
        }
      })
    );
    const style = this.parentElement?.style;
    if (style) {
      style.borderBottom = '1px solid var(--affine-border-color)';
      style.borderRight = '1px solid var(--affine-border-color)';
    }
  }

  isRowSelected$ = computed(() => {
    const selection = this.selectionView?.selection;
    if (selection?.selectionType !== 'row') {
      return false;
    }
    return selection.rows.some(row => row.id === this.rowId);
  });

  isSelected(selection: TableViewSelectionWithType) {
    if (selection.selectionType !== 'area') {
      return false;
    }
    if (selection.groupKey !== this.groupKey) {
      return;
    }
    if (selection.focus.columnIndex !== this.columnIndex$.value) {
      return;
    }
    return selection.focus.rowIndex === this.rowIndex$.value;
  }

  override render() {
    const renderer = this.column$.value?.renderer$.value;
    if (!renderer) {
      return;
    }
    const { view } = renderer;
    this.view.lockRows(this.isEditing$.value);
    this.dataset['editing'] = `${this.isEditing$.value}`;
    const props: CellRenderProps = {
      cell: this.cell$.value,
      isEditing$: this.isEditing$,
      selectCurrentCell: this.selectCurrentCell,
    };

    return renderUniLit(view, props, {
      ref: this._cell,
      style: {
        display: 'contents',
      },
    });
  }
  isEditing$ = signal(false);

  rowIndex$ = computed(() => {
    return this.gridCell.rowIndex$.value;
  });

  columnIndex$ = computed(() => {
    return this.gridCell.columnIndex$.value - 1;
  });

  column$ = computed(() => {
    return this.view.properties$.value.find(
      property => property.id === this.columnId
    );
  });

  get rowId() {
    return this.gridCell.row.rowId;
  }

  get columnId() {
    return this.gridCell.columnId;
  }

  get groupKey() {
    return this.gridCell.row.group.groupId;
  }

  @property({ attribute: false })
  accessor gridCell!: TableGridCell;

  @property({ attribute: false })
  accessor view!: SingleView;

  @property({ attribute: false })
  accessor tableView!: VirtualTableView;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-database-virtual-cell-container': DatabaseCellContainer;
  }
}
