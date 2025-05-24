import {
  type Color,
  ColorScheme,
  type ShapeElementModel,
} from '@blocksuite/affine-model';
import { FeatureFlagService } from '@blocksuite/affine-shared/services';
import { requestConnectedFrame } from '@blocksuite/affine-shared/utils';
import { DisposableGroup } from '@blocksuite/global/disposable';
import {
  type Bound,
  getBoundWithRotation,
  intersects,
} from '@blocksuite/global/gfx';
import type { BlockStdScope } from '@blocksuite/std';
import type {
  GfxCompatibleInterface,
  GridManager,
  LayerManager,
  SurfaceBlockModel,
  Viewport,
} from '@blocksuite/std/gfx';
import { Subject } from 'rxjs';

import type { SurfaceElementModel } from '../element-model/base.js';
import type { DomElementRenderer } from './dom-elements/index.js';
import { DomElementRendererIdentifier } from './dom-elements/index.js';
import type { Overlay } from './overlay.js';

type EnvProvider = {
  generateColorProperty: (color: Color, fallback?: Color) => string;
  getColorScheme: () => ColorScheme;
  getColorValue: (color: Color, fallback?: Color, real?: boolean) => string;
  getPropertyValue: (property: string) => string;
  selectedElements?: () => string[];
};

type RendererOptions = {
  std: BlockStdScope;
  viewport: Viewport;
  layerManager: LayerManager;
  provider?: Partial<EnvProvider>;
  gridManager: GridManager;
  surfaceModel: SurfaceBlockModel;
};

const PLACEHOLDER_RESET_STYLES = {
  border: 'none',
  borderRadius: '0',
  boxShadow: 'none',
  opacity: '1',
};

function calculatePlaceholderRect(
  elementModel: SurfaceElementModel,
  viewportBounds: Bound,
  zoom: number
) {
  return {
    transform: elementModel.rotate ? `rotate(${elementModel.rotate}deg)` : '',
    left: `${(elementModel.x - viewportBounds.x) * zoom}px`,
    top: `${(elementModel.y - viewportBounds.y) * zoom}px`,
    width: `${elementModel.w * zoom}px`,
    height: `${elementModel.h * zoom}px`,
  };
}

function calculateFullElementRect(
  elementModel: SurfaceElementModel,
  viewportBounds: Bound,
  zoom: number
) {
  const dx = elementModel.x - viewportBounds.x;
  const dy = elementModel.y - viewportBounds.y;
  return {
    left: `${dx * zoom}px`,
    top: `${dy * zoom}px`,
  };
}

function getOpacity(elementModel: SurfaceElementModel) {
  return { opacity: `${elementModel.opacity ?? 1}` };
}

export class DomRenderer {
  private _container!: HTMLElement;

  private readonly _disposables = new DisposableGroup();

  private readonly _turboEnabled: () => boolean;

  private readonly _overlays = new Set<Overlay>();

  private _refreshRafId: number | null = null;

  private _sizeUpdatedRafId: number | null = null;

  rootElement: HTMLElement;

  private readonly _elementsMap = new Map<string, HTMLElement>();

  std: BlockStdScope;

  grid: GridManager;

  layerManager: LayerManager;

  provider: Partial<EnvProvider>;

  usePlaceholder = false;

  viewport: Viewport;

  elementsUpdated = new Subject<{
    elements: HTMLElement[];
    added: HTMLElement[];
    removed: HTMLElement[];
  }>();

  constructor(options: RendererOptions) {
    this.rootElement = document.createElement('div');
    this.rootElement.classList.add('dom-renderer-root');
    this.rootElement.style.pointerEvents = 'none';

    this.std = options.std;
    this.viewport = options.viewport;
    this.layerManager = options.layerManager;
    this.grid = options.gridManager;
    this.provider = options.provider ?? {};

    this._turboEnabled = () => {
      const featureFlagService = options.std.get(FeatureFlagService);
      return featureFlagService.getFlag('enable_turbo_renderer');
    };

    this._initViewport();
    this._watchSurface(options.surfaceModel);
  }

