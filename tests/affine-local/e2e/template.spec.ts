import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import { waitForEditorLoad } from '@affine-test/kit/utils/page-logic';
import { expect, type Locator, type Page } from '@playwright/test';

function getTemplateRow(page: Page) {
  return page.locator(
    '[data-testid="doc-property-row"][data-info-id="template"]'
  );
}

function getJournalRow(page: Page) {
  return page.locator(
    '[data-testid="doc-property-row"][data-info-id="journal"]'
  );
}

async function getRowCheckbox(row: Locator) {
  const checkbox = row.locator('input[type="checkbox"]');
  const state = await checkbox.inputValue();
  const checked = state === 'on';

  return { checkbox, checked };
}

async function toggleCheckboxRow(
  row: Locator,
  value: boolean,
  skipCheck = false
) {
  const { checkbox, checked } = await getRowCheckbox(row);
  if (checked !== value) {
    await checkbox.click();
    if (!skipCheck) {
      const { checked: newChecked } = await getRowCheckbox(row);
      expect(newChecked).toBe(value);
    }
  }
}

const createDocAndMarkAsTemplate = async (
  page: Page,
  title?: string,
  onCreated?: () => Promise<void>
) => {
  await page.getByTestId('sidebar-new-page-button').click();
  await waitForEditorLoad(page);

  if (title) {
    await page.keyboard.type(title);
  }

  const collapse = page.getByTestId('page-info-collapse');
  const open = await collapse.getAttribute('aria-expanded');
  if (open?.toLowerCase() !== 'true') {
    await collapse.click();
  }

  // add if not exists
  if ((await getTemplateRow(page).count()) === 0) {
    const addPropertyButton = page.getByTestId('add-property-button');
    if (!(await addPropertyButton.isVisible())) {
      await page.getByTestId('property-collapsible-button').click();
    }
    await addPropertyButton.click();
    await page
      .locator('[role="menuitem"][data-property-type="journal"]')
      .click();
    await page.keyboard.press('Escape');
  }
  // expand if collapsed
  else if (!(await getTemplateRow(page).isVisible())) {
    await page.getByTestId('property-collapsible-button').click();
  }

  const templateRow = getTemplateRow(page);
  await expect(templateRow).toBeVisible();
  await toggleCheckboxRow(templateRow, true);

  // focus editor
  await page.locator('affine-note').first().click();
  await onCreated?.();
};

const getDocId = async (page: Page) => {
  const docId = await page.evaluate(() => {
    const url = window.location.href;
    const id = url.split('/').pop()?.split('?')[0];
    return id;
  });
  return docId;
};

const enableAskMeEveryTime = async (page: Page) => {
  await page.getByTestId('slider-bar-workspace-setting-button').click();
  await page.getByTestId('editor-panel-trigger').click();
  await page.getByTestId('new-doc-default-mode-trigger').click();
  await page.getByTestId('ask-every-time-trigger').click();
  await page.keyboard.press('Escape');
};

test('create a doc and mark it as template', async ({ page }) => {
  await openHomePage(page);
  await createDocAndMarkAsTemplate(page, 'Test Template', async () => {
    await page.keyboard.type('# Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a template doc');
  });
});

test('create a doc, and initialize it from template', async ({ page }) => {
  await openHomePage(page);
  await createDocAndMarkAsTemplate(page, 'Test Template', async () => {
    await page.keyboard.type('# Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a template doc');
  });

  await page.getByTestId('sidebar-new-page-button').click();
  await waitForEditorLoad(page);
  await page.getByTestId('template-docs-badge').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByText('This is a template doc')).toBeVisible();

  // the starter bar should be hidden
  await expect(page.getByTestId('template-docs-badge')).not.toBeVisible();
});

test('enable ask me every time for new doc', async ({ page }) => {
  const withAskButton = page.getByTestId('sidebar-new-page-with-ask-button');
  const withoutAskButton = page.getByTestId('sidebar-new-page-button');

  await openHomePage(page);
  await expect(withAskButton).not.toBeVisible();
  await expect(withoutAskButton).toBeVisible();

  await enableAskMeEveryTime(page);
  await expect(withAskButton).toBeVisible();
  await expect(withoutAskButton).not.toBeVisible();
});

test('set default template for page', async ({ page }) => {
  await openHomePage(page);
  await createDocAndMarkAsTemplate(page, 'Test Template', async () => {
    await page.keyboard.type('# Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a template doc');
  });
  const templateDocId = await getDocId(page);

  // create a new page, should not inherit template
  await page.getByTestId('sidebar-new-page-button').click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a template doc')).not.toBeVisible();

  // enable page template and set a template
  await page.getByTestId('slider-bar-workspace-setting-button').click();
  await page.getByTestId('workspace-setting:preference').click();
  const pageTemplateSwitch = page.getByTestId('page-template-switch');
  await pageTemplateSwitch.click();
  const pageTemplateSelector = page.getByTestId('page-template-selector');
  await expect(pageTemplateSelector).toBeVisible();
  await pageTemplateSelector.click();
  await page.getByTestId(`template-doc-item-${templateDocId}`).click();

  // close setting, create a new page from sidebar
  await page.getByTestId('modal-close-button').click();
  await page.getByTestId('sidebar-new-page-button').click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a template doc')).toBeVisible();

  // remove template
  await page.getByTestId('slider-bar-workspace-setting-button').click();
  await page.getByTestId('workspace-setting:preference').click();
  await page.getByTestId('page-template-selector').click();
  await page.getByTestId('template-doc-item-remove').click();

  // close setting, create a new page from sidebar
  await page.getByTestId('modal-close-button').click();
  await page.getByTestId('sidebar-new-page-button').click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a template doc')).not.toBeVisible();
});

