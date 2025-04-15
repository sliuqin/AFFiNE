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
  readonly element: HTMLElement;
  private readonly realHeight$ = signal<number>();
  readonly contentHeight$ = computed(() => {
    return this.realHeight$.value;
  });
  readonly height$ = computed(
    () => this.grid.fixedRowHeight$.value ?? this.contentHeight$.value
  );
  readonly width$ = computed(
    () => this.row.grid.columns$.value[this.columnIndex]?.width ?? 0
  );
  readonly left$ = computed(
    () => this.row.grid.columnLeft$.value[this.columnIndex] ?? 0
  );
  readonly top$ = computed(() => this.row.top$.value);
  readonly right$ = computed(() => this.left$.value + this.width$.value);
  readonly bottom$ = computed(
    () => this.top$.value + (this.height$.value ?? 0)
  );

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

  checkRender() {
    const isVisible = this.isVisible$.value;
    if (isVisible) {
      if (!this.element.isConnected) {
        this.grid.container.addElement(this.element);
      }
    } else {
      if (this.element.isConnected) {
        this.grid.container.removeElement(this.element);
      }
    }
    return isVisible;
  }

  updateHeight(height: number = this.element.clientHeight) {
    this.realHeight$.value = height;
  }

  // render() {
  //     if (this.renderStatus$.value === 'noInit') {
  //         this.renderStatus$.value = 'rendering';
  //         this.grid.container.addElement(this.element);
  //         requestAnimationFrame(() => {
  //             this.renderStatus$.value = 'done';
  //         });
  //     }
  // }
}

export class GridRow {
  protected readonly disposables: (() => void)[] = [];
  cells: GridCell[];

  get grid() {
    return this.group.grid;
  }

  top$ = computed(() => {
    return this.group.rowTops$.value[this.rowIndex]?.value ?? 0;
  });

  height$ = computed(() => {
    const fixedRowHeight = this.grid.fixedRowHeight$.value;
    if (fixedRowHeight != null) {
      return fixedRowHeight;
    }
    const cells = this.cells
      .map(cell => cell.height$.value)
      .filter(v => v != null);
    if (cells.length > 0) {
      return Math.max(...cells);
    }
    return 32;
  });

  constructor(
    readonly group: GridGroup,
    readonly rowIndex: number,
    cells: Array<(cell: GridCell) => HTMLElement>
  ) {
    this.cells = cells.map((cell, index) => new GridCell(this, index, cell));
  }

  updateHeights() {
    for (const cell of this.cells) {
      cell.updateHeight();
    }
  }

  checkRender() {
    let preVisible = false;
    for (const cell of this.cells) {
      const isVisible = cell.checkRender();
      if (preVisible && !isVisible) {
        return true;
      }
      preVisible = isVisible;
    }
    return preVisible;
  }

  dispose() {
    this.disposables.forEach(disposable => disposable());
  }
}

export class GridGroup {
  rows$ = computed(() =>
    this.rowElements$.value.map((row, index) => {
      return new GridRow(this, index, row);
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
    const tops: ReadonlySignal<number>[] = [];
    const length = this.rows$.value.length;
    for (let i = 0; i < length; i++) {
      const top = computed(() => {
        const prevTop = tops[i - 1]?.value ?? 0;
        const prevHeight = this.rows$.value[i - 1]?.height$.value ?? 0;
        return prevTop + prevHeight;
      });
      tops.push(top);
    }
    return tops;
  });

  rowsHeight$ = computed(() => {
    const lastTop =
      this.rowTops$.value[this.rowTops$.value.length - 1]?.value ?? 0;
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

  checkRender() {
    const rows = this.rows$.value;
    let preVisible = false;
    for (const row of rows) {
      const isVisible = row.checkRender();
      if (preVisible && !isVisible) {
        return true;
      }
      preVisible = isVisible;
    }
    return preVisible;
  }
}

export interface GridVirtualScrollOptions extends VirtualScrollOptions {
  columns$: ReadonlySignal<
    {
      width: number;
    }[]
  >;
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
  init() {
    this.container.init();
    this.listenScroll();
    this.listenSizeChange();
  }

  groups$ = computed(() => {
    return this.options.groups$.value.map(
      group => new GridGroup(this, group.rows, group.top, group.bottom)
    );
  });

  get columns$() {
    return this.options.columns$;
  }

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
  lastLeft$ = computed(() => {
    return this.columnLeft$.value[this.columnLeft$.value.length - 1];
  });

  lastWidth$ = computed(() => {
    return this.options.columns$.value[this.options.columns$.value.length - 1]
      ?.width;
  });

  totalWidth$ = computed(() => {
    const lastLeft = this.lastLeft$.value ?? 0;
    const lastWidth = this.lastWidth$.value ?? 0;
    return lastLeft + lastWidth;
  });

  totalHeight$ = computed(() => {
    const groups = this.groups$.value;
    return groups.reduce((acc, group) => {
      return acc + group.height$.value;
    }, 0);
  });

  get content() {
    return this.container.content;
  }

  constructor(private readonly options: GridVirtualScrollOptions) {
    super(options);
  }

  checkRender() {
    const groups = this.groups$.value;
    let preVisible = false;
    for (const group of groups) {
      const isVisible = group.checkRender();
      if (preVisible && !isVisible) {
        return true;
      }
      preVisible = isVisible;
    }
    return preVisible;
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

  private listenScroll() {
    this.disposables.push(
      effect(() => {
        this.checkRender();
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
    console.log('addElement');
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

  private updateTotalSize() {}
}
