/**
 * Cloudflare Workers entry — built by `npm run build:workers` and uploaded by
 * Studio's `workers-deploy` step. Exposes fetch / scheduled / queue and the
 * CollectionDO / SessionDO durable objects referenced by wrangler.toml.
 *
 * The handlers below mirror `server/index.ts`. If you only deploy to Workers,
 * you can delete `server/index.ts` and route everything through this entry.
 */

import {
  CollectionDO,
  SessionDO,
  createWorkersApp,
  getAppContext,
} from 'ugly-app/server/adapter/workers';
import type { RequestHandlers } from 'ugly-app';

import { messages, requests } from '../shared/api';
import { collections } from '../shared/collections';
import { cronTasks } from '../shared/cron';
import { pages } from '../shared/pages';
import { createSsrRender } from 'ugly-app/server/ssr';
import { renderApp, strings } from '../client/appRoot';
import { RouterProvider } from '../client/router';
import { ssrPages } from '../client/ssrPages';
import { seoFor } from '../shared/seo';
import { createHandlers, type DbSurface } from './handlers';
import { ssrLoaders } from './ssrLoaders';

// Same handler module as server/index.ts, so the two entries cannot drift. The
// Worker has no long-lived app, so TypedDB comes from the request context.
const getDb = (): DbSurface => {
  const ctx = getAppContext();
  if (!ctx.typedDb) throw new Error('[workers] typedDb not initialized');
  return ctx.typedDb;
};
const requestHandlers: Partial<RequestHandlers<typeof requests>> =
  createHandlers(getDb);

// Cron handlers run on Cloudflare Cron Triggers (matches shared/cron.ts).
const cronHandlers = {};

// The registry MUST carry `pages` — `createWorkersApp` reads its route table
// from `registry.pages` (there is no Workers `configurator.setPages`).
const app = createWorkersApp(
  { requests, messages, pages },
  requestHandlers,
  collections,
  (cfg) => {
    cfg.setWorkers(cronTasks, cronHandlers);
    // Every page is server-rendered (shared/pages.ts) so search engines and
    // link previews see the real questions. The document is edge-cached and
    // identical for every visitor; sign-in state resolves after hydration.
    cfg.setSSR(
      createSsrRender({
        pages,
        ssrPages,
        loaders: ssrLoaders,
        RouterProvider,
        render: renderApp,
        strings,
        defaultMeta: {
          title: seoFor('', {}).title,
          description: seoFor('', {}).description,
          image: seoFor('', {}).image,
        },
      }),
    );
  },
);
export default app;
export { CollectionDO, SessionDO };
