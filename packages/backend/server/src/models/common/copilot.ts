import { AiJobStatus, AiJobType } from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/library';

export interface CopilotJob {
  id?: string;
  workspaceId: string;
  blobId: string;
  createdBy?: string;
  type: AiJobType;
  status?: AiJobStatus;
  payload?: JsonValue;
}
