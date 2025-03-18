import type { SettingsType, UpdateSettingsInput } from '../../core/user/types';
import type { TestingApp } from './testing-app';

export async function getSettings(app: TestingApp): Promise<SettingsType> {
  const res = await app.gql(
    `
    query settings {
      currentUser {
        settings {
          receiveInvitationEmail
          receiveMentionEmail
        }
      }
    }
    `
  );
  return res.currentUser.settings;
}

export async function updateSettings(
  app: TestingApp,
  input: UpdateSettingsInput
): Promise<boolean> {
  const res = await app.gql(
    `
    mutation updateSettings($input: UpdateSettingsInput!) {
      updateSettings(input: $input)
    }
    `,
    { input }
  );
  return res.updateSettings;
}
