import {
  createIdentifier,
  type ServiceIdentifier,
} from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';

/**
 * Define the config of an embed iframe block
 * @example
 * {
 *   name: 'spotify',
 *   urlRegex: /^(https?:\/\/)?((open\.spotify\.com|spotify\.link)\/([a-zA-Z0-9]+\/)?[a-zA-Z0-9]+)$/,
 *   endpoint: 'https://open.spotify.com/oembed',
 *   match: (url: string) => spotifyRegex.test(url),
 *   buildApiUrl: (url: string) => {
 *     const match = url.match(spotifyRegex);
 *     if (!match) {
 *       return undefined;
 *     }
 *     const encodedUrl = encodeURIComponent(url);
 *     const apiUrl = `${spotifyEndpoint}?url=${encodedUrl}`;
 *     return apiUrl;
 *   },
 * }
 */
export type EmbedIframeConfig = {
  /**
   * The name of the embed iframe block
   */
  name: string;
  /**
   * The regex of the url
   */
  urlRegex: RegExp;
  /**
   * The endpoint of the embed iframe block
   */
  endpoint: string;
  /**
   * The function to match the url
   */
  match: (url: string) => boolean;
  /**
   * The function to build the API URL for fetching embed data
   */
  buildApiUrl: (url: string) => string | undefined;
};

export const EmbedIframeConfigIdentifier =
  createIdentifier<EmbedIframeConfig>('EmbedIframeConfig');

export function EmbedIframeConfigExtension(
  config: EmbedIframeConfig
): ExtensionType & {
  identifier: ServiceIdentifier<EmbedIframeConfig>;
} {
  const identifier = EmbedIframeConfigIdentifier(config.name);
  return {
    setup: di => {
      di.addImpl(identifier, () => config);
    },
    identifier,
  };
}
