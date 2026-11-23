/// <reference lib="webworker" />
import type { CodingTest } from '../../shared/questions/types';
import {
  PYODIDE_CDN,
  runPythonTests,
  type PyodideLike,
} from '../../shared/runner/pyHarness';
import type { WorkerOut } from './worker';

// Python runs in Pyodide, loaded once from the CDN and kept for later runs.
// The page terminates this worker on a hang, which also discards Pyodide.

export type PyWorkerIn =
  | { type: 'warm' }
  | { type: 'run'; code: string; tests: CodingTest[]; main: boolean };

const post = (m: WorkerOut) => {
  self.postMessage(m);
};

let ready: Promise<PyodideLike> | null = null;
let booted = false;

function boot(): Promise<PyodideLike> {
  ready ??= (async () => {
    const mod = (await import(
      /* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`
    )) as {
      loadPyodide: (o: { indexURL: string }) => Promise<unknown>;
    };
    const py = (await mod.loadPyodide({
      indexURL: PYODIDE_CDN,
    })) as PyodideLike;
    booted = true;
    return py;
  })();
  return ready;
}

self.onmessage = (e: MessageEvent<PyWorkerIn>) => {
  const m = e.data;
  if (m.type === 'warm') {
    boot().catch(() => {
      ready = null;
    });
    return;
  }
  void (async () => {
    try {
      if (!booted) post({ type: 'loading', specs: ['Python runtime'] });
      const py = await boot();
      const r = await runPythonTests(
        py,
        m.code,
        m.tests,
        {
          onLoading: (specs) => {
            post({ type: 'loading', specs });
          },
          onStart: (index) => {
            post({ type: 'start', index });
          },
          onResult: (result) => {
            post({ type: 'result', result });
          },
          onLog: (line) => {
            post({ type: 'log', line });
          },
        },
        m.main ? 10 : 4,
        m.main,
      );
      if (r.syntaxError) post({ type: 'compileError', message: r.syntaxError });
    } catch (err) {
      ready = null;
      post({
        type: 'compileError',
        message: `Python failed to load: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
    post({ type: 'done' });
  })();
};
