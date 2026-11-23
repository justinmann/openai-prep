import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

// "Run code", and the editor's language services (completions, underlines).

async function useLanguage(page: Page, lang: 'typescript' | 'python') {
  await signIn(page);
  await page.goto('/coding/kv-serialize');
  await page.locator(`[data-id="lang-${lang}"]`).click();
  await expect(page.locator('.cm-content')).toContainText(
    lang === 'python' ? 'def serialize' : 'function serialize',
  );
}

async function replaceCode(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  // insertText avoids auto-indent and bracket closing while typing.
  await page.keyboard.insertText(text);
}

test.describe('run code', () => {
  test.setTimeout(120_000);

  test('typescript: runs the file with top-level await and shows output', async ({
    page,
  }) => {
    await useLanguage(page, 'typescript');
    await replaceCode(
      page,
      'console.log("start");\nawait new Promise((r) => setTimeout(r, 10));\nconsole.log([1, 2].map((x) => x * 2));\n',
    );
    await page.locator('[data-id="run-code"]').click();
    await expect(page.locator('[data-id="run-ok"]')).toBeVisible();
    await expect(page.locator('.console')).toContainText('start');
    await expect(page.locator('.console')).toContainText('[2, 4]');
    // Test results are untouched by a plain run.
    await page.locator('[data-id="tab-results"]').click();
    await expect(page.locator('.t-pass, .t-fail')).toHaveCount(0);
  });

  test('typescript: errors are shown, and Shift+Cmd+Enter runs code', async ({
    page,
  }) => {
    await useLanguage(page, 'typescript');
    await replaceCode(page, 'throw new Error("boom");\n');
    await page.keyboard.press('ControlOrMeta+Shift+Enter');
    await expect(page.locator('[data-id="run-error"]')).toContainText(
      'Error: boom',
    );
  });

  test('python: runs the file with top-level await and prints', async ({
    page,
  }) => {
    await useLanguage(page, 'python');
    await replaceCode(
      page,
      'print("start")\nawait asyncio.sleep(0.01)\nprint(sorted({3, 1, 2}))\n',
    );
    await page.locator('[data-id="run-code"]').click();
    await expect(page.locator('[data-id="run-ok"]')).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator('.console')).toContainText('[1, 2, 3]');
  });
});

test.describe('language services', () => {
  test.setTimeout(120_000);

  test('typescript: type errors are underlined, completions and hover work', async ({
    page,
  }) => {
    await useLanguage(page, 'typescript');
    await replaceCode(
      page,
      'const xs: number[] = [3, 1];\nconst n: string = 5;\n',
    );
    await expect(page.locator('.cm-lintRange-error')).toHaveText('n', {
      timeout: 60_000,
    });
    await page.keyboard.type('xs.fil');
    await expect(page.locator('.cm-tooltip-autocomplete')).toContainText(
      'filter',
    );
    await page.keyboard.press('Escape');
    await page
      .locator('.cm-line', { hasText: 'const xs' })
      .getByText('xs')
      .first()
      .hover();
    await expect(page.locator('.cm-tooltip-hover')).toContainText(
      'const xs: number[]',
    );
  });

  test('python: syntax errors are underlined and jedi completes', async ({
    page,
  }) => {
    await useLanguage(page, 'python');
    await replaceCode(page, 'import collections\nx = (1,\n');
    await expect(page.locator('.cm-lintRange-error')).toHaveCount(1, {
      timeout: 90_000,
    });
    await replaceCode(page, 'import collections\ncollections.de');
    await page.keyboard.press('Control+Space');
    await expect(page.locator('.cm-tooltip-autocomplete')).toContainText(
      'deque',
      { timeout: 30_000 },
    );
  });
});
