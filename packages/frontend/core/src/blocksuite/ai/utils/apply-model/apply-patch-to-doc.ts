import type { Store } from '@blocksuite/store';

import { insertFromMarkdown } from '../../../utils';
import type { PatchOp } from './markdown-diff';

/**
 * Apply a list of PatchOp to the page doc (children of the first note block)
 * @param doc The page document Store
 * @param patch Array of PatchOp
 */
export async function applyPatchToDoc(
  doc: Store,
  patch: PatchOp[]
): Promise<void> {
  // Get all note blocks
  const notes = doc.getBlocksByFlavour('affine:note');
  if (notes.length === 0) return;
  // Only handle the first note block
  const note = notes[0].model;

  // Build a map from block_id to BlockModel for quick lookup
  const blockIdMap = new Map<string, any>();
  note.children.forEach(child => {
    blockIdMap.set(child.id, child);
  });

  for (const op of patch) {
    if (op.op === 'delete') {
      // Delete block
      doc.deleteBlock(op.block_id);
    } else if (op.op === 'replace') {
      // Replace block: delete then insert
      const oldBlock = blockIdMap.get(op.block_id);
      if (!oldBlock) continue;
      const parentId = note.id;
      const index = note.children.findIndex(child => child.id === op.block_id);
      if (index === -1) continue;
      doc.deleteBlock(op.block_id);
      // Insert new content
      await insertFromMarkdown(undefined, op.new_content, doc, parentId, index);
    } else if (op.op === 'insert_at') {
      // Insert new block
      const parentId = note.id;
      const index = op.index;
      await insertFromMarkdown(
        undefined,
        op.new_block.content,
        doc,
        parentId,
        index
      );
    }
  }
}
