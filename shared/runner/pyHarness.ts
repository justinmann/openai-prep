import type { CodingTest } from '../questions/types';
import type { LogLine, TestResult } from './harness';

// Python tests run in Pyodide. The driver below is plain Python, so it behaves
// the same in the browser worker and in the Node unit tests. Each test gets a
// fresh globals dict: the candidate's code is executed into it, then the test
// body runs as the body of `async def`, so tests may `await`.

export const PYODIDE_VERSION = '0.29.5';
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export const PY_DRIVER = String.raw`
import asyncio, sys, textwrap, time, traceback

def assert_equal(actual, expected, label=None):
    if actual != expected or type(actual) is bool and type(expected) is not bool:
        prefix = label + ': ' if label else ''
        raise AssertionError(prefix + 'expected ' + repr(expected) + ', got ' + repr(actual))

def assert_raises(fn, label=None):
    try:
        fn()
    except Exception:
        return
    raise AssertionError((label or 'call') + ' should have raised')

def _describe(e):
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == 'solution.py']
    where = ' (solution.py line ' + str(frames[-1].lineno) + ')' if frames else ''
    if isinstance(e, AssertionError) and str(e):
        return str(e) + where
    return type(e).__name__ + (': ' + str(e) if str(e) else '') + where

def _check_syntax(code):
    try:
        compile(code, 'solution.py', 'exec')
        return None
    except SyntaxError as e:
        return 'SyntaxError: ' + str(e.msg) + ' (line ' + str(e.lineno) + ')'

async def _run_tests(code, tests, on_start, on_result, timeout_s):
    compiled = compile(code, 'solution.py', 'exec')
    for i, (name, body) in enumerate(tests):
        on_start(i)
        g = {'__name__': '__main__', 'assert_equal': assert_equal,
             'assert_raises': assert_raises, 'asyncio': asyncio}
        t0 = time.perf_counter()
        status, message = 'pass', None
        try:
            exec(compiled, g)
            src = 'async def __test__():\n' + textwrap.indent(body, '    ') + '\n    pass\n'
            exec(compile(src, 'test.py', 'exec'), g)
            await asyncio.wait_for(g['__test__'](), timeout_s)
        except asyncio.TimeoutError:
            status, message = 'timeout', 'Did not finish within ' + str(timeout_s) + ' s'
        except BaseException as e:
            status, message = 'fail', _describe(e)
        on_result(i, status, message, int((time.perf_counter() - t0) * 1000))
`;

/** The slice of the Pyodide API the runner needs (browser and Node). */
export interface PyodideLike {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<unknown>;
  globals: { get: (name: string) => unknown };
  toPy: (v: unknown) => unknown;
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
}

export interface PyCallbacks {
  onStart: (index: number) => void;
  onResult: (r: TestResult) => void;
  onLog: (l: LogLine) => void;
  onLoading?: (names: string[]) => void;
}

const STDLIB_CHECK = String.raw`
def _third_party(code):
    from pyodide.code import find_imports
    return [m for m in find_imports(code) if m.split('.')[0] not in sys.stdlib_module_names]
`;

let installed = new WeakSet();

function install(py: PyodideLike): void {
  if (installed.has(py)) return;
  py.runPython(PY_DRIVER);
  py.runPython(STDLIB_CHECK);
  installed.add(py);
}

/** Reset between test files that create fresh interpreters. */
export function _resetInstalled(): void {
  installed = new WeakSet();
}

type PyFn = ((...args: unknown[]) => unknown) & { destroy?: () => void };

/**
 * Run every test. Returns a syntax error message instead of running when the
 * code does not parse. Third-party imports are fetched by Pyodide first.
 */
export async function runPythonTests(
  py: PyodideLike,
  code: string,
  tests: CodingTest[],
  cb: PyCallbacks,
  timeoutS = 4,
): Promise<{ syntaxError: string | null }> {
  install(py);
  py.setStdout({
    batched: (text) => {
      cb.onLog({ level: 'log', text });
    },
  });
  py.setStderr({
    batched: (text) => {
      cb.onLog({ level: 'error', text });
    },
  });
  const syntax = (py.globals.get('_check_syntax') as PyFn)(code);
  if (typeof syntax === 'string') return { syntaxError: syntax };

  const thirdParty = (py.globals.get('_third_party') as PyFn)(code) as {
    toJs: () => string[];
    destroy: () => void;
  };
  const names = thirdParty.toJs();
  thirdParty.destroy();
  if (names.length) {
    cb.onLoading?.(names);
    await py.loadPackagesFromImports(code);
  }

  const run = py.globals.get('_run_tests') as PyFn;
  const pyTests = py.toPy(tests.map((t) => [t.name, t.code]));
  await (run(
    code,
    pyTests,
    (i: number) => {
      cb.onStart(i);
    },
    (
      index: number,
      status: string,
      message: string | undefined,
      ms: number,
    ) => {
      cb.onResult({
        index,
        status: status === 'pass' || status === 'timeout' ? status : 'fail',
        ...(message ? { message } : {}),
        ms,
      });
    },
    timeoutS,
  ) as Promise<unknown>);
  return { syntaxError: null };
}
