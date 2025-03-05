import { openHomePage } from '@affine-test/kit/utils/load-page';
import { type } from '@affine-test/kit/utils/page-logic';
import { expect, test } from '@playwright/test';

test('add callout block using slash menu and change emoji', async ({
  page,
}) => {
  await openHomePage(page);
  await page.getByTestId('settings-modal-trigger').click();
  await page.getByText('Experimental features').click();
  await page.getByText('I am aware of the risks, and').click();
  await page.getByTestId('experimental-confirm-button').click();
  await page.getByTestId('enable_callout').locator('span').click();
  await page.getByTestId('modal-close-button').click();
  await page.getByTestId('sidebar-new-page-button').click();
  await page.locator('affine-paragraph v-line div').click();

  await type(page, '/callout\naaaa\nbbbb');
  const callout = page.locator('affine-callout');
  const emoji = page.locator('affine-callout .affine-callout-emoji');
  await expect(callout).toBeVisible();
  await expect(emoji).toContainText('😀');

  const paragraph = page.locator('affine-callout affine-paragraph');
  await expect(paragraph).toHaveCount(1);

  const vLine = page.locator('affine-callout v-line');
  await expect(vLine).toHaveCount(2);
  expect(await vLine.nth(0).innerText()).toBe('aaaa');
  expect(await vLine.nth(1).innerText()).toBe('bbbb');

  await emoji.click();
  const emojiMenu = page.locator('affine-emoji-menu');
  await expect(emojiMenu).toBeVisible();
  await page
    .locator('div')
    .filter({ hasText: /^😀😃😄😁😆😅🤣😂🙂$/ })
    .getByLabel('😆')
    .click();
  await page.getByTestId('page-editor-blank').click();
  await expect(emojiMenu).not.toBeVisible();
  await expect(emoji).toContainText('😆');
});
