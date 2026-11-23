import { beforeAll, describe, expect, it } from 'vitest';
import type { TestResult } from '../../shared/runner/harness';
import { nodePyodide } from './pyodide';
import {
  runPythonTests,
  type PyodideLike,
} from '../../shared/runner/pyHarness';

let py: PyodideLike;
beforeAll(async () => {
  py = await nodePyodide();
}, 60_000);

async function run(code: string, tests: { name: string; code: string }[]) {
  const results: TestResult[] = [];
  const logs: string[] = [];
  const r = await runPythonTests(
    py,
    code,
    tests,
    {
      onStart: () => undefined,
      onResult: (x) => results.push(x),
      onLog: (l) => logs.push(l.text),
    },
    1,
  );
  return { ...r, results, logs };
}

describe('python harness', () => {
  it('passes, fails, prints and awaits', async () => {
    const r = await run(
      'def add(a, b):\n    print("adding")\n    return a + b\n',
      [
        { name: 'ok', code: 'assert_equal(add(1, 2), 3)' },
        { name: 'bad', code: 'assert_equal(add(1, 2), 4, "sum")' },
        {
          name: 'await',
          code: 'await asyncio.sleep(0.01)\nassert add(2, 2) == 4',
        },
        { name: 'raises', code: 'assert_raises(lambda: add(1, None))' },
      ],
    );
    expect(r.results.map((x) => x.status)).toEqual([
      'pass',
      'fail',
      'pass',
      'pass',
    ]);
    expect(r.results[1]!.message).toBe('sum: expected 4, got 3');
    expect(r.logs).toContain('adding');
  });

  it('reports runtime errors with the solution line', async () => {
    const r = await run('def f():\n    return 1 / 0\n', [
      { name: 'x', code: 'f()' },
    ]);
    expect(r.results[0]!.message).toBe(
      'ZeroDivisionError: division by zero (solution.py line 2)',
    );
  });

  it('times out slow async tests', async () => {
    const r = await run('', [{ name: 'slow', code: 'await asyncio.sleep(5)' }]);
    expect(r.results[0]!.status).toBe('timeout');
  });

  it('isolates tests from each other', async () => {
    const r = await run('count = 0\n', [
      { name: 'a', code: 'global count\ncount += 1\nassert_equal(count, 1)' },
      { name: 'b', code: 'assert_equal(count, 0)' },
    ]);
    expect(r.results.map((x) => x.status)).toEqual(['pass', 'pass']);
  });

  it('returns syntax errors without running', async () => {
    const r = await run('def f(:\n', [{ name: 'x', code: 'pass' }]);
    expect(r.syntaxError).toMatch(/^SyntaxError: .*line 1/);
    expect(r.results).toEqual([]);
  });

  it('stdlib imports need no loading', async () => {
    const r = await run(
      'import heapq, collections\nfrom dataclasses import dataclass\n',
      [
        {
          name: 'x',
          code: 'h = []\nheapq.heappush(h, 2)\nassert_equal(h, [2])',
        },
      ],
    );
    expect(r.results[0]!.status).toBe('pass');
  });
});
