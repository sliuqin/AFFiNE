import { EmbedIframeConfigExtension } from '../extension/embed-iframe-config';

// https://developer.spotify.com/documentation/embeds/reference/oembed
const spotifyRegex =
  /^(https?:\/\/)?((open\.spotify\.com|spotify\.link)\/([a-zA-Z0-9]+\/)?[a-zA-Z0-9]+)$/;
const spotifyEndpoint = 'https://open.spotify.com/oembed';

const spotifyConfig = {
  name: 'spotify',
  urlRegex: spotifyRegex,
  endpoint: spotifyEndpoint,
  match: (url: string) => spotifyRegex.test(url),
  buildApiUrl: (url: string) => {
    const match = url.match(spotifyRegex);
    if (!match) {
      return undefined;
    }
    const encodedUrl = encodeURIComponent(url);
    const embedUrl = `${spotifyEndpoint}?url=${encodedUrl}`;
    return embedUrl;
  },
};

export const SpotifyEmbedConfig = EmbedIframeConfigExtension(spotifyConfig);
