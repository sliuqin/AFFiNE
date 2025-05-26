import { getAttachmentFileIcon } from '@blocksuite/affine-components/icons';
import { AttachmentBlockSchema } from '@blocksuite/affine-model';
import {
  CitationProvider,
  CitationRendererExtension,
} from '@blocksuite/affine-shared/services';
import { html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { when } from 'lit/directives/when.js';

import type { AttachmentBlockComponent } from './attachment-block';

export const AttachmentCitationRendererExtension = CitationRendererExtension(
  AttachmentBlockSchema.model.flavour,
  (block: AttachmentBlockComponent, content: unknown) => {
    const citationService = block.std.get(CitationProvider);
    const isCitation = citationService.isCitationModel(block.model);
    return when(
      isCitation,
      () => {
        const { selected$, containerStyleMap, onClick, model, filetype } =
          block;
        const { name, footnoteIdentifier } = model.props;
        const fileTypeIcon = getAttachmentFileIcon(filetype);

        return html`
          <div
            class=${classMap({
              'affine-attachment-container': true,
              focused: selected$.value,
            })}
            style=${containerStyleMap}
          >
            <affine-citation-card
              .icon=${fileTypeIcon}
              .citationTitle=${name}
              .citationIdentifier=${footnoteIdentifier ?? ''}
              .onClickCallback=${onClick}
              .active=${selected$.value}
            ></affine-citation-card>
          </div>
        `;
      },
      () => content
    );
  }
);
