import { describe, expect, it } from 'vitest';
import { codingQuestions } from '../../shared/questions/coding';
import { designQuestions } from '../../shared/questions/design';
import {
  runAll,
  transpile,
  type TestResult,
} from '../../shared/runner/harness';

async function run(ts: string, tests: { name: string; code: string }[]) {
  const results: TestResult[] = [];
  await runAll(transpile(ts), tests, {
    onLog: () => {},
    onResult: (r) => results.push(r),
  });
  return results;
}

describe('coding questions', () => {
  it('have unique ids', () => {
    const ids = [...codingQuestions, ...designQuestions].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const q of codingQuestions) {
    const tests = q.parts.flatMap((p) => p.tests);

    it(`${q.id}: reference solution passes every test`, async () => {
      const results = await run(q.solution, tests);
      const failures = results
        .filter((r) => r.status !== 'pass')
        .map((r) => `${tests[r.index]!.name}: ${r.message}`);
      expect(failures).toEqual([]);
      expect(results).toHaveLength(tests.length);
    }, 30_000);

    it(`${q.id}: starter code compiles and does not pass`, async () => {
      const results = await run(q.starter, tests);
      expect(results).toHaveLength(tests.length);
      expect(results.some((r) => r.status !== 'pass')).toBe(true);
    }, 30_000);
  }
});

describe('harness', () => {
  it('reports compile errors from bad TypeScript', () => {
    expect(() => transpile('function (')).toThrow();
  });

  it('a top-level throw fails every test', async () => {
    const results = await run('throw new Error("boom")', [
      { name: 'a', code: 'assert(true)' },
      { name: 'b', code: 'assert(true)' },
    ]);
    expect(results.map((r) => r.status)).toEqual(['fail', 'fail']);
    expect(results[0]!.message).toContain('boom');
  });

  it('candidate helpers named like ours do not collide', async () => {
    const results = await run(
      'const sleep = 1; function now() { return 0; }\nfunction f() { return sleep; }',
      [{ name: 'a', code: 'assertEqual(f(), 1); await sleep(1);' }],
    );
    expect(results[0]!.status).toBe('pass');
  });

  it('times out a promise that never settles', async () => {
    const results: TestResult[] = [];
    await runAll(
      '',
      [{ name: 'hang', code: 'await new Promise(() => {});' }],
      { onLog: () => {}, onResult: (r) => results.push(r) },
      50,
    );
    expect(results[0]!.status).toBe('timeout');
  });

  it('captures console output', async () => {
    const lines: string[] = [];
    await runAll(
      transpile('console.log("hi", { a: 1 });'),
      [{ name: 'a', code: '' }],
      { onLog: (l) => lines.push(l.text), onResult: () => {} },
    );
    expect(lines).toEqual(['hi {"a": 1}']);
  });
});

describe('design questions', () => {
  for (const q of designQuestions) {
    it(`${q.id} has requirements and a rubric`, () => {
      expect(q.functional.length).toBeGreaterThan(0);
      expect(q.nonFunctional.length).toBeGreaterThan(0);
      expect(q.rubric.length).toBeGreaterThanOrEqual(5);
      expect(new Set(q.rubric.map((r) => r.id)).size).toBe(q.rubric.length);
    });
  }
});

describe('imports', () => {
  const fakeLodash = async (spec: string) => {
    if (spec === 'lodash-es') return { chunk: (a: number[], n: number) => [a.slice(0, n), a.slice(n)], default: { name: 'lodash' } };
    throw new Error('404 not found');
  };

  async function runWith(ts: string, code: string) {
    const results: TestResult[] = [];
    let loading: string[] = [];
    await runAll(
      transpile(ts),
      [{ name: 't', code }],
      { onLog: () => {}, onResult: (r) => results.push(r), onLoading: (s) => { loading = s; } },
      4000,
      fakeLodash,
    );
    return { result: results[0]!, loading };
  }

  it('finds imports in transpiled code', async () => {
    const { findImports } = await import('../../shared/runner/harness');
    expect(findImports(transpile("import { a } from 'x';\nimport * as y from '@s/y@1';\nimport type { T } from 'types-only';\nconst z: T = [a, y];"))).toEqual(['x', '@s/y@1']);
  });

  it('supports named, default and namespace imports', async () => {
    const ts = "import { chunk } from 'lodash-es';\nimport _ from 'lodash-es';\nimport * as L from 'lodash-es';\nfunction f() { return [chunk([1, 2, 3], 2), _.name, typeof L.chunk]; }";
    const { result, loading } = await runWith(ts, "assertEqual(f(), [[[1, 2], [3]], 'lodash', 'function']);");
    expect(loading).toEqual(['lodash-es']);
    expect(result.status).toBe('pass');
  });

  it('a package that fails to load fails the run with its name', async () => {
    const { result } = await runWith("import x from 'nope-pkg';\nconsole.log(x);", 'assert(true)');
    expect(result.status).toBe('fail');
    expect(result.message).toContain('Could not import "nope-pkg"');
  });

  it('maps specifiers to esm.sh and rejects local paths', async () => {
    const { moduleUrl } = await import('../../shared/runner/harness');
    expect(moduleUrl('lodash-es')).toBe('https://esm.sh/lodash-es');
    expect(moduleUrl('https://cdn.example.com/m.js')).toBe('https://cdn.example.com/m.js');
    expect(() => moduleUrl('./util')).toThrow(/no local files/);
    expect(() => moduleUrl('node:fs')).toThrow(/built-ins/);
  });
});
