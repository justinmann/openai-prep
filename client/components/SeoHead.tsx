import { useEffect } from 'react';
import { seoFor, SITE_ORIGIN } from '../../shared/seo';
import { useRouter } from '../router';

// Keeps the title, description and canonical right as the visitor navigates
// without a reload. Server rendering writes the same values (server/ssrLoaders).

function setTag(
  selector: string,
  make: () => HTMLElement,
  set: (el: HTMLElement) => void,
) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = make();
    document.head.appendChild(el);
  }
  set(el);
}

export function SeoHead(): null {
  const router = useRouter();
  const { routeName, params } = router.current;
  const key = `${routeName}|${JSON.stringify(params)}`;
  useEffect(() => {
    const seo = seoFor(routeName, params);
    document.title = seo.title;
    setTag(
      'meta[name="description"]',
      () =>
        Object.assign(document.createElement('meta'), { name: 'description' }),
      (el) => {
        (el as HTMLMetaElement).content = seo.description;
      },
    );
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    setTag(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      (el) => {
        (el as HTMLLinkElement).href = `${SITE_ORIGIN}${path}`;
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers params
  }, [key]);
  return null;
}
