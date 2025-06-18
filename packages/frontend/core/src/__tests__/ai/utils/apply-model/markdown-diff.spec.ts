import { describe, expect, test } from 'vitest';

import { diffMarkdown } from '../../../../blocksuite/ai/utils/apply-model/markdown-diff';

describe('diffMarkdown', () => {
  test('should diff block insertion', () => {
    // Only a new block is inserted
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Title
`;
    const newMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
This is a new paragraph.
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'insert_at',
        index: 1,
        new_block: {
          type: 'paragraph',
          content: 'This is a new paragraph.',
        },
      },
    ]);
  });

  test('should diff block deletion', () => {
    // A block is deleted
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
This paragraph will be deleted.
`;
    const newMd = `
<!-- block_id=block-001 type=title -->
# Title
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'delete',
        block_id: 'block-002',
      },
    ]);
  });

  test('should diff block replacement', () => {
    // Only content of a block is changed
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Old Title
`;
    const newMd = `
<!-- block_id=block-001 type=title -->
# New Title
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'replace',
        block_id: 'block-001',
        new_content: '# New Title',
      },
    ]);
  });

  test('should diff mixed changes', () => {
    // Mixed: delete, insert, replace
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
Old paragraph.

<!-- block_id=block-003 type=paragraph -->
To be deleted.
`;
    const newMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
Updated paragraph.

<!-- block_id=block-004 type=paragraph -->
New paragraph.
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'replace',
        block_id: 'block-002',
        new_content: 'Updated paragraph.',
      },
      {
        op: 'insert_at',
        index: 2,
        new_block: {
          type: 'paragraph',
          content: 'New paragraph.',
        },
      },
      {
        op: 'delete',
        block_id: 'block-003',
      },
    ]);
  });

  test('should diff consecutive block insertions', () => {
    // Two new blocks are inserted consecutively
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Title
`;
    const newMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
First inserted paragraph.

<!-- block_id=block-003 type=paragraph -->
Second inserted paragraph.
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'insert_at',
        index: 1,
        new_block: {
          type: 'paragraph',
          content: 'First inserted paragraph.',
        },
      },
      {
        op: 'insert_at',
        index: 2,
        new_block: {
          type: 'paragraph',
          content: 'Second inserted paragraph.',
        },
      },
    ]);
  });

  test('should diff consecutive block deletions', () => {
    // Two blocks are deleted consecutively
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
First paragraph to be deleted.

<!-- block_id=block-003 type=paragraph -->
Second paragraph to be deleted.
`;
    const newMd = `
<!-- block_id=block-001 type=title -->
# Title
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'delete',
        block_id: 'block-002',
      },
      {
        op: 'delete',
        block_id: 'block-003',
      },
    ]);
  });

  test('should diff deletion followed by insertion at the same position', () => {
    // A block is deleted and a new block is inserted at the end
    const oldMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-002 type=paragraph -->
This paragraph will be deleted

<!-- block_id=block-003 type=paragraph -->
HelloWorld
`;

    const newMd = `
<!-- block_id=block-001 type=title -->
# Title

<!-- block_id=block-003 type=paragraph -->
HelloWorld

<!-- block_id=block-004 type=paragraph -->
This is a new paragraph inserted after deletion.
`;
    const patch = diffMarkdown(oldMd, newMd);
    expect(patch).toEqual([
      {
        op: 'insert_at',
        index: 2,
        new_block: {
          type: 'paragraph',
          content: 'This is a new paragraph inserted after deletion.',
        },
      },
      {
        op: 'delete',
        block_id: 'block-002',
      },
    ]);
  });
});