  private _initViewport() {
    this._disposables.add(
      this.viewport.viewportUpdated.subscribe(() => {
        this.refresh();
      })
    );

    this._disposables.add(
      this.viewport.sizeUpdated.subscribe(() => {
        if (this._sizeUpdatedRafId) return;
        this._sizeUpdatedRafId = requestConnectedFrame(() => {
          this._sizeUpdatedRafId = null;
          this._resetSize();
          this._render();
          this.refresh();
        }, this._container);
      })
    );

    this._disposables.add(
      this.viewport.zooming$.subscribe(isZooming => {
        const shouldRenderPlaceholders = this._turboEnabled() && isZooming;

        if (this.usePlaceholder !== shouldRenderPlaceholders) {
          this.usePlaceholder = shouldRenderPlaceholders;
          this.refresh();
        }
      })
    );

    this.usePlaceholder = false;
  }

  private _resetSize() {
    this.refresh();
  }

  private _renderElement(
    elementModel: SurfaceElementModel,
    domElement: HTMLElement
  ) {
    const renderFn = this.std.getOptional<DomElementRenderer>(
      DomElementRendererIdentifier(elementModel.type)
    );

    if (renderFn) {
      renderFn(elementModel, domElement, this);
    } else {
      // If no specific renderer is found (e.g., for 'shape' if the extension isn't registered,
      // or for other element types without a dedicated DOM renderer),
      // no specific DOM styling will be applied here by _renderElement.
      // Basic properties like position/size are handled in the _render loop if usePlaceholder is false.
      console.warn(
        `No DOM renderer found for element type: ${elementModel.type}`
      );
    }
  }

  private _renderOrUpdatePlaceholder(
    elementModel: SurfaceElementModel,
    viewportBounds: Bound,
    zoom: number,
    addedElements: HTMLElement[]
  ) {
    let domElement = this._elementsMap.get(elementModel.id);

    if (!domElement) {
      domElement = document.createElement('div');
      domElement.dataset.elementId = elementModel.id;
      domElement.style.position = 'absolute';
      domElement.style.backgroundColor = 'rgba(200, 200, 200, 0.5)';
      this._elementsMap.set(elementModel.id, domElement);
      this.rootElement.append(domElement);
      addedElements.push(domElement);
    }

    const geometricStyles = calculatePlaceholderRect(
      elementModel,
      viewportBounds,
      zoom
    );
    Object.assign(domElement.style, geometricStyles);
    Object.assign(domElement.style, PLACEHOLDER_RESET_STYLES);

    // Clear classes specific to shapes, if applicable
    if (elementModel.type === 'shape') {
      const shapeModel = elementModel as ShapeElementModel;
      domElement.classList.remove(`shape-${shapeModel.shapeType}`);
      domElement.classList.remove(
        `shape-style-${shapeModel.shapeStyle.toLowerCase()}`
      );
    }
  }

  private _renderOrUpdateFullElement(
    elementModel: SurfaceElementModel,
    viewportBounds: Bound,
    zoom: number,
    addedElements: HTMLElement[]
  ) {
    let domElement = this._elementsMap.get(elementModel.id);

    if (!domElement) {
      domElement = document.createElement('div');
      domElement.dataset.elementId = elementModel.id;
      domElement.style.position = 'absolute';
      domElement.style.transformOrigin = 'top left';
      this._elementsMap.set(elementModel.id, domElement);
      this.rootElement.append(domElement);
      addedElements.push(domElement);
    }

    const geometricStyles = calculateFullElementRect(
      elementModel,
      viewportBounds,
      zoom
    );
    const opacityStyle = getOpacity(elementModel);
    Object.assign(domElement.style, geometricStyles, opacityStyle);

    this._renderElement(elementModel, domElement);
  }

