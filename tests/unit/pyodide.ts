import { createRequire } from 'node:module';
import path from 'node:path';
import { loadPyodide } from 'pyodide';
import type { PyodideLike } from '../../shared/runner/pyHarness';

// Vite rewrites pyodide's own path lookup, so point it at the package dir.
export async function nodePyodide(): Promise<PyodideLike> {
  const indexURL = path.dirname(
    createRequire(import.meta.url).resolve('pyodide'),
  );
  return (await loadPyodide({ indexURL })) as unknown as PyodideLike;
}
