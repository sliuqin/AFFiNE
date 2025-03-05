import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import { propertyType, t } from '@blocksuite/data-view';
import type { DeltaInsert } from '@blocksuite/inline';
import { Text } from '@blocksuite/store';
import * as Y from 'yjs';
import zod from 'zod';

import { HostContextKey } from '../../context/host-context.js';
import { isLinkedDoc } from '../../utils/title-doc.js';

export const richTextColumnType = propertyType('rich-text');
export type RichTextCellType = Text | Text['yText'];
export const toYText = (text?: RichTextCellType): undefined | Text['yText'] => {
  if (text instanceof Text) {
    return text.yText;
  }
  return text;
};

export const richTextPropertyModelConfig = richTextColumnType.modelConfig({
  name: 'Text',
  valueSchema: zod
    .custom<RichTextCellType>(
      data => data instanceof Text || data instanceof Y.Text
    )
    .optional(),
  type: () => t.richText.instance(),
  defaultData: () => ({}),
  cellToString: ({ value }) => value?.toString() ?? '',
  cellFromString: ({ value }) => {
    return {
      value: new Text(value),
    };
  },
  cellToJson: ({ value, dataSource }) => {
    if (!value) return null;
    const host = dataSource.contextGet(HostContextKey);
    if (host) {
      const collection = host.std.workspace;
      const yText = toYText(value);
      const deltas = yText?.toDelta();
      const text = deltas
        .map((delta: DeltaInsert<AffineTextAttributes>) => {
          if (isLinkedDoc(delta)) {
            const linkedDocId = delta.attributes?.reference?.pageId as string;
            return collection.getDoc(linkedDocId)?.meta?.title;
          }
          return delta.insert;
        })
        .join('');
      return text;
    }
    return value?.toString() ?? null;
  },
  cellFromJson: ({ value }) =>
    typeof value !== 'string' ? undefined : new Text(value),
  onUpdate: ({ value, callback }) => {
    const yText = toYText(value);
    yText?.observe(callback);
    callback();
    return {
      dispose: () => {
        yText?.unobserve(callback);
      },
    };
  },
  isEmpty: ({ value }) => value == null || value.length === 0,
  values: ({ value }) => (value?.toString() ? [value.toString()] : []),
});
