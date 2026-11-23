import { expect, test } from '@playwright/test';
import { codingQuestions } from '../../shared/questions/coding';
import {
  seedCode,
  seedDesign,
  signIn,
  trackErrors,
  waitHydrated,
} from './helpers';

test('the question list shows every question, with progress when signed in', async ({
  page,
}) => {
  const { codingQuestions: all, designQuestions } =
    await import('../../shared/questions');
  await signIn(page);
  const errors = trackErrors(page);
  await page.goto('/questions');
  await expect(
    page.getByRole('heading', {
      name: 'Coding & system design interview questions',
    }),
  ).toBeVisible();
  await expect(page.locator('.qcard')).toHaveCount(
    all.length + designQuestions.length,
  );
  expect(errors).toEqual([]);
});

test('starter code runs and fails the tests', async ({ page }) => {
  await signIn(page);
  const errors = trackErrors(page);
  await page.goto('/coding/kv-serialize');
  await expect(page.locator('.cm-content')).toContainText('function serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-fail').first()).toBeVisible();
  await expect(page.locator('.allpass')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reference solution passes every test in the browser', async ({
  page,
}) => {
  await signIn(page);
  const q = codingQuestions.find((x) => x.id === 'kv-serialize')!;
  const total = q.parts.reduce((n, p) => n + p.tests.length, 0);
  await seedCode(page, 'kv-serialize', q.solution);
  const errors = trackErrors(page);
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.allpass')).toContainText(
    `All ${total} tests pass`,
  );
  await expect(page.locator('.t-pass')).toHaveCount(total);
  expect(errors).toEqual([]);
});

test('typing in the editor and the console tab work', async ({ page }) => {
  await signIn(page);
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="reset-code"]').click();
  await page.locator('[data-id="confirm-reset"]').click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('console.log("hello from the sandbox")\n');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.t-fail').first()).toBeVisible();
  await page.locator('[data-id="tab-console"]').click();
  await expect(page.locator('.console')).toContainText(
    'hello from the sandbox',
  );
});

test('an infinite loop is stopped, not frozen', async ({ page }) => {
  await signIn(page);
  await seedCode(
    page,
    'kv-serialize',
    'function serialize(d) { while (true) {} }\nfunction deserialize(s) { return {}; }',
  );
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-timeout').first()).toContainText(
    'Infinite loop',
    { timeout: 15_000 },
  );
  await expect(page.locator('.t-skipped').first()).toBeVisible();
  await expect(page.locator('[data-id="run-tests"]')).toBeVisible();
});

test('npm packages can be imported from esm.sh', async ({ page }) => {
  await signIn(page);
  const code = [
    "import { chunk } from 'lodash-es';",
    "import * as _ from 'lodash-es';",
    'function serialize(d: Record<string, string>): string {',
    "  console.log('chunks', JSON.stringify(chunk([1, 2, 3], 2)), typeof _.isEqual);",
    "  return '';",
    '}',
    'function deserialize(s: string): Record<string, string> { return {}; }',
  ].join('\n');
  await seedCode(page, 'kv-serialize', code);
  const errors = trackErrors(page);
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-pass').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('[data-id="tab-console"]').click();
  await expect(page.locator('.console')).toContainText(
    'chunks [[1,2],[3]] function',
  );
  expect(errors).toEqual([]);
});

test('a missing package is reported by name', async ({ page }) => {
  await signIn(page);
  await seedCode(
    page,
    'kv-serialize',
    "import x from 'this-package-does-not-exist-zz9';\nconsole.log(x);",
  );
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-fail').first()).toContainText(
    'Could not import "this-package-does-not-exist-zz9"',
    { timeout: 30_000 },
  );
});

test('a syntax error is reported', async ({ page }) => {
  await signIn(page);
  await seedCode(page, 'kv-serialize', 'function serialize( {');
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.compile-error')).toContainText(
    'Could not compile',
  );
});

