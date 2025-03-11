/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

import { getFirstContentBlockCommand } from '../../../commands/block-crud/get-first-content-block';
import { affine } from '../../helpers/affine-template';

describe('commands/block-crud', () => {
  describe('getFirstContentBlockCommand', () => {
    it('should return null when root is not provided and no note block exists', () => {
      const host = affine`<affine-page></affine-page>`;

      const [_, { firstBlock }] = host.command.exec(
        getFirstContentBlockCommand,
        {
          root: undefined,
          std: {
            host,
          } as any,
        }
      );

      expect(firstBlock).toBeNull();
    });

    it('should return first content block when found', () => {
      const host = affine`
        <affine-page>
          <affine-note id="note-1">
            <affine-paragraph id="paragraph-1">First Paragraph</affine-paragraph>
            <affine-paragraph id="paragraph-2">Second Paragraph</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const [_, { firstBlock }] = host.command.exec(
        getFirstContentBlockCommand,
        {
          root: undefined,
        }
      );

      expect(firstBlock?.id).toBe('paragraph-1');
    });

    it('should return null when no content blocks are found in children', () => {
      const host = affine`
        <affine-page>
          <affine-note id="note-1">
          </affine-note>
        </affine-page>
      `;

      const [_, { firstBlock }] = host.command.exec(
        getFirstContentBlockCommand,
        {}
      );

      expect(firstBlock).toBeNull();
    });

    it('should return first content block within specified root subtree', () => {
      const host = affine`
        <affine-page>
          <affine-note id="note-1">
            <affine-paragraph id="paragraph-1-1">1-1 Paragraph</affine-paragraph>
            <affine-paragraph id="paragraph-1-2">1-2 Paragraph</affine-paragraph>
          </affine-note>
          <affine-note id="note-2">
            <affine-paragraph id="paragraph-2-1">2-1 Paragraph</affine-paragraph>
            <affine-paragraph id="paragraph-2-2">2-2 Paragraph</affine-paragraph>
          </affine-note>
        </affine-page>
      `;

      const noteBlock = host.doc.getBlock('note-2')?.model;

      const [_, { firstBlock }] = host.command.exec(
        getFirstContentBlockCommand,
        {
          root: noteBlock,
        }
      );

      expect(firstBlock?.id).toBe('paragraph-2-1');
    });
  });
});
