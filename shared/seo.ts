// Search and link-preview metadata for every page. One function, read by the
// server (SSR head tags) and by the client (document title on navigation), so
// the two never disagree. scripts/genSeo.mts writes client/public/sitemap.xml
// from sitemapPaths(); a unit test keeps it in step.

import { companies, findCompany } from './companies';
import {
  codingQuestions,
  designQuestions,
  findCoding,
  findDesign,
} from './questions';

export const SITE_ORIGIN = 'https://interview.ugly.bot';
export const SITE_NAME = 'Interview Practice';
export const GITHUB_URL = 'https://github.com/justinmann/openai-prep';

export interface PageSeo {
  title: string;
  description: string;
  /** Absolute URL of the 1200x630 link-preview card. */
  image: string;
  /** False keeps the page out of search results (unknown ids). */
  index: boolean;
}

const og = (name: string) => `${SITE_ORIGIN}/og/${name}.png`;

const clip = (s: string, n = 158) =>
  s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;

const names = (ids: readonly string[]) =>
  ids.map((id) => findCompany(id)?.name).filter((n): n is string => Boolean(n));

const listNames = (n: string[]) =>
  n.length <= 1
    ? (n[0] ?? '')
    : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;

const HOME: PageSeo = {
  title:
    'Coding & System Design Interview Practice | OpenAI, Google, Meta, Amazon',
  description:
    'Real interview questions from OpenAI, Google, Meta, Amazon, Stripe and more. Run code in your browser and get system design feedback graded like each company.',
  image: og('site'),
  index: true,
};

export function seoFor(
  route: string,
  params: Record<string, string | undefined>,
): PageSeo {
  switch (route) {
    case '':
      return HOME;
    case 'questions':
      return {
        title: `All ${codingQuestions.length + designQuestions.length} Coding & System Design Interview Questions | ${SITE_NAME}`,
        description: `${codingQuestions.length} coding questions you run in the browser (TypeScript or Python) and ${designQuestions.length} system design questions with AI grading, tagged by company.`,
        image: og('site'),
        index: true,
      };
    case 'companies/:company': {
      const c = findCompany(params.company);
      if (!c)
        return {
          ...HOME,
          title: `Company not found | ${SITE_NAME}`,
          index: false,
        };
      const n =
        codingQuestions.filter((q) => q.companies.includes(c.id)).length +
        designQuestions.filter((q) => q.companies.includes(c.id)).length;
      return {
        title: `${c.name} Coding & System Design Interview Questions (${n}) | ${SITE_NAME}`,
        description: clip(
          `${n} ${c.name} interview questions reported by candidates. ${c.tagline} Practice with ${c.name}-weighted scoring.`,
        ),
        image: og('site'),
        index: true,
      };
    }
    case 'coding/:id': {
      const q = findCoding(params.id ?? '');
      if (!q)
        return {
          ...HOME,
          title: `Question not found | ${SITE_NAME}`,
          index: false,
        };
      const who = listNames(names(q.companies));
      return {
        title: `${q.title}: ${who ? `${who} ` : ''}Coding Interview Question | ${SITE_NAME}`,
        description: clip(
          `${q.summary} A ${q.parts.length}-part ${q.difficulty} coding question${who ? ` reported at ${who}` : ''}. Solve it in TypeScript or Python and run the tests in your browser.`,
        ),
        image: og(q.id),
        index: true,
      };
    }
    case 'design/:id': {
      const q = findDesign(params.id ?? '');
      if (!q)
        return {
          ...HOME,
          title: `Question not found | ${SITE_NAME}`,
          index: false,
        };
      const who = listNames(names(q.companies));
      return {
        title: `${q.title}: ${who ? `${who} ` : ''}System Design Interview | ${SITE_NAME}`,
        description: clip(
          `${q.summary} Requirements, scale numbers and rubric for this system design question${who ? ` reported at ${who}` : ''}. Draw your design and get AI feedback.`,
        ),
        image: og(q.id),
        index: true,
      };
    }
    default:
      return HOME;
  }
}

/** Every indexable path, for sitemap.xml. */
export function sitemapPaths(): string[] {
  return [
    '/',
    '/questions',
    ...companies.map((c) => `/companies/${c.id}`),
    ...codingQuestions.map((q) => `/coding/${q.id}`),
    ...designQuestions.map((q) => `/design/${q.id}`),
  ];
}

export function sitemapXml(): string {
  const urls = sitemapPaths()
    .map((p) => `  <url><loc>${SITE_ORIGIN}${p}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/** schema.org JSON-LD for a page, embedded by the page component itself. */
export function jsonLdFor(
  route: string,
  params: Record<string, string | undefined>,
): Record<string, unknown> | null {
  const seo = seoFor(route, params);
  if (route === 'coding/:id' || route === 'design/:id') {
    const q =
      route === 'coding/:id'
        ? findCoding(params.id ?? '')
        : findDesign(params.id ?? '');
    if (!q) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      'name': q.title,
      'description': q.summary,
      'learningResourceType':
        route === 'coding/:id' ? 'Coding exercise' : 'System design exercise',
      'educationalLevel': 'Professional',
      'isAccessibleForFree': true,
      'keywords': [...q.tags, ...names(q.companies)].join(', '),
      'url': `${SITE_ORIGIN}/${route.split('/')[0]}/${q.id}`,
      'image': seo.image,
      'provider': {
        '@type': 'Organization',
        'name': SITE_NAME,
        'url': SITE_ORIGIN,
      },
    };
  }
  if (route === '')
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': SITE_NAME,
      'url': SITE_ORIGIN,
      'description': seo.description,
    };
  return null;
}
