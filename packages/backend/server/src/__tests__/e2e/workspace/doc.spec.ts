import { listDocMetasQuery } from '@affine/graphql';

import { Mockers } from '../../mocks';
import { app, e2e } from '../test';

e2e('should list doc metas', async t => {
  const owner = await app.signup();

  const workspace = await app.create(Mockers.Workspace, {
    owner: { id: owner.id },
  });

  const docSnapshot1 = await app.create(Mockers.DocSnapshot, {
    workspaceId: workspace.id,
    user: owner,
  });
  const doc1 = await app.create(Mockers.DocMeta, {
    workspaceId: workspace.id,
    docId: docSnapshot1.id,
    title: 'doc1',
  });

  const docSnapshot2 = await app.create(Mockers.DocSnapshot, {
    workspaceId: workspace.id,
    user: owner,
  });
  const doc2 = await app.create(Mockers.DocMeta, {
    workspaceId: workspace.id,
    docId: docSnapshot2.id,
    title: 'doc2',
    summary: 'summary2',
  });

  // doc3 no meta, only has snapshot
  await app.create(Mockers.DocSnapshot, {
    workspaceId: workspace.id,
    user: owner,
  });

  await app.login(owner);

  const result = await app.gql({
    query: listDocMetasQuery,
    variables: {
      workspaceId: workspace.id,
      docIds: [doc1.docId, doc2.docId],
    },
  });

  const docMetas = result.workspace.docMetas;
  t.is(docMetas.length, 2);
  docMetas.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  t.snapshot(
    docMetas.map(meta => ({
      title: meta.title,
      summary: meta.summary,
    }))
  );
});
