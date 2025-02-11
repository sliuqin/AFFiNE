import { CopilotMessageTag, CopilotPromptMessageRole } from '@affine/graphql';
import { z } from 'zod';

// Define the Zod schema
const ChatMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.nativeEnum(CopilotPromptMessageRole),
  createdAt: z.string(),
  attachments: z.array(z.string()).optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
  avatarUrl: z.string().optional(),
  tag: z.nativeEnum(CopilotMessageTag).optional(),
});

export const ChatMessagesSchema = z.array(ChatMessageSchema);

// Derive the TypeScript type from the Zod schema
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export type MessageUserInfo = {
  userId?: string;
  userName?: string;
  avatarUrl?: string;
};
