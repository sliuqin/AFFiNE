import { computed, signal } from '@preact/signals-core';
import { html } from 'lit';

import { DataViewBase } from '../../../../core/view/data-view-base';
import type { TableViewSelectionWithType } from '../../selection';
import type { TableSingleView } from '../../table-view-manager.js';
import { VirtualCell } from './virtual-cell';
import {
  getScrollContainer,
  type GridCell,
  GridVirtualScroll,
} from './virtual-scroll.js';

export class VirtualTable extends DataViewBase<
  TableSingleView,
  TableViewSelectionWithType
> {
  get expose() {
    return {
      focusFirstCell: () => {},
      view: this.props.view,
      eventTrace: this.props.eventTrace,
      clearSelection: () => {},
    };
  }

  private virtualScroll?: GridVirtualScroll;

  override connectedCallback() {
    super.connectedCallback();
    this.yScrollContainer = getScrollContainer(this, 'y') ?? document.body;
    this.initVirtualScroll();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.virtualScroll?.dispose();
  }

  get view(): TableSingleView {
    return this.props.view;
  }

  columns$ = computed(() => {
    return this.view.properties$.value.map(property => ({
      width: property.width$.value,
    }));
  });

  groups$ = computed(() => {
    const columns = this.view.properties$.value;
    return [
      {
        rows: computed(() =>
          this.view.rows$.value.map(row => {
            return columns.map(column => {
              return (cell: GridCell) => {
                const vCell = new VirtualCell();
                vCell.gridCell = cell;
                vCell.view = this.view;
                vCell.column = column;
                vCell.rowId = row;
                return vCell;
              };
            });
          })
        ),
        top: () => document.createElement('div'),
        bottom: () => document.createElement('div'),
      },
    ];
  });

  yScrollContainer?: HTMLElement;

  private initVirtualScroll() {
    this.virtualScroll = new GridVirtualScroll({
      columns$: this.columns$,
      groups$: this.groups$,
      rowHeight$: signal(undefined),
      yScrollContainer: this.yScrollContainer,
    });
    this.virtualScroll?.init();
    this.requestUpdate();
  }

  override render() {
    return html`
      <div style="overflow-x: auto;overflow-y: visible">
        ${this.virtualScroll?.content}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-virtual-table': VirtualTable;
  }
}
