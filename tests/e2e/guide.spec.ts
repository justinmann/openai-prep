import { expect, test, type Page } from '@playwright/test';
import { signIn, waitHydrated } from './helpers';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    const devOnly =
      msg.text().includes('received when fetching the script') ||
      /\/(ugly-push-sw\.js|manifest\.webmanifest)$/.test(msg.location().url);
    if (msg.type() === 'error' && !devOnly)
      errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test('the ? guide opens with tabs, searches, and switches language', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await signIn(page);
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="lang-typescript"]').click();
  await page.locator('[data-id="open-guide"]').click();
  const guide = page.locator('[data-id="language-guide"]');
  await expect(guide).toBeVisible();
  await expect(
    guide.getByRole('heading', { name: 'TypeScript guide' }),
  ).toBeVisible();

  await guide.getByRole('tab', { name: 'Loops', exact: true }).first().click();
  await expect(page.locator('[data-id="guide-tab-loops"]')).toContainText(
    'for...of',
  );

  await guide
    .getByRole('tab', { name: 'Libraries', exact: true })
    .first()
    .click();
  await expect(page.locator('[data-id="guide-tab-libraries"]')).toContainText(
    'lodash-es',
  );

  await page.locator('[data-id="guide-lang-python"]').click();
  await expect(
    guide.getByRole('heading', { name: 'Python guide' }),
  ).toBeVisible();
  await guide
    .getByRole('tab', { name: 'Libraries', exact: true })
    .first()
    .click();
  const libs = page.locator('[data-id="guide-tab-libraries"]');
  await expect(libs.locator('.chip', { hasText: /^heapq$/ })).toBeVisible();
  await expect(libs.locator('.chip', { hasText: /^numpy$/ })).toBeVisible();

  await page
    .locator('[data-id="guide-search"] input, input[data-id="guide-search"]')
    .first()
    .fill('deque');
  await expect(page.locator('[data-id="guide-search-results"]')).toContainText(
    'deque',
  );

  await page.locator('[data-id="guide-close"]').click();
  await expect(guide).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the guide opens in the current language and closes on Escape', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/coding/kv-serialize');
  await waitHydrated(page);
  await page.locator('[data-id="lang-python"]').click();
  await page.locator('[data-id="open-guide"]').click();
  const guide = page.locator('[data-id="language-guide"]');
  await expect(
    guide.getByRole('heading', { name: 'Python guide' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
});
