import { lazyPage } from 'ugly-app/client';
import type { PageMap } from 'ugly-app/shared';
import type { AppPages } from '../shared/pages';

// ─── Page Map ─────────────────────────────────────────────────────────────────
// Maps every route key from shared/pages.ts to a lazy-loaded component. The
// `satisfies PageMap<AppPages>` keeps keys in sync at compile time.
//   lazyPage(() => import('./pages/MyPage'))  – code-splits the page
// When you add a route in shared/pages.ts, add the matching entry here.
export const allPages = {
  ['']: lazyPage(() => import('./pages/HomePage')),
} satisfies PageMap<AppPages>;
