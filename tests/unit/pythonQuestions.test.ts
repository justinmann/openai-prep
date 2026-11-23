import { beforeAll, describe, expect, it } from 'vitest';
import { codingQuestions } from '../../shared/questions';
import type { CodingTest } from '../../shared/questions/types';
import type { TestResult } from '../../shared/runner/harness';
import {
  runPythonTests,
  type PyodideLike,
} from '../../shared/runner/pyHarness';
import { nodePyodide } from './pyodide';

// PY_Q=<question id> limits the run to one question while translating.
const only = process.env.PY_Q;
const questions = codingQuestions.filter((q) => !only || q.id === only);

let py: PyodideLike;
beforeAll(async () => {
  py = await nodePyodide();
}, 60_000);

async function run(code: string, tests: CodingTest[]) {
  const results: TestResult[] = [];
  const r = await runPythonTests(
    py,
    code,
    tests,
    {
      onStart: () => undefined,
      onResult: (x) => results.push(x),
      onLog: () => undefined,
    },
    4,
  );
  return { ...r, results };
}

describe('python versions', () => {
  for (const q of questions) {
    describe(q.id, () => {
      it('exists with the same parts and test names as TypeScript', () => {
        expect(q.python, 'missing python version').toBeDefined();
        expect(q.python!.parts.map((p) => p.tests.map((t) => t.name))).toEqual(
          q.parts.map((p) => p.tests.map((t) => t.name)),
        );
      });

      it('reference solution passes every test', async () => {
        const tests = q.python!.parts.flatMap((p) => p.tests);
        const r = await run(q.python!.solution, tests);
        expect(r.syntaxError).toBeNull();
        const bad = r.results.filter((x) => x.status !== 'pass');
        expect(bad.map((x) => `${tests[x.index]!.name}: ${x.message}`)).toEqual(
          [],
        );
      }, 60_000);

      it('starter parses and does not pass', async () => {
        const tests = q.python!.parts.flatMap((p) => p.tests);
        const r = await run(q.python!.starter, tests);
        expect(r.syntaxError).toBeNull();
        expect(r.results.some((x) => x.status !== 'pass')).toBe(true);
      }, 60_000);
    });
  }
});
