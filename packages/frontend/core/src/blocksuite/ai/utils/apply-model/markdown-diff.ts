export type Block = {
  block_id: string;
  type: string;
  content: string;
};

type NewBlock = Omit<Block, 'block_id'>;

export type PatchOp =
  | { op: 'replace'; block_id: string; new_content: string }
  | { op: 'delete'; block_id: string }
  | { op: 'insert_at'; index: number; new_block: NewBlock };

export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentBlockId: string | null = null;
  let currentType: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^<!--\s*block_id=(.*?)\s+type=(.*?)\s*-->/);
    if (match) {
      // If there is a block being collected, push it into blocks first
      if (currentBlockId && currentType) {
        blocks.push({
          block_id: currentBlockId,
          type: currentType,
          content: currentContent.join('\n').trim(),
        });
      }
      // Start a new block
      currentBlockId = match[1];
      currentType = match[2];
      currentContent = [];
    } else {
      // Collect content
      if (currentBlockId && currentType) {
        currentContent.push(line);
      }
    }
  }
  // Collect the last block
  if (currentBlockId && currentType) {
    blocks.push({
      block_id: currentBlockId,
      type: currentType,
      content: currentContent.join('\n').trim(),
    });
  }
  return blocks;
}

function diffBlockLists(oldBlocks: Block[], newBlocks: Block[]): PatchOp[] {
  const patch: PatchOp[] = [];
  const oldMap = new Map<string, { block: Block; index: number }>();
  oldBlocks.forEach((b, i) => oldMap.set(b.block_id, { block: b, index: i }));
  const newMap = new Map<string, { block: Block; index: number }>();
  newBlocks.forEach((b, i) => newMap.set(b.block_id, { block: b, index: i }));

  // Mark old blocks that have been handled
  const handledOld = new Set<string>();

  // First process newBlocks in order
  newBlocks.forEach((newBlock, newIdx) => {
    const old = oldMap.get(newBlock.block_id);
    if (old) {
      handledOld.add(newBlock.block_id);
      if (old.block.content !== newBlock.content) {
        patch.push({
          op: 'replace',
          block_id: newBlock.block_id,
          new_content: newBlock.content,
        });
      }
    } else {
      patch.push({
        op: 'insert_at',
        index: newIdx,
        new_block: {
          type: newBlock.type,
          content: newBlock.content,
        },
      });
    }
  });

  // Then process deleted oldBlocks
  oldBlocks.forEach(oldBlock => {
    if (!newMap.has(oldBlock.block_id)) {
      patch.push({
        op: 'delete',
        block_id: oldBlock.block_id,
      });
    }
  });

  return patch;
}

export function diffMarkdown(
  oldMarkdown: string,
  newMarkdown: string
): PatchOp[] {
  const oldBlocks = parseMarkdownToBlocks(oldMarkdown);
  const newBlocks = parseMarkdownToBlocks(newMarkdown);

  const patch: PatchOp[] = diffBlockLists(oldBlocks, newBlocks);

  return patch;
}
