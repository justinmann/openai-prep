import {
  authReq,
  defineMessages,
  defineRequests,
  frameworkMessages,
  frameworkRequests,
  z,
} from 'ugly-app/shared';

// Typed request + message contracts. Add your app's endpoints here; the server
// (server/index.ts) provides a handler for each request, type-checked against
// these definitions.
export const requests = defineRequests({
  // Example: public request — userId is string | null
  // getPublicData: req({
  //   input: z.object({ id: z.string() }),
  //   output: z.object({ data: z.string() }),
  // }),
});

export const messages = defineMessages({
  // Example fire-and-forget (with Zod):
  // userTyping: msg(z.object({ channelId: z.string() })),
});

// Keep `z` and `authReq` referenced so a scaffold that starts with no requests
// still type-checks (features add requests above that use them).
export type _Z = typeof z;
export type { authReq };

export interface AppRegistry {
  requests: typeof frameworkRequests & typeof requests;
  messages: typeof frameworkMessages & typeof messages;
}
