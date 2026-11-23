import type { SsrPageMap } from 'ugly-app/shared';
import type { AppPages } from '../shared/pages';

// The router reads this at render time. The server registers every SSR page
// (client/ssrPages.ts); browser startup registers only the current one
// (client/prepareInitialPage.ts), so hydration renders synchronously without
// pulling every page into the entry bundle.
export const initialPages: SsrPageMap<AppPages> = {};
