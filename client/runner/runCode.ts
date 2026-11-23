import type { CodingTest } from '../../shared/questions/types';
import {
  CompileError,
  transpile,
  type LogLine,
  type TestResult,
} from '../../shared/runner/harness';
import type { WorkerIn, WorkerOut } from './worker';

/** A test may run synchronously this long before we assume an infinite loop. */
const SYNC_HANG_MS = 5000;
const MAX_LOG_LINES = 500;

export interface RunHandle {
  cancel: () => void;
}

export interface RunUpdate {
  results: (TestResult | null)[];
  logs: LogLine[];
  running: number | null;
  done: boolean;
  compileError: string | null;
}

export function runCode(
  ts: string,
  tests: CodingTest[],
  onUpdate: (u: RunUpdate) => void,
): RunHandle {
  const state: RunUpdate = {
    results: tests.map(() => null),
    logs: [],
    running: null,
    done: false,
    compileError: null,
  };
  const emit = () => { onUpdate({ ...state, results: [...state.results], logs: [...state.logs] }); };

  let js: string;
  try {
    js = transpile(ts);
  } catch (err) {
    state.compileError = err instanceof CompileError ? err.message : String(err);
    state.done = true;
    emit();
    return { cancel: () => undefined };
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  let watchdog: ReturnType<typeof setTimeout> | undefined;

  const finish = (reason?: string) => {
    clearTimeout(watchdog);
    worker.terminate();
    if (reason !== undefined) {
      state.results = state.results.map((r, index) => {
        if (r) return r;
        if (index === state.running) return { index, status: 'timeout', message: reason, ms: SYNC_HANG_MS };
        return { index, status: 'skipped', message: 'Not run', ms: 0 };
      });
    }
    state.running = null;
    state.done = true;
    emit();
  };

  const arm = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(
      () => { finish(`No progress for ${SYNC_HANG_MS / 1000} s. Infinite loop? The run was stopped.`); },
      SYNC_HANG_MS,
    );
  };

  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    if (m.type === 'start') {
      state.running = m.index;
      arm();
    } else if (m.type === 'result') {
      state.results[m.result.index] = m.result;
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
  const msg: WorkerIn = { js, tests };
  worker.postMessage(msg);
  emit();
  return { cancel: () => { finish('Cancelled'); } };
}
