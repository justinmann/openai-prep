import { expect, test, type Page } from '@playwright/test';
import { authenticateAs, testAccount } from 'ugly-app/playwright';

// The design page's Excalidraw whiteboard: sign-in gate, drawing, persistence,
// and grading a drawn answer (diagram image + outline reach the model).

const Q = 'design-webhooks';
const DIAGRAM_KEY = `oaiprep:diagram:${Q}`;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    const devOnly =
      msg.text().includes('received when fetching the script') ||
      /\/(ugly-push-sw\.js|manifest\.webmanifest)$/.test(msg.location().url);
    // Excalidraw registers an `unload` listener, which the page's
    // Permissions-Policy blocks; Chrome logs it but nothing breaks.
    const excalidrawUnload = msg
      .text()
      .includes('Permissions policy violation: unload');
    if (msg.type() === 'error' && !devOnly && !excalidrawUnload)
      errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

async function signIn(page: Page, name: string, requireSpend = false) {
  const acct = await testAccount(name, requireSpend ? { requireSpend } : {});
  await authenticateAs(
    page,
    acct,
    new URL(test.info().project.use.baseURL ?? 'http://localhost').hostname,
  );
}

test('the design page requires sign-in', async ({ page }) => {
  await page.goto(`/design/${Q}`);
  await expect(page.locator('.ugly-login-btn')).toBeVisible();
  await expect(page.locator('[data-id="design-whiteboard"]')).toHaveCount(0);
  await expect(page.locator('[data-id="grade-design"]')).toHaveCount(0);
});

test('drawing on the whiteboard is counted and survives a reload', async ({
  page,
}) => {
  await signIn(page, 'openai-prep-board');
  await page.goto('/');
  await page.evaluate((k) => localStorage.removeItem(k), DIAGRAM_KEY);
  const errors = trackErrors(page);
  await page.goto(`/design/${Q}`);

  const board = page.locator('[data-id="design-whiteboard"]');
  await expect(board.locator('canvas').first()).toBeVisible();
  await expect(page.locator('[data-id="design-editor"]')).toBeVisible();
  await expect(page.locator('.statusbar')).toContainText('0 on the board');

  // The radio input sits under its icon; click the label like a user would.
  await board
    .locator('label', {
      has: page.locator('[data-testid="toolbar-rectangle"]'),
    })
    .click();
  const box = (await board.boundingBox())!;
  const x = box.x + box.width * 0.35;
  const y = box.y + box.height * 0.4;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 160, y + 90, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator('.statusbar')).toContainText('1 on the board');
  await expect
    .poll(() =>
      page.evaluate(
        (k) =>
          (JSON.parse(localStorage.getItem(k) ?? '[]') as { type: string }[])
            .map((e) => e.type)
            .join(','),
        DIAGRAM_KEY,
      ),
    )
    .toBe('rectangle');

  await page.reload();
  await expect(board.locator('canvas').first()).toBeVisible();
  await expect(page.locator('.statusbar')).toContainText('1 on the board');

  // The notes panel collapses to give the board the full height.
  await page.locator('[data-id="toggle-notes"]').click();
  await expect(page.locator('[data-id="design-editor"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a drawn design with short notes gets AI feedback', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, 'openai-prep-design', true);

  // A minimal scene; Excalidraw's restore() fills in every other field.
  const shape = (id: string, x: number, label: string) => [
    {
      id,
      type: 'rectangle',
      x,
      y: 0,
      width: 160,
      height: 70,
      boundElements: [{ id: `${id}-t`, type: 'text' }],
    },
    {
      id: `${id}-t`,
      type: 'text',
      x: x + 10,
      y: 25,
      width: 140,
      height: 20,
      text: label,
      originalText: label,
      containerId: id,
    },
  ];
  const arrow = (id: string, from: string, to: string, x: number) => ({
    id,
    type: 'arrow',
    x,
    y: 35,
    width: 80,
    height: 0,
    points: [
      [0, 0],
      [80, 0],
    ],
    startBinding: { elementId: from, focus: 0, gap: 4 },
    endBinding: { elementId: to, focus: 0, gap: 4 },
  });
  const scene = [
    ...shape('prod', 0, 'Producers + outbox'),
    ...shape('kafka', 240, 'Kafka'),
    ...shape('fan', 480, 'Fan-out'),
    ...shape('disp', 720, 'Dispatchers'),
    ...shape('retry', 960, 'Retry delay queue'),
    arrow('a1', 'prod', 'kafka', 160),
    arrow('a2', 'kafka', 'fan', 400),
    arrow('a3', 'fan', 'disp', 640),
    arrow('a4', 'disp', 'retry', 880),
  ];
  const notes =
    'At-least-once delivery, HMAC signed, exponential backoff for 3 days then dead letter. Per-endpoint concurrency limits and circuit breakers. 200k deliveries/sec.';

  await page.goto('/');
  await page.evaluate(
    ([dk, nk, d, n]) => {
      localStorage.setItem(dk!, d!);
      localStorage.setItem(nk!, n!);
    },
    [DIAGRAM_KEY, `oaiprep:design:${Q}`, JSON.stringify(scene), notes],
  );
  const errors = trackErrors(page);
  const sent = page.waitForRequest(
    (r) => r.url().endsWith('/request') && r.method() === 'POST',
  );
  await page.goto(`/design/${Q}`);
  await expect(page.locator('.statusbar')).toContainText('9 on the board');
  await page.locator('[data-id="grade-design"]').click();

  // The request carries both the extracted outline and the PNG.
  const body = (await sent).postData() ?? '';
  expect(body).toContain('\\"Producers + outbox\\" → \\"Kafka\\"');
  expect(body).toContain('data:image/png;base64,');
  expect(body).toContain('"model":"claude_opus_5_5"');

  await expect(page.locator('[data-id="feedback"] .verdict-label')).toBeVisible(
    { timeout: 150_000 },
  );
  await expect(page.locator('[data-id="feedback"]')).toContainText(
    '9 on the board',
  );
  expect(errors).toEqual([]);
});
