// Head tags for every page, from the same table the browser uses (shared/seo).
// Imported only by server/workers.ts. Everything returned here is edge-cached
// and served to every visitor: nothing per-visitor belongs in it.
import type { SsrLoaderMap, SsrMeta } from 'ugly-app/shared';
import type { AppPages } from '../shared/pages';
import { seoFor } from '../shared/seo';

const headFor =
  (route: keyof AppPages) =>
  (ctx: { params: Record<string, string> }): SsrMeta => {
    const s = seoFor(route, ctx.params);
    return { title: s.title, description: s.description, image: s.image };
  };

export const ssrLoaders: SsrLoaderMap<AppPages> = {
  '': { head: headFor('') },
  'questions': { head: headFor('questions') },
  'companies/:company': { head: headFor('companies/:company') },
  'coding/:id': { head: headFor('coding/:id') },
  'design/:id': { head: headFor('design/:id') },
};
