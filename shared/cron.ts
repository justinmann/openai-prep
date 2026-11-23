import { defineWorker, defineWorkers } from 'ugly-app/shared';

// Scheduled background tasks. Each worker has a cron schedule; server/index.ts
// provides its handler. Add tasks here, e.g.:
//   nightly: defineWorker({ schedule: '0 3 * * *', description: '…' }),
export const cronTasks = defineWorkers({
});

// Keep `defineWorker` referenced for scaffolds that start with no workers.
export type _DefineWorker = typeof defineWorker;
