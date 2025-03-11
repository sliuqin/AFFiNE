import { Readable } from 'node:stream';

import { PrismaClient } from '@prisma/client';

import { BlobQuotaExceeded } from '../../../base';
import { MAX_EMBEDDABLE_SIZE } from './types';

export class GqlSignal implements AsyncDisposable {
  readonly abortController = new AbortController();

  get signal() {
    return this.abortController.signal;
  }

  async [Symbol.asyncDispose]() {
    this.abortController.abort();
  }
}

export async function checkEmbeddingAvailable(
  db: PrismaClient
): Promise<boolean> {
  const [{ count }] = await db.$queryRaw<
    {
      count: number;
    }[]
  >`SELECT count(1) FROM pg_tables WHERE tablename in ('ai_context_embeddings', 'ai_workspace_embeddings')`;
  return Number(count) === 2;
}

export function readStream(
  readable: Readable,
  maxSize = MAX_EMBEDDABLE_SIZE
): Promise<Buffer<ArrayBuffer>> {
  return new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    readable.on('data', chunk => {
      totalSize += chunk.length;
      if (totalSize > maxSize) {
        reject(new BlobQuotaExceeded());
        readable.destroy(new BlobQuotaExceeded());
        return;
      }
      chunks.push(chunk);
    });

    readable.on('end', () => {
      resolve(Buffer.concat(chunks, totalSize));
    });

    readable.on('error', err => {
      reject(err);
    });
  });
}