test('set default template for journal', async ({ page }) => {
  await openHomePage(page);
  await createDocAndMarkAsTemplate(page, 'Page Template', async () => {
    await page.keyboard.type('# Page Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a page template doc');
  });
  const pageTemplateDocId = await getDocId(page);
  await createDocAndMarkAsTemplate(page, 'Journal Template', async () => {
    await page.keyboard.type('# Journal Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a journal template doc');
  });
  const journalTemplateDocId = await getDocId(page);

  // by default create a journal, should not use template
  await page.getByTestId('slider-bar-journals-button').click();
  await waitForEditorLoad(page);
  await expect(
    page.getByText('This is a journal template doc')
  ).not.toBeVisible();
  await expect(page.getByText('This is a page template doc')).not.toBeVisible();

  // enable page template, new journal should use page template
  await page.getByTestId('slider-bar-workspace-setting-button').click();
  await page.getByTestId('workspace-setting:preference').click();
  await page.getByTestId('page-template-switch').click();
  await page.getByTestId('page-template-selector').click();
  await page.getByTestId(`template-doc-item-${pageTemplateDocId}`).click();
  await page.getByTestId('modal-close-button').click();
  // create a new journal
  const prevWeekButton = page.getByTestId('week-picker-prev');
  await prevWeekButton.click();
  await page.getByTestId('week-picker-day').first().click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a page template doc')).toBeVisible();

  // set journal template, new journal should use journal template
  await page.getByTestId('slider-bar-workspace-setting-button').click();
  await page.getByTestId('workspace-setting:preference').click();
  await page.getByTestId('journal-template-selector').click();
  await page.getByTestId(`template-doc-item-${journalTemplateDocId}`).click();
  await page.getByTestId('modal-close-button').click();
  // create a new journal
  await prevWeekButton.click();
  await page.getByTestId('week-picker-day').first().click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a journal template doc')).toBeVisible();
});

test('create doc from template via sidebar entrance', async ({ page }) => {
  await openHomePage(page);
  await createDocAndMarkAsTemplate(page, 'Test Template', async () => {
    await page.keyboard.type('# Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a template doc');
  });
  const templateDocId = await getDocId(page);

  await page.getByTestId('sidebar-new-page-button').click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a template doc')).not.toBeVisible();

  await page.getByTestId('sidebar-template-doc-entrance').click();
  await page.getByTestId(`template-doc-item-${templateDocId}`).click();
  await waitForEditorLoad(page);
  await expect(page.getByText('This is a template doc')).toBeVisible();
});

test('create template from sidebar template entrance', async ({ page }) => {
  await openHomePage(page);
  await page.getByTestId('sidebar-template-doc-entrance').click();
  await page.getByTestId('template-doc-item-create').click();
  await waitForEditorLoad(page);

  await page.locator('affine-note').first().click();
  await page.keyboard.press('Backspace');
  await page.keyboard.type('Template');
  const templateDocId = await getDocId(page);

  await page.getByTestId('sidebar-template-doc-entrance').click();
  await expect(
    page.getByTestId(`template-doc-item-${templateDocId}`)
  ).toBeVisible();
});

test('should not allow to set template and journal at the same time', async ({
  page,
}) => {
  await openHomePage(page);
  await createDocAndMarkAsTemplate(page, 'Test Template', async () => {
    await page.keyboard.type('# Template');
    await page.keyboard.press('Enter');
    await page.keyboard.type('This is a template doc');
  });

  const journalRow = getJournalRow(page);
  const templateRow = getTemplateRow(page);

  // 1. try to set it as journal
  await toggleCheckboxRow(journalRow, true, true);
  const dialog1 = page.getByRole('dialog');
  await expect(dialog1).toBeVisible();

  // 1.1 cancel: keep as template
  await dialog1.getByTestId('confirm-modal-cancel').click();
  const { checked: journalCheckedAfterCancel1 } =
    await getRowCheckbox(journalRow);
  const { checked: templateCheckedAfterCancel1 } =
    await getRowCheckbox(templateRow);
  expect(journalCheckedAfterCancel1).toBe(false);
  expect(templateCheckedAfterCancel1).toBe(true);

  // 1.2 confirm: set as journal
  await toggleCheckboxRow(journalRow, true, true);
  await dialog1.getByTestId('confirm-modal-confirm').click();
  const { checked: journalCheckedAfterConfirm1 } =
    await getRowCheckbox(journalRow);
  const { checked: templateCheckedAfterConfirm1 } =
    await getRowCheckbox(templateRow);
  expect(journalCheckedAfterConfirm1).toBe(true);
  expect(templateCheckedAfterConfirm1).toBe(false);

  // 2. try to set it as template
  await toggleCheckboxRow(templateRow, true, true);
  const dialog2 = page.getByRole('dialog');
  await expect(dialog2).toBeVisible();

  // 2.1 cancel: keep as journal
  await dialog2.getByTestId('confirm-modal-cancel').click();
  const { checked: templateCheckedAfterCancel2 } =
    await getRowCheckbox(templateRow);
  const { checked: journalCheckedAfterCancel2 } =
    await getRowCheckbox(journalRow);
  expect(templateCheckedAfterCancel2).toBe(false);
  expect(journalCheckedAfterCancel2).toBe(true);

  // 2.2 confirm: set as template
  await toggleCheckboxRow(templateRow, true, true);
  await dialog2.getByTestId('confirm-modal-confirm').click();
  const { checked: templateCheckedAfterConfirm2 } =
    await getRowCheckbox(templateRow);
  const { checked: journalCheckedAfterConfirm2 } =
    await getRowCheckbox(journalRow);
  expect(templateCheckedAfterConfirm2).toBe(true);
  expect(journalCheckedAfterConfirm2).toBe(false);
});
