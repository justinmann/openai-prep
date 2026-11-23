import { expect, test } from '@playwright/test';

// App-agnostic smoke test. Asserts the app boots and the home route renders WITHOUT
// asserting any specific content — apps are meant to replace the home page with their
// own UI, so this test must never pin scaffold-specific elements (a test that does
// would punish you for building your actual app). It also fails on any uncaught error
// thrown during load, which catches the most common "looks built but crashes when you
// open it" bug. Use this as the pattern for your own page tests: navigate, assert your
// UI rendered, and assert no console/page errors.
test('home page boots and renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    // Dev-only: the framework's push service worker is not served locally.
    if (msg.type() === 'error' && !msg.text().includes('received when fetching the script')) errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/');

  // The app mounts into #root (see client/index.html). Assert it rendered something.
  const root = page.locator('#root');
  await expect(root).toBeVisible();
  await expect(root).not.toBeEmpty();

  expect(errors, `App logged errors on load:\n${errors.join('\n')}`).toEqual(
    [],
  );
});
