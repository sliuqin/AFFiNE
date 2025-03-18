import { ParagraphLayoutHandlerExtension } from '@blocksuite/affine/blocks/paragraph';
import {
  TurboRendererConfigFactory,
  ViewportTurboRendererExtension,
} from '@blocksuite/affine-gfx-turbo-renderer';
import { beforeEach, describe, expect, test } from 'vitest';

import { wait } from '../utils/common.js';
import { addSampleNotes } from '../utils/doc-generator.js';
import { createPainterWorker, setupEditor } from '../utils/setup.js';

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

  test('should render a note in viewport', async () => {
    console.log('=== TEST START: note count before adding ===');
    const notesBefore = document.querySelectorAll('affine-edgeless-note');
    console.log(
      'Notes before adding:',
      notesBefore.length,
      Array.from(notesBefore).map(n => n.id)
    );

    addSampleNotes(doc, 1);
    console.log('=== After addSampleNotes ===');
    console.log('Doc blocks:', doc.getBlocksByFlavour('affine:note').length);

    await wait(100);
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('=== After extended wait ===');
    const notes = document.querySelectorAll('affine-edgeless-note');
    console.log(
      'Notes after adding:',
      notes.length,
      Array.from(notes).map(n => n.id)
    );
    console.log(
      'Note parents:',
      Array.from(notes).map(n => n.parentElement?.tagName)
    );

    // 检查DOM中是否有隐藏的notes
    const allNotes = document.querySelectorAll('affine-edgeless-note');
    const visibleNotes = Array.from(allNotes).filter(n => {
      const style = window.getComputedStyle(n);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    console.log(
      'All notes vs visible notes:',
      allNotes.length,
      visibleNotes.length
    );

    expect(notes.length).toBe(1);
  });
});
