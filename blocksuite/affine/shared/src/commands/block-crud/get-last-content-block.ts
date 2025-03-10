import type { BlockComponent, Command } from '@blocksuite/block-std';
import type { BlockModel } from '@blocksuite/store';

import { getLastNoteBlock } from '../../utils';

/**
 * Get the last content block in the document
 *
 * @param ctx - Command context
 * @param ctx.root - The root note block model
 * @param next - Next handler function
 * @returns The last content block or null
 */
export const getLastContentBlockCommand: Command<
  {
    root?: BlockModel;
  },
  {
    lastBlock: BlockComponent | null;
  }
> = (ctx, next) => {
  const noteBlock = ctx.root ?? getLastNoteBlock(ctx.std.host.doc);
  if (!noteBlock) {
    next({
      lastBlock: null,
    });
    return;
  }

  const children = noteBlock.children;
  for (let i = children.length - 1; i >= 0; i--) {
    if (children[i].role === 'content') {
      next({
        lastBlock: ctx.std.view.getBlock(children[i].id),
      });
      return;
    }
  }

  next({
    lastBlock: null,
  });
};
