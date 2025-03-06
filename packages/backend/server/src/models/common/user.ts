import { Prisma } from '@prisma/client';

export const publicUserSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;
