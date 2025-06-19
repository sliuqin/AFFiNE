import { createIdentifier } from '@blocksuite/global/di';
import type { PatchOp } from '../utils/apply-model/markdown-diff';

interface DiffMap {
  // removed blocks
  deletes: string[];
  // inserted blocks
  // key is the start block id, value is the blocks(markdowns) inserted
  inserts: Record<string, string[]>;
  // updated blocks
  // key is the block id, value is the block(markdown)
  updates: Record<string, string>;
}

export interface BlockDiffService {
  /**
   * Set the patches to the block diffs
   * @param patches - The patches to set.
   * @returns The diff map.
   */
  setPatches(patches: PatchOp[]): DiffMap;
}

export const BlockDiffService = createIdentifier<BlockDiffService>(
  'AffineBlockDiffService'
);

export class BlockDiffServiceImpl implements BlockDiffService {
  setPatches(patches: PatchOp[]): DiffMap {
    const diffMap: DiffMap = {
      deletes: [],
      inserts: {},
      updates: {},
    };

    for (const patch of patches) {
      switch (patch.op) {
        case 'delete':
          diffMap.deletes.push(patch.block_id);
          break;
        case 'insert_at':
          diffMap.inserts[patch.new_block.id] = [patch.new_block.content];
          break;
        case 'replace':
          diffMap.updates[patch.block_id] = patch.new_content;
          break;
      }
    }

    return diffMap;
  }
}
