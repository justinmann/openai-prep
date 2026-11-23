import type { CodingTest, Language } from '../../shared/questions/types';
import {
  CompileError,
  transpile,
  type LogLine,
  type TestResult,
} from '../../shared/runner/harness';
import type { PyWorkerIn } from './pyWorker';
import type { WorkerIn, WorkerOut } from './worker';

/** A test may run synchronously this long before we assume an infinite loop. */
const SYNC_HANG_MS = 5000;
const MAX_LOG_LINES = 500;
/** Fetching imported packages (or the Python runtime) may take this long. */
const LOAD_MS = 60_000;

// One Python worker is kept between runs so Pyodide loads once. It is
// discarded whenever a run is stopped early, since it may be stuck.
let pyWorker: Worker | null = null;

function getPyWorker(): Worker {
  pyWorker ??= new Worker(new URL('./pyWorker.ts', import.meta.url), {
    type: 'module',
  });
  return pyWorker;
}

/** Start loading Python before the first run. */
export function warmPython(): void {
  const msg: PyWorkerIn = { type: 'warm' };
  getPyWorker().postMessage(msg);
}

export interface RunHandle {
  cancel: () => void;
}

export interface RunUpdate {
  results: (TestResult | null)[];
  logs: LogLine[];
  running: number | null;
  /** Packages being fetched before the tests start. */
  loading: string[] | null;
  done: boolean;
  compileError: string | null;
}

export function runCode(
  language: Language,
  source: string,
  tests: CodingTest[],
  onUpdate: (u: RunUpdate) => void,
): RunHandle {
  const state: RunUpdate = {
    results: tests.map(() => null),
    logs: [],
    running: null,
    loading: null,
    done: false,
    compileError: null,
  };
  const emit = () => {
    onUpdate({ ...state, results: [...state.results], logs: [...state.logs] });
  };

  let js = '';
  if (language === 'typescript') {
    try {
      js = transpile(source);
    } catch (err) {
      state.compileError =
        err instanceof CompileError ? err.message : String(err);
      state.done = true;
      emit();
      return { cancel: () => undefined };
    }
  }

  const worker =
    language === 'python'
      ? getPyWorker()
      : new Worker(new URL('./worker.ts', import.meta.url), {
          type: 'module',
        });
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let finished = false;

  const finish = (reason?: string) => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    worker.onmessage = null;
    worker.onerror = null;
    if (language === 'typescript' || reason !== undefined) {
      worker.terminate();
      if (worker === pyWorker) pyWorker = null;
    }
    if (reason !== undefined) {
      state.results = state.results.map((r, index) => {
        if (r) return r;
        if (state.loading)
          return { index, status: 'fail', message: reason, ms: 0 };
        if (index === state.running)
          return {
            index,
            status: 'timeout',
            message: reason,
            ms: SYNC_HANG_MS,
          };
        return { index, status: 'skipped', message: 'Not run', ms: 0 };
      });
    }
    state.running = null;
    state.loading = null;
    state.done = true;
    emit();
  };

  const arm = (
    ms = SYNC_HANG_MS,
    reason = `No progress for ${SYNC_HANG_MS / 1000} s. Infinite loop? The run was stopped.`,
  ) => {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      finish(reason);
    }, ms);
  };

  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === 'loading') {
      state.loading = m.specs;
      arm(
        LOAD_MS,
        `Loading ${m.specs.join(', ')} took over ${LOAD_MS / 1000} s. Check the package names or your network.`,
      );
    } else if (m.type === 'start') {
      state.loading = null;
      state.running = m.index;
      arm();
    } else if (m.type === 'result') {
      state.results[m.result.index] = m.result;
    } else if (m.type === 'compileError') {
      state.compileError = m.message;
    } else if (m.type === 'log') {
      if (state.logs.length < MAX_LOG_LINES) state.logs.push(m.line);
      else if (state.logs.length === MAX_LOG_LINES)
        state.logs.push({ level: 'warn', text: '… further output truncated' });
    } else {
      finish();
      return;
    }
    emit();
  };
  worker.onerror = (e) => {
    e.preventDefault();
    state.compileError = e.message || 'The test worker crashed.';
    finish('Worker crashed');
  };

  arm();
  if (language === 'python') {
    const msg: PyWorkerIn = { type: 'run', code: source, tests };
    worker.postMessage(msg);
  } else {
    const msg: WorkerIn = { js, tests };
    worker.postMessage(msg);
  }
  emit();
  return {
    cancel: () => {
      finish('Cancelled');
    },
  };
}
