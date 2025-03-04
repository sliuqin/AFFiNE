import { propertyType, t } from '@blocksuite/affine/blocks';
export type FileCellType = Record<
  string,
  {
    id: string;
    name: string;
    order: string;
  }
>;
export const fileColumnType = propertyType('file');

export const filePropertyModelConfig = fileColumnType.modelConfig<FileCellType>(
  {
    name: 'File',
    type: () => t.richText.instance(),
    defaultData: () => ({}),
    cellToString: ({ value }) =>
      Object.values(value)
        ?.map(v => v.name)
        .join(',') ?? '',
    cellFromString: () => {
      return {
        value: undefined,
      };
    },
    cellToJson: ({ value }) => {
      if (!value) return null;
      return Object.values(value).map(v => v.name);
    },
    cellFromJson: () => undefined,
    isEmpty: ({ value }) => value == null,
  }
);
