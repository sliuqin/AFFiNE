import {
  type MarkdownAdapterPreprocessor,
  MarkdownPreprocessorExtension,
} from '@blocksuite/affine-shared/adapters';

// Check if a URL is already encoded with encodeURIComponent
function isEncoded(uri: string): boolean {
  try {
    // If decoding produces a different result than the original,
    // then the URI contains encoded characters
    return uri !== decodeURIComponent(uri);
  } catch {
    // If decoding fails, the URI contains invalid percent-encoding
    return true;
  }
}

// Format footnote definition with consistent spacing
function formatFootnoteDefinition(reference: string, data: object): string {
  return `[^${reference}]: ${JSON.stringify(data)}`;
}

/**
 * Preprocessor for footnote url
 * We should encode url in footnote definition to avoid markdown link parsing
 *
 * Example of footnote definition:
 * [^ref]: {"type":"url","url":"https://example.com"}
 */
export function footnoteUrlPreprocessor(content: string): string {
  // Match footnote definitions with any reference (not just numbers)
  // Format: [^reference]: {json_content}
  return content.replace(
    /\[\^([^\]]+)\]:\s*({[\s\S]*?})/g,
    (match, reference, jsonContent) => {
      try {
        const footnoteData = JSON.parse(jsonContent.trim());
        // If footnoteData is not an object or doesn't have url, return original content
        // If the url is already encoded, return original content
        if (
          typeof footnoteData !== 'object' ||
          !footnoteData.url ||
          isEncoded(footnoteData.url)
        ) {
          return match;
        }

        return formatFootnoteDefinition(reference, {
          ...footnoteData,
          url: encodeURIComponent(footnoteData.url),
        });
      } catch {
        // Keep original content if JSON parsing fails
        return match;
      }
    }
  );
}

const bookmarkBlockPreprocessor: MarkdownAdapterPreprocessor = {
  name: 'bookmark-block',
  levels: ['block', 'slice', 'doc'],
  preprocess: footnoteUrlPreprocessor,
};

export const BookmarkBlockMarkdownPreprocessorExtension =
  MarkdownPreprocessorExtension(bookmarkBlockPreprocessor);
