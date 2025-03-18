import {
  ParagraphBlockService,
  ParagraphBlockSpec,
} from '@blocksuite/affine/blocks/paragraph';
import { LifeCycleWatcher } from '@blocksuite/affine/std';
import type { ExtensionType } from '@blocksuite/affine/store';

class AIParagraphBlockWatcher extends LifeCycleWatcher {
  static override key = 'ai-paragraph-block-watcher';

  override mounted() {
    super.mounted();
    const service = this.std.get(ParagraphBlockService);
    service.placeholderGenerator = model => {
      if (model.props.type === 'text') {
        return "Type '/' for commands, 'space' for AI";
      }

      const placeholders = {
        h1: 'Heading 1',
        h2: 'Heading 2',
        h3: 'Heading 3',
        h4: 'Heading 4',
        h5: 'Heading 5',
        h6: 'Heading 6',
        quote: '',
      };
      return placeholders[model.props.type];
    };
  }
}

export const AIParagraphBlockSpec: ExtensionType[] = [
  ...ParagraphBlockSpec,
  AIParagraphBlockWatcher,
];
