import { useEffect, useState, type ComponentType } from 'react';
import type {
  CodingQuestion,
  DesignQuestion,
  Language,
} from '../shared/questions';

// The editor and whiteboard are big (CodeMirror, Excalidraw, language
// services). The server renders question pages without them, so the pages
// must never import them, even lazily: the Worker bundle would inline them.
// Browser startup (main.tsx) registers the loaders here instead.

export interface CodingWorkspaceProps {
  q: CodingQuestion;
  /** A language picked on the preview, overriding the saved preference. */
  lang?: Language;
}
export interface DesignWorkspaceProps {
  q: DesignQuestion;
}

interface Loaders {
  coding?: () => Promise<{ default: ComponentType<CodingWorkspaceProps> }>;
  design?: () => Promise<{ default: ComponentType<DesignWorkspaceProps> }>;
}

export const workspaceLoaders: Loaders = {};

/** Loads a workspace component once `enabled`; null until it arrives. */
export function useWorkspace<K extends keyof Loaders>(
  kind: K,
  enabled: boolean,
): Awaited<ReturnType<NonNullable<Loaders[K]>>>['default'] | null {
  type C = Awaited<ReturnType<NonNullable<Loaders[K]>>>['default'];
  const [comp, setComp] = useState<{ c: C } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || comp || failed) return;
    const load = workspaceLoaders[kind];
    if (!load) return;
    let live = true;
    load()
      .then((m) => {
        if (live) setComp({ c: m.default as C });
      })
      .catch((err: unknown) => {
        console.error(`[workspace] could not load the ${kind} editor`, err);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [kind, enabled, comp, failed]);
  return comp?.c ?? null;
}
