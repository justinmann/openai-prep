import { definePage, definePages } from 'ugly-app/shared';

// ─── Pages ────────────────────────────────────────────────────────────────────
// Every route your app supports. Each key is a URL path segment; the matching
// component is wired in client/allPages.ts.
//   definePage<Params>(options)  – Params types the URL params (path + query)
//
// Server-side rendering (public pages only):
//   ssr: true          – render this page in the Worker and edge-cache the result.
//                        The document is user-independent (no token, no cookie),
//                        so ONE cached entry serves every visitor; the browser
//                        resolves its session afterwards via /auth/token.
//                        Needs `auth: false`, a component in client/ssrPages.ts,
//                        and `cfg.setSSR(createSsrRender({…}))` in server/workers.ts.
//                        The Worker has no code splitting: everything an SSR'd
//                        page imports is bundled into worker.js.
//   ssrCacheTimeout: N – seconds the edge holds it. Omit for the default (1 year):
//                        a deploy changes the buildId and so invalidates every
//                        page. Set it only for content that changes BETWEEN deploys.
//   cacheQuery: ['q']  – query params that belong in the cache key. Any other
//                        param bypasses the cache entirely.
export const pages = definePages({
  '': definePage<{}>({ auth: false }),
});

// Keep `definePage` referenced for scaffolds with only the home route.
export type _DefinePage = typeof definePage;
export type AppPages = typeof pages;
