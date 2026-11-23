import { expect, test } from '@playwright/test';
import { signIn, trackErrors, waitHydrated } from './helpers';

// Browsing is public; writing code and grading need an account. Company
// choice changes how scores are weighted.

test('signed out: landing, question list, company page and a question page all render', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await waitHydrated(page);
  await expect(page.locator('h1')).toContainText(
    'Practice the coding and system design',
  );
  await expect(page.locator('[data-id="cta-github"]')).toHaveAttribute(
    'href',
    'https://github.com/justinmann/openai-prep',
  );
  await expect(page.getByText(/hello interview/i)).toHaveCount(0);

  // Follow links by href: a click lands mid-way through the router's slide
  // animation, which can hit the incoming page and start a second navigation.
  await expect(page.locator('[data-id="company-stripe"]')).toHaveAttribute(
    'href',
    '/companies/stripe',
  );
  await page.goto('/companies/stripe');
  await expect(
    page.getByRole('heading', { level: 1, name: /Stripe coding/ }),
  ).toBeVisible();
  await expect(
    page.getByText('Idempotency and retries', { exact: true }),
  ).toBeVisible();

  await expect(
    page.locator('[data-id="q-design-payment-ledger"]').last(),
  ).toHaveAttribute('href', '/design/design-payment-ledger');
  await page.goto('/design/design-payment-ledger');
  await expect(page.locator('[data-id="gate-sign-in"]:visible')).toBeVisible();

  await page.goto('/coding/lru-cache-ttl');
  await expect(page.locator('h1')).toHaveText('LRU Cache with TTL');
  await expect(
    page.getByRole('heading', { name: 'Part 2: Per-key TTL' }),
  ).toBeVisible();
  await expect(page.locator('[data-id="signin-gate"]')).toBeVisible();
  await expect(page.locator('.cm-content')).toHaveCount(0);
  await expect(page).toHaveTitle(/LRU Cache with TTL/);
  expect(errors).toEqual([]);
});

test('the question list filters by company', async ({ page }) => {
  await page.goto('/questions');
  await waitHydrated(page);
  await expect(page.locator('.qcard').first()).toBeVisible();
  const all = await page.locator('.qcard').count();
  await page.locator('[data-id="filter-uber"]').click();
  await expect(page.locator('[data-id="q-word-ladder"]')).toHaveCount(0);
  const uber = await page.locator('.qcard').count();
  expect(uber).toBeGreaterThan(0);
  expect(uber).toBeLessThan(all);
  await expect(
    page.locator('[data-id="q-design-ride-dispatch"]'),
  ).toBeVisible();
});

test('signed in: a company readiness score follows a passing run', async ({
  page,
}) => {
  const { codingQuestions } = await import('../../shared/questions');
  const q = codingQuestions.find((x) => x.id === 'kv-serialize')!;
  await signIn(page, { reset: ['kv-serialize'] });
  await page.goto('/coding/kv-serialize');
  await expect(page.locator('.cm-content')).toContainText('function serialize');
  await page.locator('[data-id="open-company-picker"]').click();
  await page.locator('[data-id="pick-google"]').click();
  await expect(page.locator('[data-id="open-company-picker"]')).toContainText(
    'Google',
  );

  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText(q.solution);
  await page.locator('[data-id="run-tests"]').click();
  await expect(page.locator('.allpass')).toBeVisible();
  await expect(page.locator('[data-id="readiness"]')).toContainText('10/10');
  await expect(page.locator('[data-id="readiness"]')).toContainText(
    'Google readiness',
  );
});
