import { randomUUID } from 'node:crypto';

import { listCommentChangesQuery, listCommentsQuery } from '@affine/graphql';

import { Mockers } from '../../mocks';
import { app, e2e } from '../test';

async function init() {
  const member = await app.create(Mockers.User);
  const owner = await app.create(Mockers.User);
  const workspace = await app.create(Mockers.Workspace, {
    owner,
  });

  await app.create(Mockers.WorkspaceUser, {
    workspaceId: workspace.id,
    userId: member.id,
  });

  return {
    member,
    owner,
    workspace,
  };
}

const { owner, workspace } = await init();

e2e('should list comments work', async t => {
  const docId = randomUUID();

  await app.login(owner);
  const result = await app.gql({
    query: listCommentsQuery,
    variables: {
      workspaceId: workspace.id,
      docId,
    },
  });
  console.log(result.workspace.comments);
  // console.log(result.workspace.comments.edges[0].node.replies[0].commentId);
  t.truthy(result);
});

e2e('should list comment changes work', async t => {
  const docId = randomUUID();

  await app.login(owner);
  const result = await app.gql({
    query: listCommentChangesQuery,
    variables: {
      workspaceId: workspace.id,
      docId,
      pagination: {
        after: '',
      },
    },
  });
  console.log(result.workspace.commentChanges);
  // console.log(result.workspace.commentUpdates.edges[0].node.item.content);
  t.truthy(result);
});
