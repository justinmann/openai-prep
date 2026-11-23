import { parseUrl } from 'ugly-app/shared';
import { pages } from '../shared/pages';
import { allPageModules } from './allPages';
import { initialPages } from './initialPages';

/** Resolve the current page's component before hydrating, without the others. */
export async function prepareInitialPage(url: URL): Promise<void> {
  const route = parseUrl(pages, url.pathname, url.search);
  const name = route?.routeName as keyof typeof pages | undefined;
  if (name === undefined || !pages[name].ssr) return;
  const mod = await allPageModules[name]();
  Object.assign(initialPages, { [name]: mod.default });
}
