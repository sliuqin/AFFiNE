import { toggleEmbedCardCreateModal } from '@blocksuite/affine-components/embed-card-modal';
import { type SlashMenuConfig } from '@blocksuite/affine-widget-slash-menu';
import { LinkIcon } from '@blocksuite/icons/lit';

import { LinkTooltip } from './tooltips';

export const bookmarkSlashMenuConfig: SlashMenuConfig = {
  items: [
    {
      name: 'Link',
      description: 'Add a bookmark for reference.',
      icon: LinkIcon(),
      tooltip: {
        figure: LinkTooltip,
        caption: 'Link',
      },
      group: '4_Content & Media@2',
      when: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:bookmark'),
      action: ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        toggleEmbedCardCreateModal(
          host,
          'Links',
          'The added link will be displayed as a card view.',
          { mode: 'page', parentModel, index }
        )
          .then(() => {
            if (model.text?.length === 0) {
              model.doc.deleteBlock(model);
            }
          })
          .catch(console.error);
      },
    },
  ],
};
