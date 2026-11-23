import { expect, test } from '@playwright/test';
import { api, seedDesign, signIn, trackErrors } from './helpers';

// The design page's Excalidraw whiteboard: sign-in gate, drawing, persistence,
// and grading a drawn answer (diagram image + outline reach the model).

const Q = 'design-webhooks';

test('signed out, the design brief is public and the whiteboard needs sign-in', async ({
  page,
}) => {
  await page.goto(`/design/${Q}`);
  await expect(page.locator('h1')).toHaveText(
    'Design a Webhook Delivery System',
  );
  await expect(
    page.getByRole('heading', { name: 'Functional requirements', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-id="gate-sign-in"]')).toBeVisible();
  await expect(page.locator('[data-id="design-whiteboard"]')).toHaveCount(0);
  await expect(page.locator('[data-id="grade-design"]')).toHaveCount(0);
});

test('drawing on the whiteboard is counted and survives a reload', async ({
  page,
}) => {
  await signIn(page);
  await seedDesign(page, Q, { notes: '', diagram: [] });
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
  // Saved to the account, not just the browser.
  await expect
    .poll(
      async () => {
        const { diagram } = await api<{ diagram: string | null }>(
          page,
          'designGet',
          { questionId: Q },
        );
        return (JSON.parse(diagram ?? '[]') as { type: string }[])
          .map((e) => e.type)
          .join(',');
      },
      { timeout: 15_000 },
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
  await signIn(page, { requireSpend: true });

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

  await seedDesign(page, Q, { notes, diagram: scene });
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
