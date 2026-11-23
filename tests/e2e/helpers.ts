import { test, type Page } from '@playwright/test';
import {
  authenticateAs,
  testAccount,
  type TestAccount,
} from 'ugly-app/playwright';

// Every page requires sign-in and progress lives on the server, so specs sign
// in as their own test account (one per test, so parallel tests never share
// drafts) and seed state through the app's own API instead of localStorage.

const accounts = new WeakMap<Page, TestAccount>();

function slugFor(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `openai-prep-${slug}`;
}

/** POST /api/:name as the page's signed-in account. */
export async function api<T = unknown>(
  page: Page,
  name: string,
  input: unknown,
): Promise<T> {
  const acct = accounts.get(page);
  if (!acct) throw new Error('api(): call signIn(page) first');
  const res = await page.request.post(`/api/${name}`, {
    data: { input },
    headers: { Authorization: `Bearer ${acct.token}` },
  });
  if (!res.ok())
    throw new Error(`/api/${name} ${res.status()}: ${await res.text()}`);
  const body = (await res.json()) as { result?: T } | T;
  return (
    body && typeof body === 'object' && 'result' in body ? body.result : body
  ) as T;
}

/**
 * Sign in as this test's own account and reset the coding questions it uses to
 * the starter code, with TypeScript as the language.
 */
export async function signIn(
  page: Page,
  opts: { reset?: string[]; slug?: string; requireSpend?: boolean } = {},
): Promise<TestAccount> {
  const acct = await testAccount(
    opts.slug ?? slugFor(test.info().title),
    opts.requireSpend ? { requireSpend: true } : {},
  );
  await authenticateAs(
    page,
    acct,
    new URL(test.info().project.use.baseURL ?? 'http://localhost').hostname,
  );
  accounts.set(page, acct);
  await api(page, 'prefsSet', { language: 'typescript', level: 'L5' });
  for (const questionId of opts.reset ?? ['kv-serialize'])
    for (const language of ['typescript', 'python'])
      await api(page, 'codingSave', { questionId, language, code: null });
  return acct;
}

export async function seedCode(
  page: Page,
  questionId: string,
  code: string,
  language: 'typescript' | 'python' = 'typescript',
): Promise<void> {
  await api(page, 'codingSave', { questionId, language, code });
  if (language === 'python') await api(page, 'prefsSet', { language });
}

export async function seedDesign(
  page: Page,
  questionId: string,
  work: { notes?: string; diagram?: unknown[] },
): Promise<void> {
  await api(page, 'designSave', {
    questionId,
    ...(work.notes !== undefined ? { notes: work.notes } : {}),
    ...(work.diagram !== undefined
      ? { diagram: JSON.stringify(work.diagram) }
      : {}),
  });
}

/** Console/page errors, ignoring dev-only noise. */
export function trackErrors(page: Page): string[] {
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

/**
 * Wait until React has hydrated the server-rendered page. In production a
 * click before this lands on static HTML and does nothing.
 */
export async function waitHydrated(page: Page): Promise<void> {
  await page.waitForSelector('html[data-hydrated="1"]', { state: 'attached' });
}
