/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import {
  PY_LANG_SERVICE,
  PYODIDE_CDN,
  type PyCompletion,
  type PyDiagnostic,
} from '../../shared/runner/pyHarness';

// Python language service: jedi completions plus syntax and pyflakes
// diagnostics. A separate Pyodide from the run worker, which is busy during
// runs and is terminated on hangs.

interface Py {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (names: string[]) => Promise<unknown>;
  globals: { get: (name: string) => (...a: unknown[]) => unknown };
}

let ready: Promise<Py> | null = null;

function boot(): Promise<Py> {
  ready ??= (async () => {
    const mod = (await import(
      /* @vite-ignore */ `${PYODIDE_CDN}pyodide.mjs`
    )) as { loadPyodide: (o: { indexURL: string }) => Promise<unknown> };
    const py = (await mod.loadPyodide({ indexURL: PYODIDE_CDN })) as Py;
    await py.loadPackage(['jedi', 'micropip']);
    // pyflakes is not bundled with Pyodide; without it only syntax errors show.
    try {
      await py.runPythonAsync(
        "import micropip\nawait micropip.install('pyflakes')",
      );
    } catch {
      // offline or PyPI unreachable
    }
    py.runPython(PY_LANG_SERVICE);
    return py;
  })().catch((err: unknown) => {
    ready = null;
    throw err;
  });
  return ready;
}

const api = {
  async warm(): Promise<void> {
    await boot();
  },
  async complete(
    code: string,
    line: number,
    column: number,
  ): Promise<PyCompletion[]> {
    const py = await boot();
    return JSON.parse(
      py.globals.get('_complete')(code, line, column) as string,
    ) as PyCompletion[];
  },
  async lint(code: string): Promise<PyDiagnostic[]> {
    const py = await boot();
    return JSON.parse(
      py.globals.get('_lint')(code) as string,
    ) as PyDiagnostic[];
  },
};

export type PyLangApi = typeof api;
Comlink.expose(api);
