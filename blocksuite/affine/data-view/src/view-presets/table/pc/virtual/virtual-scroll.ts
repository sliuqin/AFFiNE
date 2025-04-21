import {
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
} from '@preact/signals-core';

import { VirtualElementWrapper } from './virtual-cell';

export interface Disposable {
  dispose(): void;
}

export class CacheManager<K, V extends Disposable> {
  constructor(readonly keyToString: (key: K) => string) {}
  protected readonly cache = new Map<string, V>();

  getOrCreate(key: K, create: () => V): V {
    const stringKey = this.keyToString(key);
    let value = this.cache.get(stringKey);
    if (!value) {
      value = create();
      this.cache.set(stringKey, value);
    }
    return value;
  }

  has(key: K): boolean {
    return this.cache.has(this.keyToString(key));
  }

  delete(key: K): void {
    const value = this.cache.get(this.keyToString(key));
    if (value) {
      value.dispose();
      this.cache.delete(this.keyToString(key));
    }
  }

  clear(): void {
    for (const value of this.cache.values()) {
      value.dispose();
    }
    this.cache.clear();
  }

  cleanup(activeKeys: Set<string>): void {
    for (const [key, value] of this.cache) {
      if (!activeKeys.has(key)) {
        value.dispose();
        this.cache.delete(key);
      }
    }
  }
}

export abstract class VirtualScroll {
  protected readonly disposables: (() => void)[] = [];
  readonly container: VirtualScrollContainer;

  constructor(containerOptions: VirtualScrollOptions) {
    this.container = new VirtualScrollContainer(containerOptions);
  }

  dispose() {
    this.container.dispose();
    this.disposables.forEach(disposable => disposable());
  }
}

export class GridCell implements Disposable {
  protected readonly disposables: (() => void)[] = [];
  readonly element: HTMLElement;

  readonly columnIndex$ = computed(() => {
    return this.row.grid.columns$.value.findIndex(
      column => column.id === this.columnId
    );
  });

  private readonly realHeight$ = signal<number>();
  readonly contentHeight$ = computed(() => {
    return this.realHeight$.value;
  });
  readonly height$ = computed(
    () => this.grid.fixedRowHeight$.value ?? this.contentHeight$.value
  );
  readonly width$ = computed(
    () => this.row.grid.columns$.value[this.columnIndex$.value]?.width ?? 0
  );
  readonly left$ = computed(
    () => this.row.grid.columnLeft$.value[this.columnIndex$.value] ?? 0
  );
  readonly top$ = computed(() => this.row.top$.value);
  readonly right$ = computed(() => this.left$.value + this.width$.value);
  readonly bottom$ = computed(() => {
    const top = this.top$.value;
    if (top == null) {
      return;
    }
    const height = this.height$.value;
    if (height == null) {
      return;
    }
    return top + height;
  });

  get rowIndex$() {
    return this.row.rowIndex$;
  }

  get grid() {
    return this.row.grid;
  }

  constructor(
    readonly row: GridRow,
    readonly columnId: string,
    createElement: (cell: GridCell) => HTMLElement
  ) {
    const element = new VirtualElementWrapper();
    element.rect = {
      left$: this.left$,
      top$: this.top$,
      width$: this.width$,
      height$: this.row.height$,
    };
    element.updateHeight = height => this.updateHeight(height);
    element.element = createElement(this);
    this.element = element;
    this.disposables.push(
      effect(() => {
        this.checkRender();
      })
    );
  }

  dispose() {
    this.grid.container.removeElement(this.element, 1, true);
    this.disposables.forEach(disposable => disposable());
  }

  isVisible$ = computed(() => {
    const height = this.realHeight$.value;
    if (height == null) {
      return true;
    }
    const offsetTop = this.top$.value;
    if (offsetTop == null) {
      return false;
    }
    const offsetBottom = this.bottom$.value;
    if (offsetBottom == null) {
      return false;
    }
    const offsetLeft = this.left$.value;
    const offsetRight = this.right$.value;
    const viewport = this.grid.container.viewport$.value;
    const xInView =
      offsetRight >= viewport.left && offsetLeft <= viewport.right;
    const yInView =
      offsetBottom >= viewport.top && offsetTop <= viewport.bottom;
    const isVisible = xInView && yInView;
    // console.log('isVisible',
    //   isVisible,
    //   this.rowIndex$.value,
    //   this.columnIndex$.value,
    //   xInView,
    //   yInView,
    //   {
    //     viewportLeft: viewport.left,
    //     viewportRight: viewport.right,
    //     viewportTop: viewport.top,
    //     viewportBottom: viewport.bottom,
    //     top: offsetTop,
    //     bottom: offsetBottom,
    //     left: offsetLeft,
    //     right: offsetRight
    //   });
    return isVisible;
  });

