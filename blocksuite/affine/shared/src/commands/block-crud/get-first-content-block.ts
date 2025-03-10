import type { BlockComponent, Command } from '@blocksuite/block-std';
import type { BlockModel } from '@blocksuite/store';

import { getFirstNoteBlock } from '../../utils';

/**
 * Get the first content block in the document
 *
 * @param ctx - Command context
 * @param ctx.root - The root note block model
 * @param next - Next handler function
 * @returns The first content block model or null
 */
export const getFirstContentBlockCommand: Command<
  {
    root?: BlockModel;
  },
  {
    firstBlock: BlockComponent | null;
  }
> = (ctx, next) => {
  const doc = ctx.std.host.doc;
  const noteBlock = ctx.root ?? getFirstNoteBlock(doc);
  if (!noteBlock) {
    next({
      firstBlock: null,
    });
    return;
  }

  for (const child of noteBlock.children) {
    if (child.role === 'content') {
      next({
        firstBlock: ctx.std.view.getBlock(child.id),
      });
      return;
    }
  }

  next({
    firstBlock: null,
  });
};
