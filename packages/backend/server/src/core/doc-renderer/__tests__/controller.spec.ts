import { randomUUID } from 'node:crypto';

import { User, Workspace } from '@prisma/client';
import ava, { TestFn } from 'ava';
import { Doc as YDoc } from 'yjs';

import { createTestingApp, type TestingApp } from '../../../__tests__/utils';
import { AppModule } from '../../../app.module';
import { Config } from '../../../base';
import { ConfigModule } from '../../../base/config';
import { Models } from '../../../models';
import { PgWorkspaceDocStorageAdapter } from '../../doc';

const test = ava as TestFn<{
  models: Models;
  app: TestingApp;
  config: Config;
  adapter: PgWorkspaceDocStorageAdapter;
}>;

test.before(async t => {
  const app = await createTestingApp({
    imports: [
      ConfigModule.forRoot({
        flavor: {
          doc: false,
        },
        docService: {
          endpoint: '',
        },
      }),
      AppModule,
    ],
  });

  t.context.models = app.get(Models);
  t.context.config = app.get(Config);
  t.context.adapter = app.get(PgWorkspaceDocStorageAdapter);
  t.context.app = app;
});

let user: User;
let workspace: Workspace;

test.beforeEach(async t => {
  t.context.config.docService.endpoint = t.context.app.url();
  await t.context.app.initTestingDB();
  user = await t.context.models.user.create({
    email: 'test@affine.pro',
  });
  workspace = await t.context.models.workspace.create(user.id);
});

test.after.always(async t => {
  await t.context.app.close();
});

test('should render page success', async t => {
  const docId = randomUUID();
  const { app, adapter, models } = t.context;

  const doc = new YDoc();
  const text = doc.getText('content');
  const updates: Buffer[] = [];

  doc.on('update', update => {
    updates.push(Buffer.from(update));
  });

  text.insert(0, 'hello');
  text.insert(5, 'world');
  text.insert(5, ' ');

  await adapter.pushDocUpdates(workspace.id, docId, updates, user.id);
  await models.doc.publish(workspace.id, docId);

  await app.GET(`/workspace/${workspace.id}/${docId}`).expect(200);
  t.pass();
});
