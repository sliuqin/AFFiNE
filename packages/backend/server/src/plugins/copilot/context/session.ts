import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

import { PrismaTransaction } from '../../../base';
import {
  ChunkSimilarity,
  ContextCategories,
  ContextConfig,
  ContextDoc,
  ContextEmbedStatus,
  ContextFile,
  ContextList,
  DocChunkSimilarity,
  EmbeddingClient,
  FileChunkSimilarity,
} from './types';

export class ContextSession implements AsyncDisposable {
  constructor(
    private readonly client: EmbeddingClient,
    private readonly contextId: string,
    private readonly config: ContextConfig,
    private readonly db: PrismaClient,
    private readonly dispatcher?: (
      config: ContextConfig,
      tx?: PrismaTransaction
    ) => Promise<void>
  ) {}

  get id() {
    return this.contextId;
  }

  get workspaceId() {
    return this.config.workspaceId;
  }

  listDocs(): ContextDoc[] {
    return [...this.config.docs];
  }

  listFiles() {
    return this.config.files.map(f => ({ ...f }));
  }

  get sortedList(): ContextList {
    const { docs, files } = this.config;
    return [...docs, ...files].toSorted(
      (a, b) => a.createdAt - b.createdAt
    ) as ContextList;
  }

  async addCategoryRecord(type: ContextCategories, id: string) {
    const category = this.config.categories.find(
      c => c.type === type && c.id === id
    );
    if (category) {
      return category;
    }
    const record = { id, type, createdAt: Date.now() };
    this.config.categories.push(record);
    await this.save();
    return record;
  }

  async removeCategoryRecord(type: ContextCategories, id: string) {
    const index = this.config.categories.findIndex(
      c => c.type === type && c.id === id
    );
    if (index >= 0) {
      this.config.categories.splice(index, 1);
      await this.save();
    }
    return true;
  }

  async addDocRecord(docId: string): Promise<ContextDoc> {
    const doc = this.config.docs.find(f => f.id === docId);
    if (doc) {
      return doc;
    }
    const record = { id: docId, createdAt: Date.now(), status: null };
    this.config.docs.push(record);
    await this.save();
    return record;
  }

  async removeDocRecord(docId: string): Promise<boolean> {
    const index = this.config.docs.findIndex(f => f.id === docId);
    if (index >= 0) {
      this.config.docs.splice(index, 1);
      await this.save();
    }
    return true;
  }

  async addFile(blobId: string, name: string): Promise<ContextFile> {
    let fileId = nanoid();
    const existsBlob = this.config.files.find(f => f.blobId === blobId);
    if (existsBlob) {
      // use exists file id if the blob exists
      // we assume that the file content pointed to by the same blobId is consistent.
      if (existsBlob.status === ContextEmbedStatus.finished) {
        return existsBlob;
      }
      fileId = existsBlob.id;
    } else {
      await this.saveFileRecord(fileId, file => ({
        ...file,
        blobId,
        chunkSize: 0,
        name,
        error: null,
        createdAt: Date.now(),
      }));
    }
    return this.getFile(fileId) as ContextFile;
  }

  getFile(fileId: string): ContextFile | undefined {
    return this.config.files.find(f => f.id === fileId);
  }

  async removeFile(fileId: string): Promise<boolean> {
    return await this.db.$transaction(async tx => {
      await tx.aiContextEmbedding.deleteMany({
        where: { contextId: this.contextId, fileId },
      });
      this.config.files = this.config.files.filter(f => f.id !== fileId);
      await this.save(tx);
      return true;
    });
  }

  /**
   * Match the input text with the file chunks
   * @param content input text to match
   * @param topK number of similar chunks to return, default 5
   * @param signal abort signal
   * @param threshold relevance threshold for the similarity score, higher threshold means more similar chunks, default 0.7, good enough based on prior experiments
   * @returns list of similar chunks
   */
  async matchFileChunks(
    content: string,
    topK: number = 5,
    signal?: AbortSignal,
    threshold: number = 0.7
  ): Promise<FileChunkSimilarity[]> {
    const embedding = await this.client
      .getEmbeddings([content], signal)
      .then(r => r?.[0]?.embedding);
    if (!embedding) return [];
    const similarityChunks = await this.db.$queryRaw<
      Array<FileChunkSimilarity>
    >`
      SELECT "file_id" as "fileId", "chunk", "content", "embedding" <=> ${embedding}::vector as "distance" 
      FROM "ai_context_embeddings"
      WHERE context_id = ${this.id}
      ORDER BY "distance" ASC
      LIMIT ${topK};
    `;
    return similarityChunks.filter(c => Number(c.distance) <= threshold);
  }

  /**
   * Match the input text with the workspace chunks
   * @param content input text to match
   * @param topK number of similar chunks to return, default 5
   * @param signal abort signal
   * @param threshold relevance threshold for the similarity score, higher threshold means more similar chunks, default 0.7, good enough based on prior experiments
   * @returns list of similar chunks
   */
  async matchWorkspaceChunks(
    content: string,
    topK: number = 5,
    signal?: AbortSignal,
    threshold: number = 0.7
  ): Promise<ChunkSimilarity[]> {
    const embedding = await this.client
      .getEmbeddings([content], signal)
      .then(r => r?.[0]?.embedding);
    if (!embedding) return [];
    const similarityChunks = await this.db.$queryRaw<Array<DocChunkSimilarity>>`
      SELECT "doc_id" as "docId", "chunk", "content", "embedding" <=> ${embedding}::vector as "distance"
      FROM "ai_workspace_embeddings"
      WHERE "workspace_id" = ${this.workspaceId}
      ORDER BY "distance" ASC
      LIMIT ${topK};
    `;
    return similarityChunks.filter(c => Number(c.distance) <= threshold);
  }

  async saveFileRecord(
    fileId: string,
    cb: (
      record: Pick<ContextFile, 'id' | 'status'> &
        Partial<Omit<ContextFile, 'id' | 'status'>>
    ) => ContextFile,
    tx?: PrismaTransaction
  ) {
    const files = this.config.files;
    const file = files.find(f => f.id === fileId);
    if (file) {
      Object.assign(file, cb({ ...file }));
    } else {
      const file = { id: fileId, status: ContextEmbedStatus.processing };
      files.push(cb(file));
    }
    await this.save(tx);
  }

  async save(tx?: PrismaTransaction) {
    await this.dispatcher?.(this.config, tx);
  }

  async [Symbol.asyncDispose]() {
    await this.save();
  }
}
