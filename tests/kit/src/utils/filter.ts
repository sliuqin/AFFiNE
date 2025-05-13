import type { Page } from '@playwright/test';

// fixme: there could be multiple page lists in the Page
export const getPagesCount = async (page: Page) => {
  const locator = page.locator('[data-testid="virtualized-page-list"]');
  const pageListCount = await locator.count();

  if (pageListCount === 0) {
    return 0;
  }

  // locator is not a HTMLElement, so we can't use dataset
  // oxlint-disable-next-line unicorn/prefer-dom-node-dataset
  const count = await locator.getAttribute('data-total-count');
  return count ? parseInt(count) : 0;
};

export async function selectTag(page: Page, name: string | RegExp) {
  await page.getByTestId('filter-arg').click();
  await page.getByTestId(`multi-select-${name}`).click();
  await page.keyboard.press('Escape', { delay: 100 });
}
