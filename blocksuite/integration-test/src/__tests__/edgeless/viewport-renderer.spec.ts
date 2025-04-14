/**
 * Please refer to integration-test/README.md for commands to run tests.
 */
import { ParagraphLayoutHandlerExtension } from '@blocksuite/affine/blocks/paragraph';
import {
  TurboRendererConfigFactory,
  ViewportTurboRendererExtension,
} from '@blocksuite/affine-gfx-turbo-renderer';
import { beforeEach, describe, expect, test } from 'vitest';

import { wait } from '../utils/common.js';
import { addSampleNotes } from '../utils/doc-generator.js';
import {
  createPainterWorker,
  getRenderer,
  setupEditor,
} from '../utils/setup.js';

describe('viewport turbo renderer', () => {
  beforeEach(async () => {
    const cleanup = await setupEditor('edgeless', [
      ParagraphLayoutHandlerExtension,
      TurboRendererConfigFactory({
        painterWorkerEntry: createPainterWorker,
      }),
      ViewportTurboRendererExtension,
    ]);
    return cleanup;
  });

  test('should render 6 notes in viewport', async () => {
    addSampleNotes(doc, 6);
    await wait();

    const notes = document.querySelectorAll('affine-edgeless-note');
    expect(notes.length).toBe(6);
  });

  test('should access turbo renderer instance', async () => {
    const renderer = getRenderer();
    expect(renderer).toBeDefined();
    expect(renderer instanceof ViewportTurboRendererExtension).toBe(true);
    expect(renderer.canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  test('initial state should be pending', async () => {
    const renderer = getRenderer();
    expect(renderer.currentState).toBe('pending');
  });

  test('zooming should change state to zooming', async () => {
    const renderer = getRenderer();
    renderer.viewport.zooming$.next(true);
    await wait();
    expect(renderer.currentState).toBe('zooming');
    renderer.viewport.zooming$.next(false);
    await wait();
    expect(renderer.currentState).not.toBe('zooming');
  });

  test('state should become ready after rendering', async () => {
    addSampleNotes(doc, 1);
    await wait(100);
    const renderer = getRenderer();
    renderer.viewport.zooming$.next(false);
    await wait(renderer.options.debounceTime + 100);
    if (renderer.viewport.zoom <= renderer.options.zoomThreshold) {
      expect(renderer.currentState).toBe('ready');
    } else {
      expect(renderer.currentState).toBe('pending');
    }
  });

  test('invalidation should reset state to pending', async () => {
    const renderer = getRenderer();
    addSampleNotes(doc, 1);
    expect(renderer.currentState).toBe('pending');
    await wait(renderer.options.debounceTime + 500);
    expect(renderer.currentState).toBe('ready');
    addSampleNotes(doc, 1);
    await wait(100);
    expect(renderer.currentState).toBe('pending');
  });
});
