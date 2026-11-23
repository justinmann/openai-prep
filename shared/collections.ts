import { defineCollections } from 'ugly-app/shared';

// ─── Schemas & Types ─────────────────────────────────────────────────────────
// Define a Zod schema per collection, then export the inferred doc type, e.g.:
//   export const ThingSchema = z.object({ userId: z.string(), name: z.string() });
//   export type Thing = InferDocType<typeof ThingSchema>;

// --- Collections ---
// meta options:
//   cache        – cache docs in memory LRU (small, frequently read collections)
//   trackable    – emit change events so clients can subscribe to real-time updates
//   public       – allow unauthenticated reads (use sparingly)
//   cascadeFrom  – parent collection: when that parent is deleted, cascade here
//   trackKeys    – fields used as NATS routing keys for scoped trackDocs subscriptions
//
// After adding a collection, run: npm run db:schema-gen && npm run db:migrate
export const collections = defineCollections({});

export type AppCollections = typeof collections;