  checkRender() {
    const isVisible = this.isVisible$.value;
    if (isVisible) {
      if (!this.row.group.init) {
        this.grid.container.addElement(this.element, 0, true);
      } else {
        this.grid.container.addElement(this.element, 1);
      }
    } else {
      this.grid.container.removeElement(this.element, 1, true);
    }
    return isVisible;
  }

  updateHeight(height: number = this.element.clientHeight) {
    if (this.realHeight$.value == null) {
      // console.log('init height', this.rowIndex$.value, this.columnIndex$.value, height)
    }
    this.realHeight$.value = height;
  }
}

export class GridRow implements Disposable {
  protected readonly disposables: (() => void)[] = [];
  cells$ = computed(() => {
    return this.grid.columns$.value.map(column => {
      return this.grid.getOrCreateCell(this, column.id);
    });
  });

  rowIndex$ = computed(() => {
    return this.group.rows$.value.findIndex(row => row.rowId === this.rowId);
  });

  get grid() {
    return this.group.grid;
  }

  top$ = computed(() => {
    return this.group.rowTops$.value[this.rowIndex$.value]?.value;
  });

  height$ = computed(() => {
    const fixedRowHeight = this.grid.fixedRowHeight$.value;
    if (fixedRowHeight != null) {
      return fixedRowHeight;
    }
    const cells = this.cells$.value
      .map(cell => cell.height$.value)
      .filter(v => v != null);
    if (cells.length > 0) {
      return Math.max(...cells);
    }
    return;
  });

  constructor(
    readonly group: GridGroup,
    readonly rowId: string
  ) {}

  dispose() {
    this.disposables.forEach(disposable => disposable());
  }
}

export class GridGroup implements Disposable {
  protected readonly disposables: (() => void)[] = [];
  rows$ = computed(() => {
    const group = this.grid.options.groups$.value.find(
      g => g.id === this.groupId
    );
    if (!group) {
      return [];
    }
    return group.rows.map(rowId => {
      return this.grid.getOrCreateRow(this, rowId);
    });
  });

  groupIndex$ = computed(() => {
    return this.grid.groups$.value.findIndex(
      group => group.groupId === this.groupId
    );
  });

  top$ = computed(() => {
    return this.grid.groupTops$.value[this.groupIndex$.value]?.value;
  });

  topNodeBottom$ = computed(() => {
    const top = this.top$.value;
    if (top == null) {
      return;
    }
    const height = this.topNode.height$.value;
    if (height == null) {
      return;
    }
    return top + height;
  });

  topNode: {
    element: HTMLElement;
    height$: Signal<number | undefined>;
  };
  bottomNode: {
    element: HTMLElement;
    height$: Signal<number | undefined>;
  };

  checkRender() {
    const isTopVisible = this.isTopVisible$.value;
    if (isTopVisible) {
      if (!this.init) {
        this.grid.container.addElement(this.topNode.element, 0, true);
      } else {
        this.grid.container.addElement(this.topNode.element, 1);
      }
    } else {
      this.grid.container.removeElement(this.topNode.element, 1, true);
    }
    const isBottomVisible = this.isBottomVisible$.value;
    if (isBottomVisible) {
      if (!this.init) {
        this.grid.container.addElement(this.bottomNode.element, 0, true);
      } else {
        this.grid.container.addElement(this.bottomNode.element, 1);
      }
    } else {
      this.grid.container.removeElement(this.bottomNode.element, 1, true);
    }
  }

  isTopVisible$ = computed(() => {
    const height = this.topNode.height$.value;
    if (height == null) {
      return true;
    }
    const top = this.top$.value;
    if (top == null) {
      return false;
    }
    const bottom = this.rowsBottom$.value ?? top + height;
    const groupInView =
      top < this.grid.container.viewport$.value.bottom &&
      bottom > this.grid.container.viewport$.value.top;
    return groupInView;
  });

