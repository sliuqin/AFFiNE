import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import z from 'zod';

import { BaseModel } from './base';

export const SettingsSchema = z.object({
  receiveInvitationEmail: z.boolean().default(true),
  receiveMentionEmail: z.boolean().default(true),
});

export type SettingsInput = z.input<typeof SettingsSchema>;
export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Settings Model
 */
@Injectable()
export class SettingsModel extends BaseModel {
  @Transactional()
  async set(userId: string, setting: SettingsInput) {
    const existsSetting = await this.get(userId);
    const payload = SettingsSchema.parse({
      ...existsSetting,
      ...setting,
    });
    await this.db.settings.upsert({
      where: {
        userId,
      },
      update: {
        payload,
      },
      create: {
        userId,
        payload,
      },
    });
    this.logger.log(`Settings updated for user ${userId}`);
    return payload;
  }

  async get(userId: string): Promise<Settings> {
    const row = await this.db.settings.findUnique({
      where: {
        userId,
      },
    });
    return SettingsSchema.parse(row?.payload ?? {});
  }
}
