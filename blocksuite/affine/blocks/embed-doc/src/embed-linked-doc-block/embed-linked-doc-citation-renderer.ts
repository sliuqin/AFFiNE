import { EmbedLinkedDocBlockSchema } from '@blocksuite/affine-model';
import {
  CitationProvider,
  CitationRendererExtension,
} from '@blocksuite/affine-shared/services';
import { html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { when } from 'lit/directives/when.js';

import type { EmbedLinkedDocBlockComponent } from './embed-linked-doc-block';

export const EmbedLinkedDocCitationRendererExtension =
  CitationRendererExtension(
    EmbedLinkedDocBlockSchema.model.flavour,
    (block: EmbedLinkedDocBlockComponent, content: unknown) => {
      const citationService = block.std.get(CitationProvider);
      const isCitation = citationService.isCitationModel(block.model);
      return when(
        isCitation,
        () => {
          const {
            model,
            icon$,
            title$,
            selected$,
            handleClick,
            handleDoubleClick,
            blockDraggable,
            selectedStyle$,
            embedContainerStyle,
          } = block;
          const { footnoteIdentifier } = model.props;

          return html`<div
            draggable="${blockDraggable ? 'true' : 'false'}"
            class=${classMap({
              'embed-block-container': true,
              ...selectedStyle$?.value,
            })}
            style=${styleMap({
              ...embedContainerStyle,
            })}
          >
            <affine-citation-card
              .icon=${icon$.value}
              .citationTitle=${title$.value.value}
              .citationIdentifier=${footnoteIdentifier ?? ''}
              .onClickCallback=${handleClick}
              .onDoubleClickCallback=${handleDoubleClick}
              .active=${selected$.value}
            ></affine-citation-card>
          </div> `;
        },
        () => content
      );
    }
  );
