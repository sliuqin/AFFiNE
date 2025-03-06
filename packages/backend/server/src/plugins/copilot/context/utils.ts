import { PrismaClient } from '@prisma/client';

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
