import { beforeAll, describe, expect, it } from 'vitest';
import { guides } from '../../shared/guide';
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

// Every runnable snippet in the language guide must execute without error.

let py: PyodideLike;
beforeAll(async () => {
  py = await nodePyodide();
}, 60_000);

describe('language guide', () => {
  for (const guide of Object.values(guides)) {
    it(`${guide.language}: tab ids are unique and tabs are not empty`, () => {
      const ids = guide.tabs.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const t of guide.tabs)
        expect(t.entries.length + (t.modules?.length ?? 0)).toBeGreaterThan(0);
    });

    for (const tab of guide.tabs) {
      for (const entry of tab.entries.filter((e) => e.run !== false)) {
        it(`${guide.language} / ${tab.label} / ${entry.title}`, async () => {
          const results: TestResult[] = [];
          const logs: string[] = [];
          const cb = {
            onStart: () => undefined,
            onResult: (r: TestResult) => results.push(r),
            onLog: (l: { text: string }) => logs.push(l.text),
          };
          if (guide.language === 'typescript') {
            const js = transpile(entry.code);
            await runAll('', [{ name: entry.title, code: js }], cb, 4000);
          } else {
            const r = await runPythonTests(
              py,
              '',
              [{ name: entry.title, code: entry.code }],
              cb,
              4,
            );
            expect(r.syntaxError).toBeNull();
          }
          expect(results.map((r) => r.message ?? r.status)).toEqual(['pass']);
        }, 20_000);
      }
    }
  }
});
