import { createRouter } from 'ugly-app/client';
import { pages } from '../shared/pages';
import { initialPages } from './initialPages';

// `Link` is the typed SPA link for internal navigation. Use it (or
// `useRouter().push(...)`) instead of a bare `<a href="/route">`.
//
// `allPages` is NOT imported here: main.tsx registers it with `setAllPages`.
// The Worker imports this module to server-render and has no code splitting,
// so a static import of every lazy page would inline them all.
export const { RouterProvider, RouterView, useRouter, Link, setAllPages } =
  createRouter({
    pages,
    ssrPages: initialPages,
  });
