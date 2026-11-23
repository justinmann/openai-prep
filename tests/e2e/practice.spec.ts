import { expect, test, type Page } from '@playwright/test';
import { authenticateAs, testAccount } from 'ugly-app/playwright';
import { codingQuestions } from '../../shared/questions/coding';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    // Dev-only: the framework's push service worker is not served locally.
    if (msg.type() === 'error' && !msg.text().includes('received when fetching the script')) errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

async function seedDraft(page: Page, key: string, value: string) {
  await page.goto('/');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [key, value]);
}

test('home lists coding and design questions', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OpenAI coding & system design' })).toBeVisible();
  await expect(page.locator('.qcard')).toHaveCount(17);
  expect(errors).toEqual([]);
});

test('starter code runs and fails the tests', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/coding/kv-serialize');
  await expect(page.locator('.cm-content')).toContainText('function serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-fail').first()).toBeVisible();
  await expect(page.locator('.allpass')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reference solution passes every test in the browser', async ({ page }) => {
  const q = codingQuestions.find((x) => x.id === 'kv-serialize')!;
  const total = q.parts.reduce((n, p) => n + p.tests.length, 0);
  await seedDraft(page, 'oaiprep:code:kv-serialize', q.solution);
  const errors = trackErrors(page);
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.allpass')).toContainText(`All ${total} tests pass`);
  await expect(page.locator('.t-pass')).toHaveCount(total);
  expect(errors).toEqual([]);
});

test('typing in the editor and the console tab work', async ({ page }) => {
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="reset-code"]').click();
  await page.locator('[data-id="confirm-reset"]').click();
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('console.log("hello from the sandbox")\n');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('.t-fail').first()).toBeVisible();
  await page.locator('[data-id="tab-console"]').click();
  await expect(page.locator('.console')).toContainText('hello from the sandbox');
});

test('an infinite loop is stopped, not frozen', async ({ page }) => {
  await seedDraft(page, 'oaiprep:code:kv-serialize', 'function serialize(d) { while (true) {} }\nfunction deserialize(s) { return {}; }');
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-timeout').first()).toContainText('Infinite loop', { timeout: 15_000 });
  await expect(page.locator('.t-skipped').first()).toBeVisible();
  await expect(page.locator('[data-id="run-tests"]')).toBeVisible();
});

test('npm packages can be imported from esm.sh', async ({ page }) => {
  const code = [
    "import { chunk } from 'lodash-es';",
    "import * as _ from 'lodash-es';",
    'function serialize(d: Record<string, string>): string {',
    "  console.log('chunks', JSON.stringify(chunk([1, 2, 3], 2)), typeof _.isEqual);",
    "  return '';",
    '}',
    'function deserialize(s: string): Record<string, string> { return {}; }',
  ].join('\n');
  await seedDraft(page, 'oaiprep:code:kv-serialize', code);
  const errors = trackErrors(page);
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-pass').first()).toBeVisible({ timeout: 30_000 });
  await page.locator('[data-id="tab-console"]').click();
  await expect(page.locator('.console')).toContainText('chunks [[1,2],[3]] function');
  expect(errors).toEqual([]);
});

test('a missing package is reported by name', async ({ page }) => {
  await seedDraft(page, 'oaiprep:code:kv-serialize', "import x from 'this-package-does-not-exist-zz9';\nconsole.log(x);");
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.t-fail').first()).toContainText('Could not import "this-package-does-not-exist-zz9"', { timeout: 30_000 });
});

test('a syntax error is reported', async ({ page }) => {
  await seedDraft(page, 'oaiprep:code:kv-serialize', 'function serialize( {');
  await page.goto('/coding/kv-serialize');
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.compile-error')).toContainText('Could not compile');
});

test('design answer gets AI feedback', async ({ page }) => {
  test.setTimeout(180_000);
  const acct = await testAccount('openai-prep-design', { requireSpend: true });
  await authenticateAs(page, acct, 'localhost');
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
  await seedDraft(page, 'oaiprep:design:design-webhooks', answer);
  await page.goto('/design/design-webhooks');
  await page.locator('[data-id="grade-design"]').click();
  await expect(page.locator('[data-id="feedback"] .verdict-label')).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('[data-id="feedback"] .cov')).toHaveCount(3 + 3 + 7); // functional + non-functional + rubric
});
