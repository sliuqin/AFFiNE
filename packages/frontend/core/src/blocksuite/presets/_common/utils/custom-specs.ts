import {
  type BlockStdScope,
  BlockViewIdentifier,
} from '@blocksuite/affine/block-std';
import {
  DocDisplayMetaProvider,
  FootNoteNodeConfigExtension,
  PageEditorBlockSpecs,
  RefNodeSlotsProvider,
  ThemeExtensionIdentifier,
} from '@blocksuite/affine/blocks';
import type {
  Container,
  ServiceIdentifier,
} from '@blocksuite/affine/global/di';
import type { ExtensionType } from '@blocksuite/affine/store';
import { literal } from 'lit/static-html.js';

export const CustomPageEditorBlockSpecs: ExtensionType[] = [
  ...PageEditorBlockSpecs,
  {
    setup: di => {
      di.override(
        BlockViewIdentifier('affine:page'),
        () => literal`affine-page-root`
      );
    },
  },
];

/**
 * Gets override extensions for a list of service identifiers
 *
 * @param identifiers - Array of service identifiers to get extensions for
 * @param std - BlockStdScope instance that provides access to services
 * @returns Array of extension types that override the services
 */
export const getOverrideExtensions = <T extends unknown[]>(
  identifiers: { [K in keyof T]: ServiceIdentifier<T[K]> },
  std?: BlockStdScope
): ExtensionType[] => {
  // If no BlockStdScope provided, return empty array since we can't get services
  if (!std) {
    return [];
  }

  // Map each identifier to an extension that overrides the service
  return (
    identifiers
      .map(identifier => {
        // Try to get the optional service for this identifier
        const extension = std.getOptional(identifier);

        if (extension) {
          // If service exists, create extension that overrides it
          return {
            setup: (di: Container) => {
              di.override(identifier, () => extension);
            },
          };
        }
        return undefined;
      })
      // Filter out any undefined extensions where service wasn't found
      .filter(
        (extension): extension is ExtensionType => extension !== undefined
      )
  );
};

/**
 * Creates a FootNoteNodeConfigExtension for preview contexts
 * At this case, to support open the reference doc in center peek view
 * Handles clicks on footnote references by either:
 * - Opening doc links in center peek view
 * - Opening URLs in new tab
 *
 * @param activeStd - Optional BlockStdScope to access services
 * @returns FootNoteNodeConfigExtension
 */
const PreviewFootnoteConfigExtension = (activeStd?: BlockStdScope) => {
  // If no BlockStdScope provided, return basic config with no click handling
  if (!activeStd) {
    return FootNoteNodeConfigExtension({});
  }

  return FootNoteNodeConfigExtension({
    onPopupClick: (footnote, abortController) => {
      const referenceType = footnote.reference.type;
      const { docId, url } = footnote.reference;

      switch (referenceType) {
        case 'doc': {
          if (!docId) {
            break;
          }
          // Emit event to open referenced doc in center peek view
          activeStd.getOptional(RefNodeSlotsProvider)?.docLinkClicked.emit({
            pageId: docId,
            host: activeStd.host,
            openMode: 'open-in-center-peek',
          });
          break;
        }
        case 'url':
          if (!url) {
            break;
          }
          window.open(url, '_blank');
          break;
      }
      // Clean up after handling click
      abortController.abort();
    },
  });
};

/**
 * Gets extensions needed for the page editor preview outside of the affine detail page editor
 * Like the text renderer component in the AI panel, right sidebar, peek view, etc.
 * Combines custom block specs with services overridden by AFFiNE
 *
 * @param std - Optional BlockStdScope instance to get service overrides from
 * @returns Array of extensions including custom blocks and service overrides
 */
export const PageEditorPreviewExtensions = (
  std?: BlockStdScope
): ExtensionType[] => {
  return [
    // Include custom block specs like affine-page-root
    ...CustomPageEditorBlockSpecs,
    // Override core services like theme and doc display meta
    // if BlockStdScope is provided
    ...getOverrideExtensions(
      [ThemeExtensionIdentifier, DocDisplayMetaProvider],
      std
    ),
    // Add custom config for footnote nodes in preview contexts
    PreviewFootnoteConfigExtension(std),
  ];
};
