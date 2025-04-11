import {
  computed,
  effect,
  type ReadonlySignal,
  type Signal,
  signal,
} from '@preact/signals-core';

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
export class GridCell {
  initHeight$ = signal(false);
  element: HTMLElement;
  realHeight$ = signal(0);
  height$ = computed(
    () => this.grid.fixedRowHeight$.value ?? this.realHeight$.value
  );
  width$ = computed(
    () => this.row.grid.columns$.value[this.columnIndex]?.width ?? 0
  );
  left$ = computed(
    () => this.row.grid.columnLeft$.value[this.columnIndex] ?? 0
  );
  top$ = computed(() => this.row.top$.value);
  right$ = computed(() => this.left$.value + this.width$.value);
  bottom$ = computed(() => this.top$.value + this.height$.value);
  get rowIndex() {
    return this.row.rowIndex;
  }
  get grid() {
    return this.row.grid;
  }
  constructor(
    readonly row: GridRow,
    readonly columnIndex: number,
    getElement: (cell: GridCell) => HTMLElement
  ) {
    this.element = getElement(this);
  }

  isVisible$ = computed(() => {
    if (!this.initHeight$.value) {
      return true;
    }
    if (this.height$.value === 0) {
      return false;
    }
    const offsetLeft = this.left$.value;
    const offsetTop = this.top$.value;
    const offsetRight = this.right$.value;
    const offsetBottom = this.bottom$.value;
    const viewport = this.grid.container.viewport$.value;
    const xInView =
      offsetRight >= viewport.left && offsetLeft <= viewport.right;
    const yInView =
      offsetBottom >= viewport.top && offsetTop <= viewport.bottom;
    return xInView && yInView;
  });

  updateHeight(height: number = this.element.clientHeight) {
    if (this.isVisible$.value && height !== 0) {
      this.realHeight$.value = height;
    }
  }

  render() {
    if (!this.initHeight$.value) {
      this.grid.container.addElement(this.element);
      requestAnimationFrame(() => {
        this.initHeight$.value = true;
      });
    }
  }
}
export class GridRow {
  protected readonly disposables: (() => void)[] = [];
  cells: GridCell[];
  get grid() {
    return this.group.grid;
  }
  height$ = computed(
    () =>
      this.grid.fixedRowHeight$.value ??
      Math.max(...this.cells.map(cell => cell.height$.value))
  );

  constructor(
    readonly group: GridGroup,
    readonly top$: Signal<number>,
    readonly rowIndex: number,
    cells: Array<(cell: GridCell) => HTMLElement>
  ) {
    this.cells = cells.map((cell, index) => new GridCell(this, index, cell));
    this.listenStyleChange();
  }

  listenStyleChange() {
    this.disposables.push(
      effect(() => {
        this.updateHeights();
      })
    );
  }
  render() {
    for (const cell of this.cells) {
      cell.render();
    }
  }

  updateHeights() {
    for (const cell of this.cells) {
      cell.updateHeight();
    }
  }
  dispose() {
    this.disposables.forEach(disposable => disposable());
  }
}
export class GridGroup {
  rows$ = computed(() =>
    this.rowElements$.value.map((row, index) => {
      const top$ = computed(() => this.rowTops$.value[index] ?? 0);
      return new GridRow(this, top$, index, row);
    })
  );
  topNode: {
    element: HTMLElement;
    height$: Signal<number>;
  };
  bottomNode: {
    element: HTMLElement;
    height$: Signal<number>;
  };
  rowTops$ = computed(() => {
    const tops: number[] = [];
    let top = 0;
    for (const row of this.rows$.value) {
      tops.push(top);
      top += row.height$.value;
    }
    return tops;
  });
  render() {
    this.grid.container.addElement(this.topNode.element);
    this.grid.container.addElement(this.bottomNode.element);
    for (const row of this.rows$.value) {
      row.render();
    }
  }
  rowsHeight$ = computed(() => {
    const lastTop = this.rowTops$.value[this.rowTops$.value.length - 1] ?? 0;
    const lastHeight =
      this.rows$.value[this.rows$.value.length - 1]?.height$.value ?? 0;
    return lastTop + lastHeight;
  });
  height$ = computed(
    () =>
      this.topNode.height$.value +
      this.bottomNode.height$.value +
      this.rowsHeight$.value
  );

