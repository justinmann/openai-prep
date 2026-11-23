import { definePage, definePages } from 'ugly-app/shared';

// Home lists every question. Coding runs entirely in the browser, so it is
// public; design grading calls the AI billed to the signed-in user, so it
// requires sign-in (the framework shows its login popup).
export const pages = definePages({
  '': definePage<{}>({ auth: false }),
  'coding/:id': definePage<{ id: string }>({ auth: false }),
  'design/:id': definePage<{ id: string }>({ auth: true }),
});

export type AppPages = typeof pages;