  isBottomVisible$ = computed(() => {
    const height = this.bottomNode.height$.value;
    if (height == null) {
      return true;
    }
    const top = this.bottomNodeTop$.value;
    if (top == null) {
      return false;
    }
    const bottom = top + height;
    const groupInView =
      top < this.grid.container.viewport$.value.bottom &&
      bottom > this.grid.container.viewport$.value.top;
    return groupInView;
  });

  rowTops$ = computed(() => {
    const tops: ReadonlySignal<number | undefined>[] = [];
    const rows = this.rows$.value;
    const length = rows.length;
    for (let i = 0; i < length; i++) {
      const top = computed(() => {
        const isFirst = i === 0;
        if (isFirst) {
          return this.topNodeBottom$.value;
        }
        const prevTop = tops[i - 1]?.value;
        if (prevTop == null) {
          return;
        }
        const prevHeight = rows[i - 1]?.height$.value;
        if (prevHeight == null) {
          return;
        }
        return prevTop + prevHeight;
      });
      tops.push(top);
    }
    return tops;
  });

  rowsBottom$ = computed(() => {
    const tops = this.rowTops$.value;
    const lastIndex = tops.findLastIndex(v => v?.value != null);
    if (lastIndex === -1) {
      return 0;
    }
    const lastTop = tops[lastIndex]?.value ?? 0;
    const lastHeight = this.rows$.value[lastIndex]?.height$?.value ?? 0;
    return lastTop + lastHeight;
  });

  get bottomNodeTop$() {
    return this.rowsBottom$;
  }

  height$ = computed(() => {
    const rowsBottom = this.rowsBottom$.value;
    if (rowsBottom == null) {
      return;
    }
    const bottomNodeHeight = this.bottomNode.height$?.value ?? 0;
    return rowsBottom + bottomNodeHeight;
  });

  bottom$ = computed(() => {
    const rowsBottom = this.rowsBottom$.value;
    if (rowsBottom == null) {
      return;
    }
    const bottomNodeHeight = this.bottomNode.height$?.value;
    if (bottomNodeHeight == null) {
      return;
    }
    return rowsBottom + bottomNodeHeight;
  });

  init = false;

  constructor(
    readonly grid: GridVirtualScroll,
    readonly groupId: string,
    top: (group: GridGroup) => HTMLElement,
    bottom: (group: GridGroup) => HTMLElement
  ) {
    const topNodeHeight$ = signal<number | undefined>();
    const topElement = new VirtualElementWrapper();
    topElement.rect = {
      left$: signal(0),
      top$: this.top$,
      width$: signal(),
      height$: topNodeHeight$,
    };
    topElement.element = top(this);
    topElement.updateHeight = height => {
      topNodeHeight$.value = height;
    };
    this.topNode = {
      element: topElement,
      height$: topNodeHeight$,
    };
    const bottomNodeHeight$ = signal<number | undefined>();
    const bottomElement = new VirtualElementWrapper();
    bottomElement.rect = {
      left$: signal(0),
      top$: this.bottomNodeTop$,
      width$: signal(),
      height$: bottomNodeHeight$,
    };
    bottomElement.element = bottom(this);
    bottomElement.updateHeight = height => {
      console.log('update bottom height', height);
      bottomNodeHeight$.value = height;
    };
    this.bottomNode = {
      element: bottomElement,
      height$: bottomNodeHeight$,
    };
    this.disposables.push(
      effect(() => {
        this.checkRender();
      })
    );
    this.rows$.value.forEach(row => {
      row.cells$.value;
    });
    this.init = true;
  }

  dispose() {
    this.grid.container.removeElement(this.topNode.element, 1, true);
    this.grid.container.removeElement(this.bottomNode.element, 1, true);
    this.disposables.forEach(disposable => disposable());
  }
}

export interface GridGroupData {
  id: string;
  rows: string[];
}

export interface GridVirtualScrollOptions extends VirtualScrollOptions {
  columns$: ReadonlySignal<
    {
      id: string;
      width: number;
    }[]
  >;
  fixedRowHeight$: ReadonlySignal<number | undefined>;
  createGroup: {
    top: (group: GridGroup) => HTMLElement;
    bottom: (group: GridGroup) => HTMLElement;
  };
  createCell: (cell: GridCell) => HTMLElement;
  groups$: ReadonlySignal<GridGroupData[]>;
}

