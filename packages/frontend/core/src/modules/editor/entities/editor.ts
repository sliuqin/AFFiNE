import type { AffineEditorContainer } from '@affine/core/blocksuite/block-suite-editor';
import type { DefaultOpenProperty } from '@affine/core/components/properties';
import { PresentTool } from '@blocksuite/affine/blocks/frame';
import { DefaultTool } from '@blocksuite/affine/blocks/surface';
import type { DocTitle } from '@blocksuite/affine/fragments/doc-title';
import type { DocMode, ReferenceParams } from '@blocksuite/affine/model';
import { HighlightSelection } from '@blocksuite/affine/shared/selection';
import { DocModeProvider } from '@blocksuite/affine/shared/services';
import { GfxControllerIdentifier } from '@blocksuite/affine/std/gfx';
import type { InlineEditor } from '@blocksuite/std/inline';
import { effect } from '@preact/signals-core';
import { Entity, LiveData } from '@toeverything/infra';
import { defaults, isEqual, omit } from 'lodash-es';
import { skip } from 'rxjs';

import type { DocService } from '../../doc';
import { paramsParseOptions, preprocessParams } from '../../navigation/utils';
import type { WorkbenchView } from '../../workbench';
import type { WorkspaceService } from '../../workspace';
import { EditorScope } from '../scopes/editor';
import type { EditorSelector } from '../types';

export class Editor extends Entity {
  readonly scope = this.framework.createScope(EditorScope, {
    editor: this as Editor,
  });

  readonly mode$ = new LiveData<DocMode>('page');
  readonly selector$ = new LiveData<EditorSelector | undefined>(undefined);
  readonly doc = this.docService.doc;
  readonly isSharedMode =
    this.workspaceService.workspace.openOptions.isSharedMode;
  readonly editorContainer$ = new LiveData<AffineEditorContainer | null>(null);
  readonly defaultOpenProperty$ = new LiveData<DefaultOpenProperty | undefined>(
    undefined
  );
  workbenchView: WorkbenchView | null = null;
  scrollPosition: {
    page: number | null;
    edgeless: {
      centerX: number;
      centerY: number;
      zoom: number;
    } | null;
  } = {
    page: null,
    edgeless: null,
  };

  private readonly focusAt$ = LiveData.computed(get => {
    const selector = get(this.selector$);
    const mode = get(this.mode$);
    let id = selector?.blockIds?.[0];
    let commentId = selector?.commentId;
    let key = 'blockIds';

    if (mode === 'edgeless') {
      const elementId = selector?.elementIds?.[0];
      if (elementId) {
        id = elementId;
        key = 'elementIds';
      }
    }

    if (!id && !commentId) return null;

    return {
      id,
      key,
      mode,
      refreshKey: selector?.refreshKey,
      commentId: commentId,
    };
  });

  isPresenting$ = new LiveData<boolean>(false);

  togglePresentation() {
    const gfx = this.editorContainer$.value?.host?.std.get(
      GfxControllerIdentifier
    );
    if (!gfx) return;
    if (!this.isPresenting$.value) {
      gfx.tool.setTool(PresentTool);
    } else {
      gfx.tool.setTool(DefaultTool);
    }
  }

  setSelector(selector: EditorSelector | undefined) {
    this.selector$.next(selector);
  }

  toggleMode() {
    this.mode$.next(this.mode$.value === 'edgeless' ? 'page' : 'edgeless');
  }

  setMode(mode: DocMode) {
    this.mode$.next(mode);
  }

  setDefaultOpenProperty(defaultOpenProperty: DefaultOpenProperty | undefined) {
    this.defaultOpenProperty$.next(defaultOpenProperty);
  }

