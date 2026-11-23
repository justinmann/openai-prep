import { definePage, definePages } from 'ugly-app/shared';

// Every page is public and server-rendered (client/ssrPages.ts), so search
// engines and link previews see the real questions. The SSR document is
// edge-cached and the same for every visitor: pages render signed-out first and
// switch on sign-in. Writing code, saving progress and AI grading need an
// account; the pages gate those parts themselves (client/components/SignIn).
export const pages = definePages({
  '': definePage<{}>({ auth: false, ssr: true }),
  'questions': definePage<{}>({ auth: false, ssr: true }),
  'companies/:company': definePage<{ company: string }>({
    auth: false,
    ssr: true,
  }),
  'coding/:id': definePage<{ id: string }>({ auth: false, ssr: true }),
  'design/:id': definePage<{ id: string }>({ auth: false, ssr: true }),
});

export type AppPages = typeof pages;
