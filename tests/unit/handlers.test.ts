import { describe, expect, it } from 'vitest';
import { bestRun, createHandlers, type DbSurface } from '../../server/handlers';
import type { GradeRecordIo } from '../../shared/api';

// The progress handlers against an in-memory TypedDB stand-in.

function fakeDb(): DbSurface & { rows: Map<string, Map<string, unknown>> } {
  const rows = new Map<string, Map<string, unknown>>();
  const table = (col: unknown) => {
    const name = (col as { name: string }).name;
    let t = rows.get(name);
    if (!t) rows.set(name, (t = new Map()));
    return t;
  };
  return {
    rows,
    getDoc: async <T>(col: unknown, id: string) =>
      Promise.resolve((table(col).get(id) as T | undefined) ?? null),
    setDoc: async (col: unknown, doc: unknown) => {
      table(col).set((doc as { _id: string })._id, doc);
      return Promise.resolve(doc);
    },
    find: async <T>(col: unknown, filter: unknown, opts?: unknown) => {
      const f = filter as Record<string, unknown>;
      const o = (opts ?? {}) as {
        sort?: Record<string, number>;
        limit?: number;
      };
      let out = [...table(col).values()].filter((d) =>
        Object.entries(f).every(
          ([k, v]) => (d as Record<string, unknown>)[k] === v,
        ),
      ) as Record<string, number>[];
      const [key, dir] = Object.entries(o.sort ?? {})[0] ?? [];
      if (key) out = out.sort((a, b) => (a[key]! - b[key]!) * (dir ?? 1));
      return Promise.resolve(out.slice(0, o.limit ?? out.length) as T[]);
    },
  };
}

const grade = (score: number): GradeRecordIo => ({
  at: score,
  level: 'L5',
  words: 100,
  shapes: 3,
  grade: {
    verdict: 'hire',
    score,
    summary: 's',
    requirements: [],
    rubric: [],
    strengths: [],
    improvements: [],
    followUps: [],
  },
});

describe('bestRun', () => {
  it('keeps the better run and resets when the test count changes', () => {
    expect(bestRun(null, { passed: 2, total: 9 })).toEqual({
      bestPassed: 2,
      bestTotal: 9,
    });
    expect(
      bestRun({ bestPassed: 7, bestTotal: 9 }, { passed: 3, total: 9 }),
    ).toEqual({
      bestPassed: 7,
      bestTotal: 9,
    });
    expect(
      bestRun({ bestPassed: 7, bestTotal: 9 }, { passed: 1, total: 12 }),
    ).toEqual({
      bestPassed: 1,
      bestTotal: 12,
    });
  });
});

describe('progress handlers', () => {
  it('saves code without losing test progress, and keeps users apart', async () => {
    const db = fakeDb();
    const h = createHandlers(() => db);
    await h.codingRecordRun('u1', {
      questionId: 'q',
      language: 'typescript',
      passed: 5,
      total: 9,
    });
    await h.codingSave('u1', {
      questionId: 'q',
      language: 'typescript',
      code: 'x',
    });
    const got = await h.codingGet('u1', { questionId: 'q' });
    expect(got.work).toEqual([
      { language: 'typescript', code: 'x', bestPassed: 5, bestTotal: 9 },
    ]);
    expect((await h.codingGet('u2', { questionId: 'q' })).work).toEqual([]);
  });

  it('designSave updates only the fields it is given', async () => {
    const db = fakeDb();
    const h = createHandlers(() => db);
    await h.designSave('u', { questionId: 'd', notes: 'n1' });
    await h.designSave('u', { questionId: 'd', diagram: '[1]' });
    await h.designSave('u', { questionId: 'd', notes: undefined });
    const got = await h.designGet('u', { questionId: 'd' });
    expect([got.notes, got.diagram]).toEqual(['n1', '[1]']);
  });

  it('prefsSet never clears a preference it was not given', async () => {
    const db = fakeDb();
    const h = createHandlers(() => db);
    await h.prefsSet('u', { language: 'python' });
    expect(await h.prefsSet('u', { level: 'L6', language: undefined })).toEqual(
      {
        language: 'python',
        level: 'L6',
      },
    );
  });

  it('returns grades newest first and the latest per question in progressGet', async () => {
    const db = fakeDb();
    const h = createHandlers(() => db);
    await h.designAddGrade('u', { questionId: 'd', record: grade(4) });
    const { grades } = await h.designAddGrade('u', {
      questionId: 'd',
      record: grade(8),
    });
    expect(grades.map((g) => g.grade.score)).toEqual([8, 4]);
    const p = await h.progressGet('u');
    expect(p.latestGrades).toEqual([
      { questionId: 'd', verdict: 'hire', score: 8 },
    ]);
  });

  it('importLocal fills gaps and never overwrites what the server has', async () => {
    const db = fakeDb();
    const h = createHandlers(() => db);
    await h.codingSave('u', {
      questionId: 'q1',
      language: 'typescript',
      code: 'server',
    });
    await h.designAddGrade('u', { questionId: 'd1', record: grade(6) });
    const payload = {
      coding: [
        {
          questionId: 'q1',
          language: 'typescript' as const,
          code: 'local',
          bestPassed: 9,
          bestTotal: 9,
        },
        {
          questionId: 'q2',
          language: 'python' as const,
          code: 'py',
          bestPassed: null,
          bestTotal: null,
        },
      ],
      designs: [{ questionId: 'd1', notes: 'local notes', diagram: null }],
      grades: [
        { questionId: 'd1', record: grade(2) },
        { questionId: 'd2', record: grade(7) },
      ],
      prefs: { level: 'L4' as const },
    };
    const { imported } = await h.importLocal('u', payload);
    // q2 code, d1 notes, d2 grade, prefs
    expect(imported).toBe(4);
    expect((await h.codingGet('u', { questionId: 'q1' })).work[0]?.code).toBe(
      'server',
    );
    expect(
      (await h.designGet('u', { questionId: 'd1' })).grades.map(
        (g) => g.grade.score,
      ),
    ).toEqual([6]);
    expect((await h.designGet('u', { questionId: 'd1' })).notes).toBe(
      'local notes',
    );
    // A second import (another browser) changes nothing.
    expect((await h.importLocal('u', payload)).imported).toBe(0);
  });
});
