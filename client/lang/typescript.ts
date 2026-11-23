import { autocompletion } from '@codemirror/autocomplete';
import { Prec, type Extension } from '@codemirror/state';
import {
  tsAutocompleteWorker,
  tsFacetWorker,
  tsHoverWorker,
  tsLinterWorker,
  tsSyncWorker,
} from '@valtown/codemirror-ts';
import type { WorkerShape } from '@valtown/codemirror-ts/worker';
import * as Comlink from 'comlink';
import { IGNORED_DIAGNOSTICS } from '../../shared/runner/tsOptions';

// Lazily starts one TypeScript worker for the page's lifetime and returns the
// editor extensions that use it.

let ready: Promise<WorkerShape> | null = null;

function worker(): Promise<WorkerShape> {
  ready ??= (async () => {
    const inner = new Worker(new URL('./tsWorker.ts', import.meta.url), {
      type: 'module',
    });
    const w = Comlink.wrap<WorkerShape>(inner);
    await w.initialize();
    return w;
  })().catch((err: unknown) => {
    ready = null;
    throw err;
  });
  return ready;
}

export async function typescriptServices(): Promise<Extension> {
  const w = await worker();
  return [
    tsFacetWorker.of({ worker: w, path: '/solution.ts' }),
    tsSyncWorker(),
    tsLinterWorker({ diagnosticCodesToIgnore: IGNORED_DIAGNOSTICS }),
    Prec.highest(
      autocompletion({
        override: [tsAutocompleteWorker()],
        activateOnTyping: true,
      }),
    ),
    tsHoverWorker(),
  ];
}