  /**
   * sync editor params with view query string
   *
   * this function will be called when editor is initialized with in a workbench view
   *
   * this won't be called in shared page.
   */
  bindWorkbenchView(view: WorkbenchView) {
    if (this.workbenchView) {
      throw new Error('already bound');
    }
    this.workbenchView = view;
    const savedScrollPosition = view.getScrollPosition() ?? null;
    if (typeof savedScrollPosition === 'number') {
      this.scrollPosition.page = savedScrollPosition;
    } else if (typeof savedScrollPosition === 'object') {
      this.scrollPosition.edgeless = savedScrollPosition;
    }

    const stablePrimaryMode = this.doc.getPrimaryMode();

    const viewParams$ = view
      .queryString$<ReferenceParams & { refreshKey?: string }>(
        paramsParseOptions
      )
      .map(preprocessParams)
      .map(params =>
        defaults(params, {
          mode: stablePrimaryMode || ('page' as DocMode),
        })
      );

    const editorParams$ = LiveData.computed(get => {
      return {
        mode: get(this.mode$),
        ...get(this.selector$),
      };
    });

    // prevent infinite loop
    let updating = false;

    const unsubscribeViewParams = viewParams$.subscribe(params => {
      if (updating) return;
      updating = true;
      // when view params changed, sync to editor
      try {
        const editorParams = editorParams$.value;
        if (params.mode !== editorParams.mode) {
          this.setMode(params.mode);
        }

        const selector = omit(params, ['mode']);
        if (!isEqual(selector, omit(editorParams, ['mode']))) {
          this.setSelector(selector);
        }
      } finally {
        updating = false;
      }
    });

    const unsubscribeEditorParams = editorParams$.subscribe(params => {
      if (updating) return;
      updating = true;
      try {
        // when editor params changed, sync to view
        if (!isEqual(params, viewParams$.value)) {
          const newQueryString: Record<string, string> = {};

          Object.entries(params).forEach(([k, v]) => {
            newQueryString[k] = Array.isArray(v) ? v.join(',') : v;
          });

          view.updateQueryString(newQueryString, { replace: true });
        }
      } finally {
        updating = false;
      }
    });

    return () => {
      this.workbenchView = null;
      unsubscribeEditorParams.unsubscribe();
      unsubscribeViewParams.unsubscribe();
    };
  }

  handleFocusAt(focusAt: {
    key: string;
    mode: DocMode;
    id?: string;
    commentId?: string;
  }) {
    const editorContainer = this.editorContainer$.value;
    if (!editorContainer) return;

    const selection = editorContainer.host?.std.selection;
    const { id, key, mode, commentId } = focusAt;

    let finalId = id;
    let finalKey = key;

    // If we have commentId but no blockId, find the block from the comment
    if (commentId && !id && editorContainer.host?.std) {
      const std = editorContainer.host.std;

      // First try to find inline commented texts
      const inlineCommentedSelections = this.findCommentedTexts(std, commentId);
      if (inlineCommentedSelections.length > 0) {
        const firstSelection = inlineCommentedSelections[0][0];
        finalId = firstSelection.from.blockId;
        finalKey = 'blockIds';
      } else {
        // Then try to find block comments
        const blockCommentedBlocks = this.findCommentedBlocks(
          std.store,
          commentId
        );
        if (blockCommentedBlocks.length > 0) {
          finalId = blockCommentedBlocks[0].id;
          finalKey = 'blockIds';
        }
      }
    }

    if (mode === this.mode$.value && finalId) {
      selection?.setGroup('scene', [
        selection?.create(HighlightSelection, {
          mode,
          [finalKey]: [finalId],
        }),
      ]);
    }
  }

