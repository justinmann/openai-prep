import { lazyPage } from 'ugly-app/client';
import type { PageMap } from 'ugly-app/shared';
import type { AppPages } from '../shared/pages';

export const allPages = {
  ['']: lazyPage(() => import('./pages/HomePage')),
  ['coding/:id']: lazyPage(() => import('./pages/CodingPage')),
  ['design/:id']: lazyPage(() => import('./pages/DesignPage')),
} satisfies PageMap<AppPages>;