test('design answer gets AI feedback', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, { requireSpend: true });
  const answer = [
    '## Requirements',
    'Deliver every event at least once to each subscribed HTTPS endpoint, retry with backoff for 3 days.',
    '## Design',
    'Producers write events to Kafka through a transactional outbox, so nothing is lost after ack.',
    'A fan-out service reads Kafka, looks up subscriptions from a cached Postgres table and writes one delivery row per endpoint.',
    'Dispatcher workers POST with a 10 second timeout and an HMAC-SHA256 signature over timestamp plus body.',
    'Failures are rescheduled with exponential backoff and jitter in a delay queue; after 3 days they go to a dead letter table and the endpoint is disabled after repeated failure.',
    'Each endpoint has its own concurrency limit and a circuit breaker so a slow customer cannot block others.',
    'Events carry a unique id so receivers can dedupe; we do not guarantee ordering.',
    'Customers see attempts in a dashboard and can replay an event, which enqueues a new delivery.',
    '20k events/sec times 10 endpoints is 200k deliveries/sec, so we need a few hundred dispatcher workers.',
  ].join('\n');
  await seedDesign(page, 'design-webhooks', { notes: answer, diagram: [] });
  await page.goto('/design/design-webhooks');
  await page.locator('[data-id="grade-design"]').click();
  await expect(page.locator('[data-id="feedback"] .verdict-label')).toBeVisible(
    { timeout: 150_000 },
  );
  await expect(page.locator('[data-id="feedback"] .cov')).toHaveCount(
    3 + 3 + 7,
  ); // functional + non-functional + rubric
});

test.describe('python', () => {
  test.setTimeout(120_000);

  test('switching to Python shows the Python starter and remembers it', async ({
    page,
  }) => {
    await signIn(page);
    const errors = trackErrors(page);
    await page.goto('/coding/kv-serialize');
    await waitHydrated(page);
    await page.locator('[data-id="lang-python"]').click();
    await expect(page.locator('.cm-content')).toContainText('def serialize');
    await page.reload();
    await expect(page.locator('.cm-content')).toContainText('def serialize');
    await page.locator('[data-id="lang-typescript"]').click();
    await expect(page.locator('.cm-content')).toContainText(
      'function serialize',
    );
    expect(errors).toEqual([]);
  });

  test('reference solution passes every test in Pyodide', async ({ page }) => {
    await signIn(page);
    const { codingQuestions: all } = await import('../../shared/questions');
    const q = all.find((x) => x.id === 'kv-serialize')!;
    const total = q.parts.reduce((n, p) => n + p.tests.length, 0);
    await seedCode(page, 'kv-serialize', q.python!.solution, 'python');
    const errors = trackErrors(page);
    await page.goto('/coding/kv-serialize');
    await page.locator('[data-id="run-tests"]').click();
    await expect(page.locator('.allpass')).toContainText(
      `All ${total} tests pass`,
      { timeout: 90_000 },
    );
    expect(errors).toEqual([]);
  });

  test('print goes to the console, errors name the line, loops are stopped', async ({
    page,
  }) => {
    await signIn(page);
    await seedCode(
      page,
      'kv-serialize',
      'print("hello from python")\n\ndef serialize(d):\n    return 1 / 0\n\ndef deserialize(s):\n    return {}\n',
      'python',
    );
    await page.goto('/coding/kv-serialize');
    await page.locator('[data-id="run-tests"]').click();
    await expect(page.locator('.tmsg').first()).toContainText(
      'ZeroDivisionError: division by zero (solution.py line 4)',
      { timeout: 90_000 },
    );
    await page.locator('[data-id="tab-console"]').click();
    await expect(page.locator('.console')).toContainText('hello from python');

    // A hang kills the worker; the next run must start a fresh one.
    await page.locator('.cm-content').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('while True:\npass\n');
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('.t-timeout')).toBeVisible({ timeout: 90_000 });
    await page.locator('.cm-content').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('def serialize(d):\nreturn ""\n');
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect(page.locator('.t-fail').first()).toBeVisible({
      timeout: 90_000,
    });
  });

  test('syntax errors are reported', async ({ page }) => {
    await signIn(page);
    await seedCode(page, 'kv-serialize', 'def serialize(:\n', 'python');
    await page.goto('/coding/kv-serialize');
    await page.locator('[data-id="run-tests"]').click();
    await expect(page.locator('.compile-error')).toContainText('SyntaxError', {
      timeout: 90_000,
    });
  });
});
