import {
  ActionForbidden,
  NotFound,
  URLHelper,
  ValidationError,
} from '../../../base';
import {
  MAX_BODY_SIZE,
  SIGNATURE_VALID_DURATION,
  WEB_CONTAINER_ENDPOINT,
} from '../types';
import { createHMACSignature, verifyHMACSignature } from './crypto';

export function parseHtmlContent(body: any): string {
  if (!body || typeof body !== 'object' || typeof body.html !== 'string') {
    throw new ValidationError({ errors: 'Missing or invalid html field' });
  }

  const html = body.html.trim();
  if (!html || html.length >= MAX_BODY_SIZE) {
    throw new ValidationError({ errors: 'Invalid HTML content' });
  }
  return html;
}

export function extractDomainFromReferer(referer: string): string {
  try {
    return new URL(referer).hostname;
  } catch {
    return '';
  }
}

async function createSign(
  secret: string,
  contentHash: string,
  timestamp: number,
  refererDomain: string
): Promise<string> {
  const message = `${contentHash}:${timestamp}:${refererDomain}`;
  return await createHMACSignature(secret, message);
}

export async function verifySign(
  secret: string,
  contentHash: string,
  timestamp: number,
  referer: string,
  signature: string
) {
  const refererDomain = extractDomainFromReferer(referer);
  const message = `${contentHash}:${timestamp}:${refererDomain}`;

  const isValid = await verifyHMACSignature(secret, message, signature);
  if (!isValid) {
    throw new ActionForbidden('Invalid signature');
  }
}

export async function webContainerUrl(
  urlHelper: URLHelper,
  referer: string,
  contentHash: string,
  secret: string
): Promise<string> {
  const timestamp = Date.now();
  const refererDomain = extractDomainFromReferer(referer);
  const signature = await createSign(
    secret,
    contentHash,
    timestamp,
    refererDomain
  );
  return `${urlHelper.baseUrl}/api/worker${WEB_CONTAINER_ENDPOINT}/${contentHash}?signature=${signature}&timestamp=${timestamp}`;
}

export async function getContentHash(
  secret: string,
  url: URL,
  referer: string
): Promise<string> {
  const pathSegments = url.pathname.split('/');
  const contentHash = pathSegments[pathSegments.length - 1];
  const signature = url.searchParams.get('signature');
  const timestampStr = url.searchParams.get('timestamp');

  if (!contentHash || !signature || !timestampStr) {
    throw new NotFound('Missing params');
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > SIGNATURE_VALID_DURATION) {
    throw new NotFound('Invalid or expired signature');
  }

  await verifySign(secret, contentHash, timestamp, referer, signature);

  return contentHash;
}
