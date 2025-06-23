export type LinkPreviewRequest = {
  url: string;
  head?: boolean;
};

export type LinkPreviewResponse = {
  url: string;
  title?: string;
  siteName?: string;
  description?: string;
  images?: string[];
  mediaType?: string;
  contentType?: string;
  charset?: string;
  videos?: string[];
  favicons?: string[];
};

export const MAX_BODY_SIZE = 1024 * 1024;
export const SIGNATURE_VALID_DURATION = 6 * 60 * 60 * 1000; // 6 hours
export const WEB_CONTAINER_ENDPOINT = '/web-container';
