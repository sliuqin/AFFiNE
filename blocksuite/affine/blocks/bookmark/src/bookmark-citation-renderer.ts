import { BookmarkBlockSchema } from '@blocksuite/affine-model';
import {
  CitationProvider,
  CitationRendererExtension,
} from '@blocksuite/affine-shared/services';
import { html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { when } from 'lit/directives/when.js';

import { type BookmarkBlockComponent } from './bookmark-block';

export const BookmarkCitationRendererExtension =
  CitationRendererExtension<BookmarkBlockComponent>(
    BookmarkBlockSchema.model.flavour,
    (block: BookmarkBlockComponent, content: unknown) => {
      const citationService = block.std.get(CitationProvider);
      const isCitation = citationService.isCitationModel(block.model);
      return when(
        isCitation,
        () => {
          const {
            blockDraggable,
            selectedStyle$,
            selected$,
            containerStyleMap,
            handleClick,
            handleDoubleClick,
            model,
          } = block;
          const { url, footnoteIdentifier } = model.props;
          const { icon, title, description } = block.linkPreview$.value;
          const iconSrc = icon
            ? block.imageProxyService.buildUrl(icon)
            : undefined;

          return html`
            <div
              draggable="${blockDraggable ? 'true' : 'false'}"
              class=${classMap({
                'affine-bookmark-container': true,
                ...selectedStyle$?.value,
              })}
              style=${containerStyleMap}
            >
              <affine-citation-card
                .icon=${iconSrc}
                .citationTitle=${title || url}
                .citationContent=${description ?? undefined}
                .citationIdentifier=${footnoteIdentifier ?? ''}
                .onClickCallback=${handleClick}
                .onDoubleClickCallback=${handleDoubleClick}
                .active=${selected$.value}
              ></affine-citation-card>
            </div>
          `;
        },
        () => content
      );
    }
  );
