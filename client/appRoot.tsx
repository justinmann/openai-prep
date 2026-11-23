// The app's root render, shared by the browser (main.tsx) and the Worker's
// server renderer (server/workers.ts). Everything reachable from here is
// bundled into the Worker: no module-scope `window` / `document`.
import React, { useEffect } from 'react';
import type { StringsProviderConfig } from 'ugly-app/client';
import en from '../shared/lang/en';
import { stringsDef } from '../shared/strings';
import { SeoHead } from './components/SeoHead';
import { RouterView } from './router';

/** Marks the document once React has hydrated, so tests know clicks work. */
function Hydrated(): null {
  useEffect(() => {
    document.documentElement.dataset.hydrated = '1';
  }, []);
  return null;
}

export function renderApp(): React.ReactElement {
  return (
    <>
      <Hydrated />
      <SeoHead />
      <RouterView />
    </>
  );
}

export const strings: StringsProviderConfig = {
  defaultLang: stringsDef.defaultLang,
  langs: stringsDef.langs,
  defaultTable: en as unknown as Record<string, string>,
  loadTable: async (lang) => {
    const mod = (await import(`../shared/lang/${lang}.ts`)) as {
      default: Record<string, string>;
    };
    return mod.default;
  },
};