  constructor(
    readonly grid: GridVirtualScroll,
    private readonly rowElements$: ReadonlySignal<
      Array<Array<(cell: GridCell) => HTMLElement>>
    >,
    top: (group: GridGroup) => HTMLElement,
    bottom: (group: GridGroup) => HTMLElement
  ) {
    this.topNode = {
      element: top(this),
      height$: signal(0),
    };
    this.bottomNode = {
      element: bottom(this),
      height$: signal(0),
    };
  }

  updateHeights() {
    this.rows$.value.forEach(row => {
      row.updateHeights();
    });
    this.topNode.height$.value = this.topNode.element.clientHeight;
    this.bottomNode.height$.value = this.bottomNode.element.clientHeight;
  }
}

export interface GridVirtualScrollOptions extends VirtualScrollOptions {
  columns$: ReadonlySignal<{ width: number }[]>;
  rowHeight$: ReadonlySignal<number | undefined>;
  groups$: ReadonlySignal<
    {
      top: (group: GridGroup) => HTMLElement;
      bottom: (group: GridGroup) => HTMLElement;
      rows: ReadonlySignal<Array<Array<(cell: GridCell) => HTMLElement>>>;
    }[]
  >;
}

export class GridVirtualScroll extends VirtualScroll {
  groups$ = computed(() => {
    return this.options.groups$.value.map(
      group => new GridGroup(this, group.rows, group.top, group.bottom)
    );
  });
  get columns$() {
    return this.options.columns$;
  }
  cellHeightCache = new WeakMap<HTMLElement, number>();

  get fixedRowHeight$() {
    return this.options.rowHeight$;
  }

  columnLeft$ = computed(() => {
    const columns = this.options.columns$.value;
    const lefts: number[] = [];
    let left = 0;
    for (const column of columns) {
      lefts.push(left);
      left += column.width;
    }
    return lefts;
  });

  totalWidth$ = computed(() => {
    const lastLeft =
      this.columnLeft$.value[this.columnLeft$.value.length - 1] ?? 0;
    const lastWidth =
      this.options.columns$.value[this.options.columns$.value.length - 1]
        ?.width ?? 0;
    return lastLeft + lastWidth;
  });

  totalHeight$ = computed(() => {
    const groups = this.groups$.value;
    return groups.reduce((acc, group) => {
      return acc + group.height$.value;
    }, 0);
  });

  render() {
    for (const group of this.groups$.value) {
      group.render();
    }
  }

  get content() {
    return this.container.content;
  }

  constructor(private readonly options: GridVirtualScrollOptions) {
    super(options);
    this.render();
    this.listenSizeChange();
  }

  private listenSizeChange() {
    this.disposables.push(
      effect(() => {
        this.container.updateContentSize(
          this.totalWidth$.value,
          this.totalHeight$.value
        );
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
      left: this.scrollLeft$.value - 100,
      top: this.scrollTop$.value - 400,
      right: this.scrollLeft$.value + this.xScrollContainerWidth$.value,
      bottom: this.scrollTop$.value + this.yScrollContainerHeight$.value,
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

  addElement(element: HTMLElement) {
    this.content.append(element);
  }

  removeElement(element: HTMLElement) {
    element.remove();
  }

  dispose() {
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

  private updateTotalSize() {
    let totalHeight = 0;
    if (typeof this.itemHeight === 'number') {
      totalHeight = this.itemHeight * this.itemCount;
    } else {
      for (let i = 0; i < this.itemCount; i++) {
        totalHeight += this.itemHeight(i);
      }
    }
    this.container.updateContentSize(
      this.container.xScrollContainerWidth$.value,
      totalHeight
    );
  }
}
