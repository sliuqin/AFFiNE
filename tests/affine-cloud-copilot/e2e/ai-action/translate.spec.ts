import { expect } from '@playwright/test';

import { test } from '../base/base-test';

test.describe('AIAction/Translate', () => {
  test.beforeEach(async ({ loggedInPage: page, utils }) => {
    await utils.testUtils.setupTestEnvironment(page);
    await utils.chatPanel.openChatPanel(page);
  });

  test('should support translating the selected content', async ({
    loggedInPage: page,
    utils,
  }) => {
    const { translate } = await utils.editor.askAIWithText(page, 'Apple');
    const { answer, responses } = await translate('German');
    await expect(answer).toHaveText(/Apfel/, { timeout: 10000 });
    expect(responses).toEqual(new Set(['insert-below', 'replace-selection']));
  });

  test('should support translating the selected text block in edgeless', async ({
    loggedInPage: page,
    utils,
  }) => {
    const { translate } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessText(page, 'Apple');
      }
    );
    const { answer, responses } = await translate('German');
    await expect(answer).toHaveText(/Apfel/, { timeout: 10000 });
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('should support translating the selected note block in edgeless', async ({
    loggedInPage: page,
    utils,
  }) => {
    const { translate } = await utils.editor.askAIWithEdgeless(
      page,
      async () => {
        await utils.editor.createEdgelessNote(page, 'Apple');
      }
    );
    const { answer, responses } = await translate('German');
    await expect(answer).toHaveText(/Apfel/, { timeout: 10000 });
    expect(responses).toEqual(new Set(['insert-below']));
  });

  test('support show chat history in chat panel', async ({
    loggedInPage: page,
    utils,
  }) => {
    const { translate } = await utils.editor.askAIWithText(page, 'Apple');
    const { answer } = await translate('German');
    await expect(answer).toHaveText(/Apfel/, { timeout: 10000 });
    const replace = answer.getByTestId('answer-replace');
    await replace.click();
    await utils.chatPanel.waitForHistory(page, [
      {
        role: 'action',
      },
    ]);
    const {
      answer: panelAnswer,
      prompt,
      actionName,
    } = await utils.chatPanel.getLatestAIActionMessage(page);
    await expect(panelAnswer).toHaveText(/Apfel/);
    await expect(prompt).toHaveText(/Translate/);
    await expect(actionName).toHaveText(/Translate/);
  });
});