export class GridVirtualScroll extends VirtualScroll {
  readonly cellsCache = new CacheManager<
    { groupId: string; columnId: string; rowId: string },
    GridCell
  >(cell => `${cell.groupId}-${cell.rowId}-${cell.columnId}`);
  readonly rowsCache = new CacheManager<
    { groupId: string; rowId: string },
    GridRow
  >(row => `${row.groupId}-${row.rowId}`);
  readonly groupsCache = new CacheManager<string, GridGroup>(
    groupId => groupId
  );

  readonly groups$ = computed(() => {
    return this.options.groups$.value.map(group => {
      return this.getOrCreateGroup(group.id);
    });
  });

  constructor(readonly options: GridVirtualScrollOptions) {
    super(options);
  }

  getOrCreateRow(group: GridGroup, rowId: string): GridRow {
    return this.rowsCache.getOrCreate({ groupId: group.groupId, rowId }, () => {
      return new GridRow(group, rowId);
    });
  }

  getOrCreateCell(row: GridRow, columnId: string): GridCell {
    return this.cellsCache.getOrCreate(
      { groupId: row.group.groupId, rowId: row.rowId, columnId },
      () => {
        return new GridCell(row, columnId, this.options.createCell);
      }
    );
  }

  getOrCreateGroup(groupId: string): GridGroup {
    return this.groupsCache.getOrCreate(groupId, () => {
      return new GridGroup(
        this,
        groupId,
        this.options.createGroup.top,
        this.options.createGroup.bottom
      );
    });
  }

  private listenDataChange() {
    this.disposables.push(
      effect(() => {
        const activeGroupIds = new Set<string>();
        const activeRowIds = new Set<string>();
        const activeCellIds = new Set<string>();

        for (const group of this.options.groups$.value) {
          activeGroupIds.add(group.id);
          for (const rowId of group.rows) {
            const rowKey = this.rowsCache.keyToString({
              groupId: group.id,
              rowId,
            });
            activeRowIds.add(rowKey);
            for (const column of this.options.columns$.value) {
              const cellKey = this.cellsCache.keyToString({
                groupId: group.id,
                rowId,
                columnId: column.id,
              });
              activeCellIds.add(cellKey);
            }
          }
        }

        this.cellsCache.cleanup(activeCellIds);
        this.rowsCache.cleanup(activeRowIds);
        this.groupsCache.cleanup(activeGroupIds);
        // this.container.batchTaskManager.clean();
      })
    );
  }

  groupTops$ = computed(() => {
    const tops: ReadonlySignal<number | undefined>[] = [];
    const rows = this.groups$.value;
    const length = rows.length;
    for (let i = 0; i < length; i++) {
      const top = computed(() => {
        const isFirst = i === 0;
        if (isFirst) {
          return 0;
        }
        const prevTop = tops[i - 1]?.value;
        if (prevTop == null) {
          return;
        }
        const prevHeight = rows[i - 1]?.height$.value;
        if (prevHeight == null) {
          return;
        }
        return prevTop + prevHeight;
      });
      tops.push(top);
    }
    return tops;
  });

  totalHeight$ = computed(() => {
    const lastGroupIndex = this.groups$.value.findLastIndex(
      group => group.top$.value != null
    );
    if (lastGroupIndex === -1) {
      return 0;
    }
    const lastGroupTop = this.groupTops$.value[lastGroupIndex]?.value;
    if (lastGroupTop == null) {
      return;
    }
    const lastGroupHeight =
      this.groups$.value[this.groups$.value.length - 1]?.height$.value;
    if (lastGroupHeight == null) {
      return;
    }
    return lastGroupTop + lastGroupHeight;
  });

  override dispose() {
    super.dispose();
    this.cellsCache.clear();
    this.rowsCache.clear();
    this.groupsCache.clear();
  }

  get columns$() {
    return this.options.columns$;
  }

  get fixedRowHeight$() {
    return this.options.fixedRowHeight$;
  }

  columnLeft$ = computed(() => {
    const columns = this.options.columns$.value;
    const lefts: number[] = [];
    let left = 0;
    for (const column of columns) {
      lefts.push(left);
      left += column.width ?? 0;
    }
    return lefts;
  });

