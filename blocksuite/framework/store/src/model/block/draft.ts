import type { BlockModel } from './block-model.js';

type PropsInDraft = 'version' | 'flavour' | 'role' | 'id' | 'keys' | 'text';

type ModelProps<Model> = Model extends BlockModel<infer U> ? U : never;

export type DraftModel<Model extends BlockModel = BlockModel> = Pick<
  Model,
  PropsInDraft
> & {
  children: DraftModel[];
} & ModelProps<Model>;

export function toDraftModel<Model extends BlockModel = BlockModel>(
  origin: Model
): DraftModel<Model> {
  const { id, version, flavour, role, keys, text, children } = origin;

  // Process props data
  let props: ModelProps<Model>;

  // Check if it's a flat data structure (has _props property)
  if ('_props' in origin && origin._props) {
    // Flat data structure, get directly from _props
    props = Object.entries(origin._props).reduce((acc, [key, value]) => {
      return {
        ...acc,
        [key]: value,
      };
    }, {} as ModelProps<Model>);
  } else {
    // Non-flat data structure, get through keys array
    props = origin.keys.reduce((acc, key) => {
      return {
        ...acc,
        [key]: origin[key as keyof Model],
      };
    }, {} as ModelProps<Model>);
  }

  return {
    id,
    version,
    flavour,
    role,
    keys,
    text,
    children: children.map(toDraftModel),
    ...props,
  } as DraftModel<Model>;
}
