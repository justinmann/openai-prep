import { transform } from 'sucrase';
import type { CodingTest } from '../questions/types';

// Pure test harness: transpiles TypeScript and runs a question's tests in the
// same scope as the candidate's code. The browser runs this inside a Web
// Worker (client/runner/worker.ts); unit tests run it directly in Node.

export type TestStatus = 'pass' | 'fail' | 'timeout' | 'skipped';

export interface TestResult {
  index: number;
  status: TestStatus;
  message?: string;
  ms: number;
}

export interface LogLine {
  level: 'log' | 'warn' | 'error';
  text: string;
}

export class CompileError extends Error {}

/** Strip types (no type checking) and turn any import/export into CommonJS. */
export function transpile(ts: string): string {
  try {
    return transform(ts, {
      transforms: ['typescript', 'imports'],
      disableESTransforms: true,
    }).code;
  } catch (err) {
    throw new CompileError(err instanceof Error ? err.message : String(err));
  }
}

// ── assertion helpers ────────────────────────────────────────────────────────

export function format(v: unknown, depth = 0): string {
  if (depth > 4) return '…';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'bigint') return `${v}n`;
  if (v === undefined) return 'undefined';
  if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
  if (v === null) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'symbol') return v.toString();
  if (typeof v !== 'object') return typeof v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (Array.isArray(v))
    return `[${v.map((x) => format(x, depth + 1)).join(', ')}]`;
  if (v instanceof Map)
    return `Map{${[...v].map(([k, x]) => `${format(k, depth + 1)} => ${format(x, depth + 1)}`).join(', ')}}`;
  if (v instanceof Set)
    return `Set{${[...v].map((x) => format(x, depth + 1)).join(', ')}}`;
  const entries = Object.entries(v);
  return `{${entries.map(([k, x]) => `${JSON.stringify(k)}: ${format(x, depth + 1)}`).join(', ')}}`;
}

function clip(s: string, n = 400): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a)
      if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const rb = b as Record<string, unknown>;
  const ra = a as Record<string, unknown>;
  return ka.every((k) => Object.hasOwn(rb, k) && deepEqual(ra[k], rb[k]));
}

class AssertionError extends Error {}

const helpers = {
  assertEqual(actual: unknown, expected: unknown, label?: string): void {
    if (!deepEqual(actual, expected)) {
      throw new AssertionError(
        `${label ? `${label}: ` : ''}expected ${clip(format(expected))}, got ${clip(format(actual))}`,
      );
    }
  },
  assert(cond: unknown, message?: string): void {
    if (!cond) throw new AssertionError(message ?? 'assertion failed');
  },
  assertThrows(fn: () => unknown, label?: string): void {
    let threw = false;
    try {
      fn();
    } catch {
      threw = true;
    }
    if (!threw)
      throw new AssertionError(
        `${label ? `${label}: ` : ''}expected an error to be thrown`,
      );
  },
  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  },
  now(): number {
    return performance.now();
  },
};

const HELPER_NAMES = Object.keys(helpers).join(', ');

export function buildProgram(js: string, tests: CodingTest[]): string {
  // Helpers are destructured inside each test so a candidate's own top-level
  // `sleep` or `now` does not collide with them.
  const fns = tests
    .map((t) => `async () => {\nconst { ${HELPER_NAMES} } = __h;\n${t.code}\n}`)
    .join(',\n');
  return `${js}\n;return [\n${fns}\n];`;
}

function describeError(err: unknown): string {
  if (err instanceof AssertionError) return err.message;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return `Thrown: ${format(err)}`;
}

/**
 * "Run code" mode: the whole file is the body of one async function, so
 * top-level `await` works. No helpers are injected, so nothing collides.
 */
export function buildMain(js: string): string {
  return `return [async () => {\n${js}\n}];`;
}

export interface RunCallbacks {
  onLog: (line: LogLine) => void;
  onResult: (result: TestResult) => void;
  /** Called before each test so the host can detect a synchronous hang. */
  onStart?: (index: number) => void;
  /** Called when the run starts fetching the packages the code imports. */
  onLoading?: (specs: string[]) => void;
}

/** Loads one imported package and returns its module namespace. */
export type ModuleLoader = (spec: string) => Promise<Record<string, unknown>>;

/**
 * Specifiers the transpiled code imports. Sucrase turns every `import` into a
 * `require('spec')` call, so this finds both imports and hand-written requires.
 */
