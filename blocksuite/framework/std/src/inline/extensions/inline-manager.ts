import {
  createIdentifier,
  type ServiceIdentifier,
} from '@blocksuite/global/di';
import {
  type BaseTextAttributes,
  baseTextAttributes,
  type DeltaInsert,
  type ExtensionType,
} from '@blocksuite/store';
import { z } from 'zod';

import { StdIdentifier } from '../../identifier.js';
import type { BlockStdScope } from '../../scope/index.js';
import type { AttributeRenderer } from '../types.js';
import { getDefaultAttributeRenderer } from '../utils/attribute-renderer.js';
import { MarkdownMatcherIdentifier } from './markdown-matcher.js';
import type { InlineMarkdownMatch, InlineSpecs } from './type.js';

export class InlineManager<TextAttributes extends BaseTextAttributes> {
  embedChecker = (delta: DeltaInsert<TextAttributes>) => {
    for (const spec of this.specs) {
      if (spec.embed && spec.match(delta)) {
        return true;
      }
    }
    return false;
  };

  getRenderer = (): AttributeRenderer<TextAttributes> => {
    const defaultRenderer = getDefaultAttributeRenderer<TextAttributes>();

    const renderer: AttributeRenderer<TextAttributes> = props => {
      // Priority increases from front to back
      for (const spec of this.specs.toReversed()) {
        if (spec.match(props.delta)) {
          return spec.renderer(props);
        }
      }
      return defaultRenderer(props);
    };
    return renderer;
  };

  getSchema = (): z.ZodSchema => {
    const schema = this.specs.reduce<z.ZodSchema>((acc, cur) => {
      return z.intersection(acc, cur.schema);
    }, baseTextAttributes);
    return schema;
  };

  get markdownMatches(): InlineMarkdownMatch<TextAttributes>[] {
    if (!this.enableMarkdown) {
      return [];
    }
    const matches = Array.from(
      this.std.provider.getAll(MarkdownMatcherIdentifier).values()
    );
    return matches as InlineMarkdownMatch<TextAttributes>[];
  }

  readonly specs: Array<InlineSpecs<TextAttributes>>;

  constructor(
    readonly std: BlockStdScope,
    readonly enableMarkdown: boolean,
    ...specs: Array<InlineSpecs<TextAttributes>>
  ) {
    this.specs = specs;
  }
}

export type InlineManagerExtensionConfig<
  TextAttributes extends BaseTextAttributes,
> = {
  id: string;
  enableMarkdown?: boolean;
  specs: ServiceIdentifier<InlineSpecs<TextAttributes>>[];
};

const InlineManagerIdentifier = createIdentifier<unknown>(
  'AffineInlineManager'
);

export function InlineManagerExtension<
  TextAttributes extends BaseTextAttributes,
>({
  id,
  enableMarkdown = true,
  specs,
}: InlineManagerExtensionConfig<TextAttributes>): ExtensionType & {
  identifier: ServiceIdentifier<InlineManager<TextAttributes>>;
} {
  const identifier = InlineManagerIdentifier<InlineManager<TextAttributes>>(id);
  return {
    setup: di => {
      di.addImpl(identifier, provider => {
        return new InlineManager(
          provider.get(StdIdentifier),
          enableMarkdown,
          ...specs.map(spec => provider.get(spec))
        );
      });
    },
    identifier,
  };
}
