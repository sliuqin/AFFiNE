import {
  menu,
  popFilterableSimpleMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import { WithDisposable } from '@blocksuite/global/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { computed } from '@preact/signals-core';
import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { GroupTitle } from '../../../../../core/group-by/group-title';
import { TableViewAreaSelection } from '../../../selection';
import type { VirtualTableView } from '../../table-view';
import type { GridGroup } from '../../virtual/virtual-scroll';
import * as styles from './group-header.css';
export class TableGroupHeader extends WithDisposable(ShadowlessElement) {
  @property({ attribute: false })
  accessor tableView!: VirtualTableView;

  @property({ attribute: false })
  accessor gridGroup!: GridGroup;

  override connectedCallback(): void {
    super.connectedCallback();
    this.classList.add(styles.groupHeader);
  }

  group$ = computed(() => {
    return this.tableView.groupTrait$.value?.groupsDataList$.value?.find(
      g => g.key === this.gridGroup.groupId
    );
  });

  groupKey$ = computed(() => {
    return this.group$.value?.key;
  });

  get tableViewManager() {
    return this.tableView.props.view;
  }

  get selectionController() {
    return this.tableView.selectionController;
  }

  private readonly clickAddRowInStart = () => {
    const group = this.group$.value;
    if (!group) {
      return;
    }
    this.tableViewManager.rowAdd('start', group.key);
    const selectionController = this.selectionController;
    selectionController.selection = undefined;
    requestAnimationFrame(() => {
      const index = this.tableViewManager.properties$.value.findIndex(
        v => v.type$.value === 'title'
      );
      selectionController.selection = TableViewAreaSelection.create({
        groupKey: group.key,
        focus: {
          rowIndex: 0,
          columnIndex: index,
        },
        isEditing: true,
      });
    });
  };

  private readonly clickGroupOptions = (e: MouseEvent) => {
    const group = this.group$.value;
    if (!group) {
      return;
    }
    const ele = e.currentTarget as HTMLElement;
    popFilterableSimpleMenu(popupTargetFromElement(ele), [
      menu.action({
        name: 'Ungroup',
        hide: () => group.value == null,
        select: () => {
          group.rows.forEach(id => {
            group.manager.removeFromGroup(id, group.key);
          });
        },
      }),
      menu.action({
        name: 'Delete Cards',
        select: () => {
          this.tableViewManager.rowDelete(group.rows);
        },
      }),
    ]);
  };

  private readonly renderGroupHeader = () => {
    const group = this.group$.value;
    if (!group) {
      return null;
    }
    return html`
      <div
        style="position: sticky;left: 0;width: max-content;padding: 6px 0;margin-bottom: 4px;display:flex;align-items:center;gap: 12px;max-width: 400px"
      >
        ${GroupTitle(group, {
          readonly: this.tableViewManager.readonly$.value,
          clickAdd: this.clickAddRowInStart,
          clickOps: this.clickGroupOptions,
        })}
      </div>
    `;
  };

  override render() {
    return html`
      ${this.renderGroupHeader()}
      <virtual-table-header
        .tableViewManager="${this.tableViewManager}"
      ></virtual-table-header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtual-table-group-header': TableGroupHeader;
  }
}
