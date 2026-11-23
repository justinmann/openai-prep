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
} from 'ugly-app/server/adapter/workers';

import { messages, requests } from '../shared/api';
import { collections } from '../shared/collections';
import { cronTasks } from '../shared/cron';
import { pages } from '../shared/pages';

// Request handlers run inside the Worker for `fetch` requests. Keep these in
// sync with `server/index.ts` — a handler registered only on the Node entry is
// "not registered" on the deployed Worker. (`app` is referenced inside the async
// body, resolved at request time after `app` below is assigned.)
// Untyped on purpose, like `cronHandlers` below: a fresh scaffold declares no
// requests, so `Partial<RequestHandlers<typeof requests>>` resolves to `{}` and
// trips no-generated-empty-object-type. `createWorkersApp` type-checks this
// argument, so a handler that does not match its request is still caught.
const requestHandlers = {
};

// Cron handlers run on Cloudflare Cron Triggers (matches shared/cron.ts).
const cronHandlers = {
};

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
