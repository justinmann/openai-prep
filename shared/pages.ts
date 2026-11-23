import { definePage, definePages } from 'ugly-app/shared';

// Everything requires sign-in: drafts, test progress, whiteboards and grades
// are stored per user on the server so they follow you between browsers, and
// design grading is billed to the signed-in user.
export const pages = definePages({
  '': definePage<{}>({ auth: true }),
  'coding/:id': definePage<{ id: string }>({ auth: true }),
  'design/:id': definePage<{ id: string }>({ auth: true }),
});

export type AppPages = typeof pages;
