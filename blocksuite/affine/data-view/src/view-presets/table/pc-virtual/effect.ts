import { DatabaseCellContainer } from './cell.js';
import { DragToFillElement } from './controller/drag-to-fill.js';
import { SelectionElement } from './controller/selection.js';
import { TableGroup } from './group.js';
import { DatabaseColumnHeader } from './header/column-header.js';
import { DataViewColumnPreview } from './header/column-move-preview.js';
import { DatabaseNumberFormatBar } from './header/number-format-bar.js';
import { DatabaseHeaderColumn } from './header/single-column-header.js';
import { TableVerticalIndicator } from './header/vertical-indicator.js';
import { TableRow } from './row/row.js';
import { RowSelectCheckbox } from './row/row-select-checkbox.js';
import { VirtualDataBaseColumnStats } from './stats/column-stats-bar.js';
import { VirtualDatabaseColumnStatsCell } from './stats/column-stats-column.js';
import { VirtualTableView } from './table-view.js';
import { VirtualElementWrapper } from './virtual/virtual-cell.js';

export function pcVirtualEffects() {
  customElements.define('affine-virtual-table', VirtualTableView);
  customElements.define('affine-data-view-virtual-table-group', TableGroup);
  customElements.define(
    'affine-database-virtual-cell-container',
    DatabaseCellContainer
  );
  customElements.define(
    'affine-database-virtual-column-header',
    DatabaseColumnHeader
  );
  customElements.define(
    'affine-data-view-virtual-column-preview',
    DataViewColumnPreview
  );
  customElements.define(
    'affine-database-virtual-header-column',
    DatabaseHeaderColumn
  );
  customElements.define(
    'affine-database-virtual-number-format-bar',
    DatabaseNumberFormatBar
  );
  customElements.define('data-view-virtual-table-row', TableRow);
  customElements.define('virtual-row-select-checkbox', RowSelectCheckbox);
  customElements.define('data-view-virtual-table-selection', SelectionElement);
  customElements.define('data-view-virtual-drag-to-fill', DragToFillElement);
  customElements.define(
    'data-view-virtual-table-vertical-indicator',
    TableVerticalIndicator
  );
  customElements.define('virtual-element-wrapper', VirtualElementWrapper);
  customElements.define(
    'affine-database-virtual-column-stats',
    VirtualDataBaseColumnStats
  );
  customElements.define(
    'affine-database-virtual-column-stats-cell',
    VirtualDatabaseColumnStatsCell
  );
}
