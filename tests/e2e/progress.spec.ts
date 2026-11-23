import { expect, test, type Browser, type Page } from '@playwright/test';
import { seedDesign, signIn, trackErrors } from './helpers';

// Progress is stored per account on the server: work done in one browser must
// show up in another. Each "browser" is a separate Playwright context (its own
// cookies and localStorage) signed in as the same account.

async function secondBrowser(browser: Browser, slug: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, { slug, reset: [] });
  return page;
}

async function replaceCode(page: Page, text: string) {
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(text);
}

const saved = (page: Page) =>
  expect(page.locator('[data-id="save-status"]')).toHaveText('saved', {
    timeout: 15_000,
  });

test('code and test progress follow you to another browser', async ({
  page,
  browser,
}) => {
  const slug = 'openai-prep-progress-code';
  await signIn(page, { slug });
  const errors = trackErrors(page);
  const marker = `// draft ${Date.now()}`;

  await page.goto('/coding/kv-serialize');
  await expect(page.locator('.cm-content')).toContainText('function serialize');
  await replaceCode(
    page,
    `${marker}\nfunction serialize(d) { return ''; }\nfunction deserialize(s) { return {}; }\n`,
  );
  await saved(page);
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-fail').first()).toBeVisible();

  const other = await secondBrowser(browser, slug);
  await other.goto('/coding/kv-serialize');
  await expect(other.locator('.cm-content')).toContainText(marker);
  await other.goto('/');
  await expect(
    other.locator('a.qcard[href$="/coding/kv-serialize"] .badge'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('design notes and the whiteboard follow you to another browser', async ({
  page,
  browser,
}) => {
  const slug = 'openai-prep-progress-design';
  await signIn(page, { slug });
  await seedDesign(page, 'design-webhooks', { notes: '', diagram: [] });
  const errors = trackErrors(page);
  const marker = `Notes ${Date.now()}`;

  await page.goto('/design/design-webhooks');
  const board = page.locator('[data-id="design-whiteboard"]');
  await expect(board.locator('canvas').first()).toBeVisible();
  await page.locator('[data-id="design-editor"] .cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(marker);
  await board
    .locator('label', {
      has: page.locator('[data-testid="toolbar-rectangle"]'),
    })
    .click();
  const box = (await board.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.35 + 150,
    box.y + box.height * 0.4 + 80,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.locator('.statusbar')).toContainText('1 on the board');
  await saved(page);

  const other = await secondBrowser(browser, slug);
  await other.goto('/design/design-webhooks');
  await expect(other.locator('[data-id="design-editor"]')).toContainText(
    marker,
  );
  await expect(other.locator('.statusbar')).toContainText('1 on the board');
  expect(errors).toEqual([]);
});
