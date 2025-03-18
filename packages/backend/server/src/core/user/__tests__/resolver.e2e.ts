import test from 'ava';

import {
  createTestingApp,
  getSettings,
  TestingApp,
  updateSettings,
} from '../../../__tests__/utils';

let app: TestingApp;

test.before(async () => {
  app = await createTestingApp();
});

test.after.always(async () => {
  await app.close();
});

test('should get user settings', async t => {
  await app.signup();
  const settings = await getSettings(app);
  t.deepEqual(settings, {
    receiveInvitationEmail: true,
    receiveMentionEmail: true,
  });
});

test('should update user settings', async t => {
  await app.signup();
  await updateSettings(app, {
    receiveInvitationEmail: false,
    receiveMentionEmail: false,
  });
  const settings = await getSettings(app);
  t.deepEqual(settings, {
    receiveInvitationEmail: false,
    receiveMentionEmail: false,
  });

  await updateSettings(app, {
    receiveMentionEmail: true,
  });
  const settings2 = await getSettings(app);
  t.deepEqual(settings2, {
    receiveInvitationEmail: false,
    receiveMentionEmail: true,
  });

  await updateSettings(app, {
    // ignore undefined value
    receiveInvitationEmail: undefined,
  });
  const settings3 = await getSettings(app);
  t.deepEqual(settings3, {
    receiveInvitationEmail: false,
    receiveMentionEmail: true,
  });
});

test('should throw error when update user settings with invalid input', async t => {
  await app.signup();
  await t.throwsAsync(
    updateSettings(app, {
      receiveInvitationEmail: false,
      // @ts-expect-error invalid value
      receiveMentionEmail: null,
    }),
    {
      message: /Expected boolean, received null/,
    }
  );
});

test('should not update user settings when not logged in', async t => {
  await app.logout();
  await t.throwsAsync(
    updateSettings(app, {
      receiveInvitationEmail: false,
      receiveMentionEmail: false,
    }),
    {
      message: 'You must sign in first to access this resource.',
    }
  );
});
