import { createApp, type AppConfigurator, type InboundEmail } from 'ugly-app';
import { messages, requests } from '../shared/api';
import { collections } from '../shared/collections';
import { cronTasks } from '../shared/cron';
import { experiments } from '../shared/experiments';
import en from '../shared/lang/en';
import es from '../shared/lang/es';
import { pages } from '../shared/pages';
import { stringsDef } from '../shared/strings';

// Untyped on purpose: a fresh scaffold declares no cron tasks, so
// `WorkerHandlers<typeof cronTasks>` resolves to `{}` and trips
// no-generated-empty-object-type. `setWorkers(cronTasks, cronHandlers)` below
// still checks the pair, so adding a task and a mismatched handler is caught.
const cronHandlers = {
};

const app = createApp(
  { requests, messages },
  {
  },
  collections,
  (configurator: AppConfigurator) => {
    configurator.setPages({ pages });
    configurator.setExperiments(experiments);
    const tables: Record<string, Record<string, string>> = {
      en: en as unknown as Record<string, string>,
      es: es as unknown as Record<string, string>,
    };
    configurator.setStrings({
      defaultLang: stringsDef.defaultLang,
      langs: stringsDef.langs,
      criticalKeys: stringsDef.criticalKeys,
      getTable: (lang) => tables[lang] ?? tables[stringsDef.defaultLang]!,
    });
    configurator.setWorkers(cronTasks, cronHandlers);
    configurator.setOnEmail(async (inbound: InboundEmail) => {
      await Promise.resolve();
      console.log('[Email] Received:', {
        from: inbound.from,
        id: inbound.id,
        subject: inbound.subject,
      });
    });
  },
);

// eslint-disable-next-line @typescript-eslint/dot-notation
const port = parseInt(process.env['PORT'] ?? '4321');
await app.start(port);
