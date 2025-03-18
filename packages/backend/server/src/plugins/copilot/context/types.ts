import { File } from 'node:buffer';

import { z } from 'zod';

import { CopilotContextFileNotSupported, OneMB } from '../../../base';
import { parseDoc } from '../../../native';

declare global {
  interface Events {
    'workspace.doc.embedding': Array<{
      workspaceId: string;
      docId: string;
    }>;
    'workspace.file.embed.finished': {
      contextId: string;
      fileId: string;
      chunkSize: number;
    };
    'workspace.file.embed.failed': {
      contextId: string;
      fileId: string;
      error: string;
    };
  }
}

export const MAX_EMBEDDABLE_SIZE = 50 * OneMB;

export enum ContextEmbedStatus {
  processing = 'processing',
  finished = 'finished',
  failed = 'failed',
}

export enum ContextCategories {
  Tag = 'tag',
  Collection = 'collection',
}

export const ContextConfigSchema = z.object({
  workspaceId: z.string(),
  files: z
    .object({
      id: z.string(),
      chunkSize: z.number(),
      name: z.string(),
      status: z.enum([
        ContextEmbedStatus.processing,
        ContextEmbedStatus.finished,
        ContextEmbedStatus.failed,
      ]),
      error: z.string().nullable(),
      blobId: z.string(),
      createdAt: z.number(),
    })
    .array(),
  docs: z
    .object({
      id: z.string(),
      // status for workspace doc embedding progress
      // only exists when the client submits the doc embedding task
      status: z
        .enum([
          ContextEmbedStatus.processing,
          ContextEmbedStatus.finished,
          ContextEmbedStatus.failed,
        ])
        .nullable(),
      createdAt: z.number(),
    })
    .array(),
  categories: z
    .object({
      id: z.string(),
      type: z.enum([ContextCategories.Tag, ContextCategories.Collection]),
      createdAt: z.number(),
    })
    .array(),
});

export const MinimalContextConfigSchema = ContextConfigSchema.pick({
  workspaceId: true,
});

export type ContextConfig = z.infer<typeof ContextConfigSchema>;
export type ContextCategory = z.infer<
  typeof ContextConfigSchema
>['categories'][number];
export type ContextDoc = z.infer<typeof ContextConfigSchema>['docs'][number];
export type ContextFile = z.infer<typeof ContextConfigSchema>['files'][number];
export type ContextListItem = ContextDoc | ContextFile;
export type ContextList = ContextListItem[];

export type Chunk = {
  index: number;
  content: string;
};

export type ChunkSimilarity = {
  chunk: number;
  content: string;
  distance: number | null;
};

export type FileChunkSimilarity = ChunkSimilarity & {
  fileId: string;
};

export type DocChunkSimilarity = ChunkSimilarity & {
  docId: string;
};

export type Embedding = {
  /**
   * The index of the embedding in the list of embeddings.
   */
  index: number;
  content: string;
  embedding: Array<number>;
};

export abstract class EmbeddingClient {
  async getFileEmbeddings(
    file: File,
    signal?: AbortSignal
  ): Promise<Embedding[][]> {
    const chunks = await this.getFileChunks(file, signal);
    const chunkedEmbeddings = await Promise.all(
      chunks.map(chunk => this.generateEmbeddings(chunk))
    );
    return chunkedEmbeddings;
  }

  async getFileChunks(file: File, signal?: AbortSignal): Promise<Chunk[][]> {
    const buffer = Buffer.from(await file.arrayBuffer());
    let doc;
    try {
      doc = await parseDoc(file.name, buffer);
    } catch (e: any) {
      throw new CopilotContextFileNotSupported({
        fileName: file.name,
        message: e?.message || e?.toString?.() || 'format not supported',
      });
    }
    if (doc && !signal?.aborted) {
      if (!doc.chunks.length) {
        throw new CopilotContextFileNotSupported({
          fileName: file.name,
          message: 'no content found',
        });
      }
      const input = doc.chunks.toSorted((a, b) => a.index - b.index);
      // chunk input into 32 every array
      const chunks: Chunk[][] = [];
      for (let i = 0; i < input.length; i += 32) {
        chunks.push(input.slice(i, i + 32));
      }
      return chunks;
    }
    throw new CopilotContextFileNotSupported({
      fileName: file.name,
      message: 'failed to parse file',
    });
  }

  async generateEmbeddings(chunks: Chunk[]): Promise<Embedding[]> {
    const retry = 3;

    let embeddings: Embedding[] = [];
    let error = null;
    for (let i = 0; i < retry; i++) {
      try {
        embeddings = await this.getEmbeddings(chunks.map(c => c.content));
        break;
      } catch (e) {
        error = e;
      }
    }
    if (error) throw error;

    // fix the index of the embeddings
    return embeddings.map(e => ({ ...e, index: chunks[e.index].index }));
  }

  abstract getEmbeddings(
    input: string[],
    signal?: AbortSignal
  ): Promise<Embedding[]>;
}