export function findImports(js: string): string[] {
  const out = new Set<string>();
  for (const m of js.matchAll(/\brequire\((['"])([^'"\n]+)\1\)/g))
    out.add(m[2]!);
  return [...out];
}

/**
 * Where a specifier is fetched from: bare npm specifiers (`lodash`,
 * `lodash/chunk`, `@scope/pkg@1.2.3`) go to esm.sh; full https URLs are used
 * as-is. There are no local files to import.
 */
export function moduleUrl(spec: string): string {
  if (spec.startsWith('https://')) return spec;
  if (spec.startsWith('.') || spec.startsWith('/'))
    throw new Error(
      `Cannot import "${spec}": there are no local files. Import npm packages by name.`,
    );
  if (spec.startsWith('node:'))
    throw new Error(
      `Cannot import "${spec}": Node built-ins do not exist in the browser.`,
    );
  return `https://esm.sh/${spec}`;
}

/**
 * Makes an ES module namespace look like a transpiled ES module to sucrase's
 * interop helpers, so default, named and `* as` imports all resolve.
 */
function asCommonJs(ns: Record<string, unknown>): Record<string, unknown> {
  return { ...ns, __esModule: true };
}

/**
 * Compiles and runs every test in order. Async tests are capped at
 * `asyncTimeoutMs`; a synchronous infinite loop can only be stopped by the
 * host terminating the worker.
 */
export async function runAll(
  js: string,
  tests: CodingTest[],
  cb: RunCallbacks,
  asyncTimeoutMs = 4000,
  loadModule?: ModuleLoader,
  /** Run the file once as a program instead of running `tests`. */
  main = false,
): Promise<void> {
  if (main) tests = [{ name: 'Your code', code: '' }];
  const consoleProxy = {
    log: (...a: unknown[]) => {
      cb.onLog({ level: 'log', text: a.map(show).join(' ') });
    },
    info: (...a: unknown[]) => {
      cb.onLog({ level: 'log', text: a.map(show).join(' ') });
    },
    warn: (...a: unknown[]) => {
      cb.onLog({ level: 'warn', text: a.map(show).join(' ') });
    },
    error: (...a: unknown[]) => {
      cb.onLog({ level: 'error', text: a.map(show).join(' ') });
    },
  };
  const failAll = (message: string) => {
    tests.forEach((_, index) => {
      cb.onResult({ index, status: 'fail', message, ms: 0 });
    });
  };

  const modules = new Map<string, Record<string, unknown>>();
  const specs = findImports(js);
  if (specs.length) {
    if (!loadModule) {
      failAll('Imports are not available here.');
      return;
    }
    cb.onLoading?.(specs);
    try {
      await Promise.all(
        specs.map(async (spec) => {
          try {
            modules.set(spec, asCommonJs(await loadModule(spec)));
          } catch (err) {
            throw new Error(
              `Could not import "${spec}": ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }),
      );
    } catch (err) {
      failAll(err instanceof Error ? err.message : String(err));
      return;
    }
  }
  const requireModule = (spec: string) => {
    const mod = modules.get(spec);
    if (!mod)
      throw new Error(
        `Cannot import "${spec}" dynamically; use a static import at the top of your code.`,
      );
    return mod;
  };

  let fns: (() => Promise<void>)[];
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the candidate's code is the point
    const factory = new Function(
      '__h',
      'console',
      'exports',
      'require',
      main ? buildMain(js) : buildProgram(js, tests),
    ) as (...args: unknown[]) => (() => Promise<void>)[];
    fns = factory(helpers, consoleProxy, {}, requireModule);
  } catch (err) {
    failAll(`Your code failed before any test ran: ${describeError(err)}`);
    return;
  }
  for (let index = 0; index < fns.length; index++) {
    cb.onStart?.(index);
    const t0 = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        fns[index]!(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new TimeoutError());
          }, asyncTimeoutMs);
        }),
      ]);
      cb.onResult({ index, status: 'pass', ms: performance.now() - t0 });
    } catch (err) {
      cb.onResult({
        index,
        status: err instanceof TimeoutError ? 'timeout' : 'fail',
        message:
          err instanceof TimeoutError
            ? `Timed out after ${asyncTimeoutMs / 1000} s (a promise never settled?)`
            : describeError(err),
        ms: performance.now() - t0,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

class TimeoutError extends Error {}

function show(v: unknown): string {
  return typeof v === 'string' ? v : format(v);
}
