import { expect, test, type Page } from '@playwright/test';
import { signIn, waitHydrated } from './helpers';

// Code formatting: Prettier for TypeScript, Ruff for Python; manual (button or
// Shift+Alt+F) and auto (before each run); options change the output.

async function open(page: Page, lang: 'typescript' | 'python') {
  await signIn(page, { reset: ['kv-serialize'] });
  await page.goto('/coding/kv-serialize');
  await waitHydrated(page);
  await page.evaluate(() => localStorage.removeItem('oaiprep:format'));
  await page.locator(`[data-id="lang-${lang}"]`).click();
  await expect(page.locator('.cm-content')).toContainText(
    lang === 'python' ? 'def serialize' : 'function serialize',
  );
}

async function setCode(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(text);
}

test.describe('formatting', () => {
  test.setTimeout(120_000);

  test('typescript: Format button and shortcut, with options', async ({
    page,
  }) => {
    await open(page, 'typescript');
    await setCode(page, 'const a = {x:1,y:"s"}');
    await page.locator('[data-id="format-code"]').click();
    await expect(page.locator('.cm-content')).toHaveText(
      "const a = { x: 1, y: 's' };",
    );

    await page.locator('[data-id="open-format-settings"]').click();
    await page.locator('[data-id="fmt-semi-false"]').click();
    await page.locator('[data-id="fmt-quotes-false"]').click();
    await page.locator('[data-id="format-settings-close"]').click();
    await page.locator('[data-id="format-code"]').click();
    await expect(page.locator('.cm-content')).toHaveText(
      'const a = { x: 1, y: "s" }',
    );

    await setCode(page, 'let b=[1,2]');
    await page.keyboard.press('Shift+Alt+KeyF');
    await expect(page.locator('.cm-content')).toHaveText('let b = [1, 2]');
  });

  test('typescript: a syntax error is reported, code untouched', async ({
    page,
  }) => {
    await open(page, 'typescript');
    await setCode(page, 'function (');
    await page.locator('[data-id="format-code"]').click();
    await expect(page.locator('[data-id="format-error"]')).toContainText(
      'Could not format',
    );
    await expect(page.locator('.cm-content')).toHaveText('function (');
  });

  test('auto mode formats before running', async ({ page }) => {
    await open(page, 'typescript');
    await page.locator('[data-id="open-format-settings"]').click();
    await page.locator('[data-id="fmt-mode-auto"]').click();
    await page.locator('[data-id="format-settings-close"]').click();
    await expect(
      page.locator('[data-id="open-format-settings"]'),
    ).toContainText('Auto');
    await setCode(page, 'console.log( "hi" )');
    await page.locator('[data-id="run-code"]').click();
    await expect(page.locator('[data-id="run-ok"]')).toBeVisible();
    await expect(page.locator('.cm-content')).toHaveText("console.log('hi');");
  });

  test('python: Ruff formats with the chosen indent', async ({ page }) => {
    await open(page, 'python');
    await setCode(page, 'def f( a,b ):\n  return {"x":a}');
    await page.locator('[data-id="format-code"]').click();
    await expect(page.locator('.cm-content')).toContainText(
      "def f(a, b):    return {'x': a}",
    );
    await page.locator('[data-id="open-format-settings"]').click();
    await page.locator('[data-id="fmt-indent-2"]').click();
    await page.locator('[data-id="format-settings-close"]').click();
    await page.locator('[data-id="format-code"]').click();
    await expect(page.locator('.cm-content')).toContainText(
      "def f(a, b):  return {'x': a}",
    );
  });
});
