import { beforeAll, describe, expect, it } from 'vitest';
import {
  runAll,
  transpile,
  type TestResult,
} from '../../shared/runner/harness';
import {
  runPythonTests,
  type PyodideLike,
} from '../../shared/runner/pyHarness';
import { nodePyodide } from './pyodide';

// "Run code": the file runs once as a program, with top-level await.

function collect() {
  const results: TestResult[] = [];
  const logs: string[] = [];
  return {
    results,
    logs,
    cb: {
      onStart: () => undefined,
      onResult: (r: TestResult) => results.push(r),
      onLog: (l: { text: string }) => logs.push(l.text),
    },
  };
}

describe('run code: typescript', () => {
  const run = async (ts: string) => {
    const c = collect();
    await runAll(transpile(ts), [], c.cb, 1000, undefined, true);
    return c;
  };

  it('runs top-level code with await and logs', async () => {
    const c = await run(
      'const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));\nconsole.log("a");\nawait sleep(5);\nconsole.log("b", { x: 1 });',
    );
    expect(c.logs).toEqual(['a', 'b {"x": 1}']);
    expect(c.results.map((r) => r.status)).toEqual(['pass']);
  });

  it('reports a thrown error', async () => {
    const c = await run(
      'function f(): number { throw new RangeError("bad"); }\nf();',
    );
    expect(c.results[0]).toMatchObject({
      status: 'fail',
      message: 'RangeError: bad',
    });
  });

  it('times out a promise that never settles', async () => {
    const c = await run('await new Promise(() => {});');
    expect(c.results[0]!.status).toBe('timeout');
  });
});

describe('run code: python', () => {
  let py: PyodideLike;
  beforeAll(async () => {
    py = await nodePyodide();
  }, 60_000);

  const run = async (code: string) => {
    const c = collect();
    const r = await runPythonTests(py, code, [], c.cb, 1, true);
    return { ...c, ...r };
  };

  it('runs top-level code with await and prints', async () => {
    const c = await run(
      'print("a")\nawait asyncio.sleep(0.01)\nprint("b", [1, 2])\n',
    );
    expect(c.logs).toEqual(['a', 'b [1, 2]']);
    expect(c.results.map((r) => r.status)).toEqual(['pass']);
  });

  it('reports errors with the line', async () => {
    const c = await run('x = 1\nraise ValueError("nope")\n');
    expect(c.results[0]!.message).toBe('ValueError: nope (solution.py line 2)');
  });

  it('reports syntax errors with the line', async () => {
    const c = await run('x = 1\ndef f(:\n');
    expect(c.results[0]!.message).toMatch(/^SyntaxError: .* \(line 2\)$/);
  });

  it('times out a hung await', async () => {
    const c = await run('await asyncio.sleep(5)\n');
    expect(c.results[0]!.status).toBe('timeout');
  });
});
