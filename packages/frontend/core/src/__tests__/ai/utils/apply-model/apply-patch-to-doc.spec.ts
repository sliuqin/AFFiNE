/**
 * @vitest-environment happy-dom
 */
import { affine } from '@blocksuite/affine-shared/test-utils';
import { describe, expect, it } from 'vitest';

import { applyPatchToDoc } from '../../../../blocksuite/ai/utils/apply-model/apply-patch-to-doc';
import type { PatchOp } from '../../../../blocksuite/ai/utils/apply-model/markdown-diff';

describe('applyPatchToDoc', () => {
  it('should delete a block', async () => {
    const host = affine`
    <affine-page id="page">
      <affine-note id="note">
        <affine-paragraph id="paragraph-1">Hello</affine-paragraph>
        <affine-paragraph id="paragraph-2">World</affine-paragraph>
      </affine-note>
    </affine-page>
  `;

    const patch: PatchOp[] = [{ op: 'delete', block_id: 'paragraph-1' }];
    await applyPatchToDoc(host.store, patch);

    const expected = affine`
      <affine-page id="page">
        <affine-note id="note">
          <affine-paragraph id="paragraph-2">World</affine-paragraph>
        </affine-note>
      </affine-page>
    `;

    expect(host.store).toEqualDoc(expected.store);
  });

  it('should replace a block', async () => {
    const host = affine`
    <affine-page id="page">
      <affine-note id="note">
        <affine-paragraph id="paragraph-1">Hello</affine-paragraph>
        <affine-paragraph id="paragraph-2">World</affine-paragraph>
      </affine-note>
    </affine-page>
  `;

    const patch: PatchOp[] = [
      {
        op: 'replace',
        block_id: 'paragraph-1',
        new_content: 'New content',
      },
    ];

    await applyPatchToDoc(host.store, patch);

    const expected = affine`
      <affine-page id="page">
        <affine-note id="note">
          <affine-paragraph id="paragraph-1">New content</affine-paragraph>
          <affine-paragraph id="paragraph-2">World</affine-paragraph>
        </affine-note>
      </affine-page>
    `;

    expect(host.store).toEqualDoc(expected.store);
  });

  it('should insert a block at index', async () => {
    const host = affine`
    <affine-page id="page">
      <affine-note id="note">
        <affine-paragraph id="paragraph-1">Hello</affine-paragraph>
        <affine-paragraph id="paragraph-2">World</affine-paragraph>
      </affine-note>
    </affine-page>
  `;

    const patch: PatchOp[] = [
      {
        op: 'insert_at',
        index: 2,
        new_block: { type: 'affine:paragraph', content: 'Inserted' },
      },
    ];

    await applyPatchToDoc(host.store, patch);

    const expected = affine`
      <affine-page id="page">
        <affine-note id="note">
          <affine-paragraph id="paragraph-1">Hello</affine-paragraph>
          <affine-paragraph id="paragraph-2">World</affine-paragraph>
          <affine-paragraph id="paragraph-3">Inserted</affine-paragraph>
        </affine-note>
      </affine-page>
    `;

    expect(host.store).toEqualDoc(expected.store);
  });
});
