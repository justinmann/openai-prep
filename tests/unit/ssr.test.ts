import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSsrRender } from 'ugly-app/server/ssr';
import { renderApp, strings } from '../../client/appRoot';
import { RouterProvider } from '../../client/router';
import { ssrPages } from '../../client/ssrPages';
import { ssrLoaders } from '../../server/ssrLoaders';
import { companies } from '../../shared/companies';
import { pages } from '../../shared/pages';
import { codingQuestions, designQuestions } from '../../shared/questions';
import { seoFor, sitemapPaths, sitemapXml } from '../../shared/seo';

// Renders every page exactly as the Worker does, with no `window`: the only
// proof a page is safe to server-render. A page that touches the browser
// during render throws here instead of falling back to an empty shell.
const render = createSsrRender({
  pages,
  ssrPages,
  loaders: ssrLoaders,
  RouterProvider,
  render: renderApp,
  strings,
});

async function ssr(path: string) {
  const res = await render({
    url: new URL(`https://interview.ugly.bot${path}`),
    db: null as never,
  } as never);
  expect(res, path).not.toBeNull();
  return res!;
}

const text = (html: string) => html.replace(/<[^>]+>/g, ' ');

describe('server rendering', () => {
  it('every sitemap page renders with its own title and an h1', async () => {
    const titles = new Set<string>();
    for (const path of sitemapPaths()) {
      const { html, meta } = await ssr(path);
      expect(html, path).toMatch(/<h1[\s>]/);
      expect(meta.title, path).toBeTruthy();
      expect(meta.description!.length, path).toBeLessThanOrEqual(160);
      titles.add(meta.title!);
    }
    expect(titles.size).toBe(sitemapPaths().length);
  }, 60_000);

  it('a coding page carries the prompt, parts, companies and a sign-in gate, not the editor', async () => {
    const q = codingQuestions.find((x) => x.id === 'spreadsheet')!;
    const { html, meta } = await ssr('/coding/spreadsheet');
    for (const p of q.parts) expect(text(html)).toContain(p.title);
    expect(html).toContain('data-id="signin-gate"');
    expect(html).toContain('href="/companies/openai"');
    expect(html).toContain('application/ld+json');
    expect(html).not.toContain('cm-content');
    expect(meta.image).toBe('https://interview.ugly.bot/og/spreadsheet.png');
  });

  it('a design page carries the requirements and rubric', async () => {
    const q = designQuestions.find((x) => x.id === 'design-payment-ledger')!;
    const { html } = await ssr('/design/design-payment-ledger');
    expect(text(html)).toContain(q.functional[0]!.slice(0, 40));
    expect(text(html)).toContain(q.rubric[1]!.label);
    expect(html).toContain('data-id="signin-gate"');
  });

  it('the landing page links every company and the GitHub repo', async () => {
    const { html } = await ssr('/');
    for (const c of companies)
      expect(html).toContain(`href="/companies/${c.id}"`);
    expect(html).toContain('https://github.com/justinmann/openai-prep');
    expect(html.toLowerCase()).not.toContain('hello interview');
  });

  it('a company page lists only that company’s questions', async () => {
    const { html } = await ssr('/companies/stripe');
    expect(text(html)).toMatch(/Stripe\s+coding/);
    expect(html).toContain('href="/design/design-payment-ledger"');
    expect(html).not.toContain('href="/coding/word-ladder"');
  });

  it('unknown ids render a not-found page that is kept out of search', async () => {
    const { html } = await ssr('/coding/nope');
    expect(html).toContain('data-id="not-found"');
    expect(seoFor('coding/:id', { id: 'nope' }).index).toBe(false);
  });
});

describe('seo assets', () => {
  it('the committed sitemap is current (run scripts/genSeo.mts)', () => {
    expect(readFileSync('client/public/sitemap.xml', 'utf8')).toBe(
      sitemapXml(),
    );
  });

  it('every question has a share card (run scripts/genOgImages.mts)', () => {
    for (const q of [...codingQuestions, ...designQuestions])
      expect(existsSync(`client/public/og/${q.id}.png`), q.id).toBe(true);
    expect(existsSync('client/public/og/site.png')).toBe(true);
  });

  it('no question cites Hello Interview', () => {
    for (const q of [...codingQuestions, ...designQuestions])
      for (const s of q.sources) expect(s).not.toMatch(/hellointerview/i);
  });
});