  bindEditorContainer(
    editorContainer: AffineEditorContainer,
    docTitle?: DocTitle | null,
    scrollViewport?: HTMLElement | null
  ) {
    if (this.editorContainer$.value) {
      throw new Error('already bound');
    }

    this.editorContainer$.next(editorContainer);
    const unsubs: (() => void)[] = [];

    const gfx = editorContainer.host?.std.get(GfxControllerIdentifier);

    // ----- Scroll Position and Selection -----
    // if we have default scroll position, we should restore it
    if (this.mode$.value === 'page' && this.scrollPosition.page !== null) {
      scrollViewport?.scrollTo(0, this.scrollPosition.page);
    } else if (
      this.mode$.value === 'edgeless' &&
      this.scrollPosition.edgeless &&
      gfx
    ) {
      gfx.viewport.setViewport(this.scrollPosition.edgeless.zoom, [
        this.scrollPosition.edgeless.centerX,
        this.scrollPosition.edgeless.centerY,
      ]);
    } else {
      // if we don't have default scroll position, we should focus on the title
      const initialFocusAt = this.focusAt$.value;

      if (initialFocusAt === null) {
        const title = docTitle?.querySelector<
          HTMLElement & { inlineEditor: InlineEditor | null }
        >('rich-text');
        // Only focus on the title when it's empty on mobile edition.
        if (BUILD_CONFIG.isMobileEdition) {
          const titleText = this.doc.title$.value;
          if (!titleText?.length) {
            title?.inlineEditor?.focusEnd();
          }
        } else {
          title?.inlineEditor?.focusEnd();
        }
      } else {
        this.handleFocusAt(initialFocusAt);
      }
    }

    // update scroll position when scrollViewport scroll
    const saveScrollPosition = () => {
      if (this.mode$.value === 'page' && scrollViewport) {
        this.scrollPosition.page = scrollViewport.scrollTop;
        this.workbenchView?.setScrollPosition(scrollViewport.scrollTop);
      } else if (this.mode$.value === 'edgeless' && gfx) {
        const pos = {
          centerX: gfx.viewport.centerX,
          centerY: gfx.viewport.centerY,
          zoom: gfx.viewport.zoom,
        };
        this.scrollPosition.edgeless = pos;
        this.workbenchView?.setScrollPosition(pos);
      }
    };
    scrollViewport?.addEventListener('scroll', saveScrollPosition);
    unsubs.push(() => {
      scrollViewport?.removeEventListener('scroll', saveScrollPosition);
    });
    if (gfx) {
      const subscription =
        gfx.viewport.viewportUpdated.subscribe(saveScrollPosition);
      unsubs.push(subscription.unsubscribe.bind(subscription));
    }

    // update selection when focusAt$ changed
    const subscription = this.focusAt$
      .distinctUntilChanged(
        (a, b) =>
          a?.id === b?.id &&
          a?.key === b?.key &&
          a?.refreshKey === b?.refreshKey
      )
      .pipe(skip(1))
      .subscribe(anchor => {
        if (!anchor) return;
        this.handleFocusAt(anchor);
      });
    unsubs.push(subscription.unsubscribe.bind(subscription));

    // ----- Presenting -----
    const std = editorContainer.host?.std;
    const editorMode = std?.get(DocModeProvider)?.getEditorMode();
    if (!editorMode || editorMode !== 'edgeless' || !gfx) {
      this.isPresenting$.next(false);
    } else {
      this.isPresenting$.next(
        gfx.tool.currentToolName$.peek() === 'frameNavigator'
      );

      const disposable = effect(() => {
        this.isPresenting$.next(
          gfx.tool.currentToolName$.value === 'frameNavigator'
        );
      });
      unsubs.push(disposable);
    }

    return () => {
      this.editorContainer$.next(null);
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }

  constructor(
    private readonly docService: DocService,
    private readonly workspaceService: WorkspaceService
  ) {
    super();
  }

  private findCommentedTexts(std: any, commentId: string) {
    const selections: any[] = [];
    std.store.getAllModels().forEach((model: any) => {
      // Try to get inline editor for the model
      // This is a simplified version - in practice you'd need proper imports
      const inlineEditor = model.text?.yText
        ? {
            yTextLength: model.text.yText.length,
            mapDeltasInInlineRange: (_range: any, callback: any) => {
              const deltas = model.text.yText.toDelta();
              deltas.forEach((delta: any, index: number) => {
                callback(delta, index);
              });
            },
          }
        : null;

      if (!inlineEditor) return;

      inlineEditor.mapDeltasInInlineRange(
        {
          index: 0,
          length: inlineEditor.yTextLength,
        },
        (delta: any, rangeIndex: number) => {
          if (
            delta.attributes &&
            Object.keys(delta.attributes).some(
              (key: string) => key === `comment-${commentId}`
            )
          ) {
            selections.push([
              {
                from: {
                  blockId: model.id,
                  index: rangeIndex,
                  length: delta.insert?.length || 0,
                },
                to: null,
              },
              inlineEditor,
            ]);
          }
        }
      );
    });

    return selections;
  }

  private findCommentedBlocks(store: any, commentId: string) {
    return store.getAllModels().filter((block: any) => {
      return (
        'comments' in block.props &&
        typeof block.props.comments === 'object' &&
        block.props.comments !== null &&
        commentId in block.props.comments
      );
    });
  }
}
