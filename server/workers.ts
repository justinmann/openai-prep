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
import { createHandlers, type DbSurface } from './handlers';

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
  },
);
export default app;
export { CollectionDO, SessionDO };