  private _render() {
    const { viewportBounds, zoom } = this.viewport;
    const addedElements: HTMLElement[] = [];
    const elementsToRemove: HTMLElement[] = [];

    // Step 1: Handle elements whose models are deleted from the surface
    const prevRenderedElementIds = Array.from(this._elementsMap.keys());
    for (const id of prevRenderedElementIds) {
      const modelExists = this.layerManager.layers.some(layer =>
        layer.elements.some(elem => (elem as SurfaceElementModel).id === id)
      );
      if (!modelExists) {
        const domElem = this._elementsMap.get(id);
        if (domElem) {
          domElem.remove();
          this._elementsMap.delete(id);
          elementsToRemove.push(domElem);
        }
      }
    }

    // Step 2: Render elements in the current viewport
    const elementsFromGrid = this.grid.search(viewportBounds, {
      filter: ['canvas', 'local'],
    }) as SurfaceElementModel[];
    const visibleElementIds = new Set<string>();

    for (const elementModel of elementsFromGrid) {
      const display = (elementModel.display ?? true) && !elementModel.hidden;
      if (
        display &&
        intersects(getBoundWithRotation(elementModel), viewportBounds)
      ) {
        visibleElementIds.add(elementModel.id);

        if (
          this.usePlaceholder &&
          !(elementModel as GfxCompatibleInterface).forceFullRender
        ) {
          this._renderOrUpdatePlaceholder(
            elementModel,
            viewportBounds,
            zoom,
            addedElements
          );
        } else {
          // Full render
          this._renderOrUpdateFullElement(
            elementModel,
            viewportBounds,
            zoom,
            addedElements
          );
        }
      }
    }

    // Step 3: Remove DOM elements that are in _elementsMap but were not processed in Step 2
    const currentRenderedElementIds = Array.from(this._elementsMap.keys());
    for (const id of currentRenderedElementIds) {
      if (!visibleElementIds.has(id)) {
        const domElem = this._elementsMap.get(id);
        if (domElem) {
          domElem.remove();
          this._elementsMap.delete(id);
          if (!elementsToRemove.includes(domElem)) {
            elementsToRemove.push(domElem);
          }
        }
      }
    }

    // Step 4: Notify about changes
    if (addedElements.length > 0 || elementsToRemove.length > 0) {
      this.elementsUpdated.next({
        elements: Array.from(this._elementsMap.values()),
        added: addedElements,
        removed: elementsToRemove,
      });
    }
  }

  private _watchSurface(surfaceModel: SurfaceBlockModel) {
    this._disposables.add(
      surfaceModel.elementAdded.subscribe(() => this.refresh())
    );
    this._disposables.add(
      surfaceModel.elementRemoved.subscribe(() => this.refresh())
    );
    this._disposables.add(
      surfaceModel.localElementAdded.subscribe(() => this.refresh())
    );
    this._disposables.add(
      surfaceModel.localElementDeleted.subscribe(() => this.refresh())
    );
    this._disposables.add(
      surfaceModel.localElementUpdated.subscribe(() => this.refresh())
    );

    this._disposables.add(
      surfaceModel.elementUpdated.subscribe(payload => {
        // ignore externalXYWH update cause it's updated by the renderer
        if (payload.props['externalXYWH']) return;
        this.refresh();
      })
    );
  }

  addOverlay(overlay: Overlay) {
    overlay.setRenderer(null);
    this._overlays.add(overlay);
    this.refresh();
  }

  attach(container: HTMLElement) {
    this._container = container;
    container.append(this.rootElement);

    this._resetSize();
    this.refresh();
  }

  dispose(): void {
    this._overlays.forEach(overlay => overlay.dispose());
    this._overlays.clear();
    this._disposables.dispose();

    if (this._refreshRafId) {
      cancelAnimationFrame(this._refreshRafId);
      this._refreshRafId = null;
    }
    if (this._sizeUpdatedRafId) {
      cancelAnimationFrame(this._sizeUpdatedRafId);
      this._sizeUpdatedRafId = null;
    }

    this.rootElement.remove();
    this._elementsMap.clear();
  }

  generateColorProperty(color: Color, fallback?: Color) {
    return (
      this.provider.generateColorProperty?.(color, fallback) ?? 'transparent'
    );
  }

  getColorScheme() {
    return this.provider.getColorScheme?.() ?? ColorScheme.Light;
  }

  getColorValue(color: Color, fallback?: Color, real?: boolean) {
    return (
      this.provider.getColorValue?.(color, fallback, real) ?? 'transparent'
    );
  }

  getPropertyValue(property: string) {
    return this.provider.getPropertyValue?.(property) ?? '';
  }

  refresh() {
    if (this._refreshRafId !== null) return;

    this._refreshRafId = requestConnectedFrame(() => {
      this._refreshRafId = null;
      this._render();
    }, this._container);
  }

  removeOverlay(overlay: Overlay) {
    if (!this._overlays.has(overlay)) {
      return;
    }

    this._overlays.delete(overlay);
    this.refresh();
  }
}