  lastLeft$ = computed(() => {
    const lefts = this.columnLeft$.value;
    if (lefts.length === 0) {
      return 0;
    }
    return lefts[lefts.length - 1];
  });

  lastWidth$ = computed(() => {
    const columns = this.options.columns$.value;
    if (columns.length === 0) {
      return 0;
    }
    return columns[columns.length - 1]?.width ?? 0;
  });

  totalWidth$ = computed(() => {
    const lastLeft = this.lastLeft$.value ?? 0;
    const lastWidth = this.lastWidth$.value ?? 0;
    return lastLeft + lastWidth;
  });

  get content() {
    return this.container.content;
  }

  init() {
    this.container.init();
    this.listenSizeChange();
    this.listenDataChange();
  }

  private listenSizeChange() {
    this.disposables.push(
      effect(() => {
        const width = this.totalWidth$.value ?? 0;
        const height = this.totalHeight$.value ?? 0;
        this.container.updateContentSize(width, height);
      })
    );
  }
}

export interface VirtualScrollOptions {
  xScrollContainer?: HTMLElement;
  yScrollContainer?: HTMLElement;
}

export const getScrollContainer = (
  element: HTMLElement,
  direction: 'x' | 'y'
) => {
  let current: HTMLElement | null = element;
  while (current) {
    const overflow = current
      .computedStyleMap()
      .get(`overflow-${direction}`)
      ?.toString();
    if (overflow === 'auto' || overflow === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }
  return;
};

export class VirtualScrollContainer {
  private readonly options: VirtualScrollOptions;
  private xScrollContainer?: HTMLElement;
  private readonly xScrollContainerWidth$ = signal(0);
  private yScrollContainer?: HTMLElement;
  private readonly yScrollContainerHeight$ = signal(0);
  readonly content: HTMLElement = document.createElement('div');
  readonly scrollTop$ = signal(0);
  readonly scrollLeft$ = signal(0);
  private readonly disposables: (() => void)[] = [];
  readonly viewport$ = computed(() => {
    return {
      width: this.xScrollContainerWidth$.value + 200,
      height: this.yScrollContainerHeight$.value + 500,
      top: this.scrollTop$.value - 400,
      bottom: this.scrollTop$.value + this.yScrollContainerHeight$.value,
      left: this.scrollLeft$.value - 100 - 500,
      right: this.scrollLeft$.value + this.xScrollContainerWidth$.value - 500,
    };
  });

  constructor(options: VirtualScrollOptions) {
    this.options = {
      ...options,
    };
  }

  init() {
    this.content.style.position = 'relative';
    this.content.style.overflow = 'hidden';
    this.xScrollContainer =
      this.options.xScrollContainer ??
      getScrollContainer(this.content, 'x') ??
      document.body;
    this.yScrollContainer =
      this.options.yScrollContainer ??
      getScrollContainer(this.content, 'y') ??
      document.body;
    this.listenScroll();
    this.listenResize();
  }

  private listenScroll() {
    const handlerX = () => {
      this.scrollLeft$.value = this.xScrollContainer?.scrollLeft ?? 0;
    };
    const handlerY = () => {
      this.scrollTop$.value = this.yScrollContainer?.scrollTop ?? 0;
    };
    this.yScrollContainer?.addEventListener('scroll', handlerY);
    this.xScrollContainer?.addEventListener('scroll', handlerX);
    this.disposables.push(() => {
      this.yScrollContainer?.removeEventListener('scroll', handlerY);
      this.xScrollContainer?.removeEventListener('scroll', handlerX);
    });
  }

  private listenResize() {
    if (this.xScrollContainer) {
      const handlerX = () => {
        this.xScrollContainerWidth$.value =
          this.xScrollContainer?.clientWidth ?? 0;
      };
      const resizeObserver = new ResizeObserver(handlerX);
      resizeObserver.observe(this.xScrollContainer);
      this.disposables.push(() => {
        resizeObserver.disconnect();
      });
    }
    if (this.yScrollContainer) {
      const handlerY = () => {
        this.yScrollContainerHeight$.value =
          this.yScrollContainer?.clientHeight ?? 0;
      };
      const resizeObserver = new ResizeObserver(handlerY);
      resizeObserver.observe(this.yScrollContainer);
      this.disposables.push(() => {
        resizeObserver.disconnect();
      });
    }
  }
  readonly batchTaskManager = new BatchTaskManager(
    [
      {
        batchSize: 5,
        tasks: [],
      },
      {
        batchSize: 50,
        tasks: [],
      },
    ],
    50
  );
  addSet: Set<HTMLElement> = new Set();
  removeSet: Set<HTMLElement> = new Set();
  addElement(element: HTMLElement, priority: number, low = false) {
    if (this.removeSet.has(element)) {
      this.removeSet.delete(element);
    }
    if (element.isConnected) {
      return;
    }
    this.addSet.add(element);
    this.batchTaskManager.addTask(
      priority,
      () => {
        if (this.addSet.has(element) && !element.isConnected) {
          this.content.append(element);
          this.addSet.delete(element);
          return;
        } else {
          return false;
        }
      },
      low
    );
  }

  removeElement(element: HTMLElement, priority: number, low = false) {
    if (this.addSet.has(element)) {
      this.addSet.delete(element);
    }
    if (!element.isConnected) {
      return;
    }
    this.removeSet.add(element);
    this.batchTaskManager.addTask(
      priority,
      () => {
        if (this.removeSet.has(element) && element.isConnected) {
          element.remove();
          this.removeSet.delete(element);
          return;
        } else {
          return false;
        }
      },
      low
    );
  }

  dispose() {
    this.batchTaskManager.clean();
    this.disposables.forEach(disposable => disposable());
  }

  public updateContentSize(width: number, height: number) {
    this.content.style.width = `${width}px`;
    this.content.style.height = `${height}px`;
  }

  public scrollToPosition(
    x: number,
    y: number,
    behavior: ScrollBehavior = 'auto'
  ) {
    this.xScrollContainer?.scrollTo({
      left: x,
      behavior,
    });
    this.yScrollContainer?.scrollTo({
      top: y,
      behavior,
    });
  }
}

export interface ListVirtualScrollOptions extends VirtualScrollOptions {
  itemCount: number;
  itemHeight: number | ((index: number) => number);
}

export class ListVirtualScroll extends VirtualScroll {
  protected itemCount: number;
  protected itemHeight: number | ((index: number) => number);

  constructor(options: ListVirtualScrollOptions) {
    super(options);
    this.itemCount = options.itemCount;
    this.itemHeight = options.itemHeight;
    this.updateTotalSize();
  }

  private updateTotalSize() {}
}

interface Priority {
  batchSize: number;
  tasks: Array<() => void | false>;
}
class BatchTaskManager {
  constructor(
    private readonly priorityList: Priority[],
    private readonly totalBatchSize: number
  ) {}
  isRunning = false;
  addTask(priority: number, task: () => void, low = false) {
    const priorityContainer = this.priorityList[priority];
    if (priorityContainer == null) {
      return;
    }
    if (low) {
      priorityContainer.tasks.unshift(task);
    } else {
      priorityContainer.tasks.push(task);
    }
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    Promise.resolve()
      .then(() => {
        this.run();
      })
      .catch(e => {
        console.error(e);
        this.isRunning = false;
      });
  }
  run() {
    let totalBatchCount = this.totalBatchSize;
    let skipCount = 0;
    for (let i = this.priorityList.length - 1; i >= 0; i--) {
      const priority = this.priorityList[i];
      if (priority == null) {
        continue;
      }
      const tasks = priority.tasks;
      let priorityBatchCount = priority.batchSize;
      while (tasks.length) {
        if (totalBatchCount === 0 || priorityBatchCount === 0) {
          break;
        }
        const task = tasks.pop();
        if (task == null) {
          break;
        }
        if (task() !== false) {
          totalBatchCount--;
          priorityBatchCount--;
        } else {
          skipCount++;
        }
      }
    }
    if (totalBatchCount !== this.totalBatchSize) {
      console.log(
        'run task count',
        this.totalBatchSize - totalBatchCount,
        'skip count',
        skipCount
      );
      requestAnimationFrame(() => {
        this.run();
      });
    } else {
      this.isRunning = false;
    }
  }

  clean() {
    this.priorityList.forEach(priority => {
      priority.tasks = [];
    });
  }
}
