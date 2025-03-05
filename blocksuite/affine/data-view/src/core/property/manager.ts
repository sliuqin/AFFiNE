import type { UniComponent } from '@blocksuite/affine-shared/types';
import type { ReadonlySignal } from '@preact/signals-core';

import type { Cell } from '../view-manager/cell.js';

export interface CellRenderProps<
  Data extends NonNullable<unknown> = NonNullable<unknown>,
  Value = unknown,
> {
  cell: Cell<Value, Data>;
  isEditing$: ReadonlySignal<boolean>;
  selectCurrentCell: (editing: boolean) => void;
}

export interface DataViewCellLifeCycle {
  beforeEnterEditMode(): boolean;
  beforeExitEditingMode(): void;

  afterEnterEditingMode(): void;

  focusCell(): boolean;

  blurCell(): boolean;

  forceUpdate(): void;
}

export type DataViewCellComponent<
  Data extends NonNullable<unknown> = NonNullable<unknown>,
  Value = unknown,
> = UniComponent<CellRenderProps<Data, Value>, DataViewCellLifeCycle>;

export type CellRenderer<
  Data extends NonNullable<unknown> = NonNullable<unknown>,
  Value = unknown,
> = {
  view: DataViewCellComponent<Data, Value>;
  edit?: DataViewCellComponent<Data, Value>;
};
