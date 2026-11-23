import { nanoid } from 'nanoid';
import { dbDefaults } from 'ugly-app/shared';
import type { GradeRecordIo } from '../shared/api';
import {
  codingWorkId,
  collections,
  designWorkId,
  userPrefsId,
  type CodingWork,
  type DesignGrade,
  type DesignWork,
  type UserPrefs,
} from '../shared/collections';

// Request handlers, shared by the Node entry (server/index.ts) and the Worker
// (server/workers.ts) so a request can never be registered on one and missing
// on the other. They differ only in how they reach TypedDB, hence `getDb`.

/** The slice of TypedDB these handlers use. */
export interface DbSurface {
  getDoc<T = unknown>(col: unknown, id: string): Promise<T | null>;
  find<T = unknown>(
    col: unknown,
    filter: unknown,
    opts?: unknown,
  ): Promise<T[]>;
  setDoc(col: unknown, doc: unknown): Promise<unknown>;
}

type Language = CodingWork['language'];
type Level = UserPrefs['level'];

const DEFAULT_PREFS = { language: 'typescript', level: 'L5' } as const;
const GRADES_SHOWN = 10;

const toRecord = (g: DesignGrade): GradeRecordIo => ({
  at: g.at,
  level: g.level,
  words: g.words,
  shapes: g.shapes,
  company: g.company ?? null,
  grade: g.grade,
});

async function readPrefs(db: DbSurface, userId: string) {
  const p = await db.getDoc<UserPrefs>(
    collections.userPrefs,
    userPrefsId(userId),
  );
  return {
    language: p?.language ?? DEFAULT_PREFS.language,
    level: p?.level ?? DEFAULT_PREFS.level,
  };
}

async function writePrefs(
  db: DbSurface,
  userId: string,
  patch: { language?: Language | undefined; level?: Level | undefined },
) {
  const prev = await readPrefs(db, userId);
  const next = {
    language: patch.language ?? prev.language,
    level: patch.level ?? prev.level,
  };
  await db.setDoc(collections.userPrefs, {
    _id: userPrefsId(userId),
    ...dbDefaults(),
    userId,
    ...next,
  });
  return next;
}

async function readCoding(
  db: DbSurface,
  userId: string,
  questionId: string,
  language: Language,
) {
  return db.getDoc<CodingWork>(
    collections.codingWork,
    codingWorkId(userId, questionId, language),
  );
}

async function writeCoding(
  db: DbSurface,
  userId: string,
  questionId: string,
  language: Language,
  fields: Pick<CodingWork, 'code' | 'bestPassed' | 'bestTotal'>,
) {
  await db.setDoc(collections.codingWork, {
    _id: codingWorkId(userId, questionId, language),
    ...dbDefaults(),
    userId,
    questionId,
    language,
    ...fields,
  });
}

async function readDesign(db: DbSurface, userId: string, questionId: string) {
  return db.getDoc<DesignWork>(
    collections.designWork,
    designWorkId(userId, questionId),
  );
}

async function writeDesign(
  db: DbSurface,
  userId: string,
  questionId: string,
  fields: Pick<DesignWork, 'notes' | 'diagram'>,
) {
  await db.setDoc(collections.designWork, {
    _id: designWorkId(userId, questionId),
    ...dbDefaults(),
    userId,
    questionId,
    ...fields,
  });
}

async function recentGrades(db: DbSurface, userId: string, questionId: string) {
  const rows = await db.find<DesignGrade>(
    collections.designGrade,
    { userId, questionId },
    { sort: { at: -1 }, limit: GRADES_SHOWN },
  );
  return rows.map(toRecord);
}

async function addGrade(
  db: DbSurface,
  userId: string,
  questionId: string,
  record: GradeRecordIo,
) {
  await db.setDoc(collections.designGrade, {
    _id: nanoid(),
    ...dbDefaults(),
    userId,
    questionId,
    ...record,
  });
}

/** Keep the better run; a different test count (questions changed) resets it. */
export function bestRun(
  prev: { bestPassed: number | null; bestTotal: number | null } | null,
  run: { passed: number; total: number },
): { bestPassed: number; bestTotal: number } {
  if (
    prev?.bestPassed == null ||
    prev.bestTotal !== run.total ||
    run.passed >= prev.bestPassed
  )
    return { bestPassed: run.passed, bestTotal: run.total };
  return { bestPassed: prev.bestPassed, bestTotal: prev.bestTotal };
}

export function createHandlers(getDb: () => DbSurface) {
  return {
    progressGet: async (userId: string) => {
      const db = getDb();
      const [coding, grades, prefs] = await Promise.all([
        db.find<CodingWork>(
          collections.codingWork,
          { userId },
          { limit: 1000 },
        ),
        db.find<DesignGrade>(
          collections.designGrade,
          { userId },
          { sort: { at: -1 }, limit: 1000 },
        ),
        readPrefs(db, userId),
      ]);
      const latest = new Map<string, DesignGrade>();
      for (const g of grades)
        if (!latest.has(g.questionId)) latest.set(g.questionId, g);
      return {
        coding: coding.map((c) => ({
          questionId: c.questionId,
          language: c.language,
          code: null,
          bestPassed: c.bestPassed,
          bestTotal: c.bestTotal,
        })),
        latestGrades: [...latest.values()].map((g) => ({
          questionId: g.questionId,
          verdict: g.grade.verdict,
          score: g.grade.score,
        })),
        prefs,
      };
    },

    prefsSet: async (
      userId: string,
      input: { language?: Language | undefined; level?: Level | undefined },
    ) => writePrefs(getDb(), userId, input),

    codingGet: async (userId: string, input: { questionId: string }) => {
      const db = getDb();
      const [ts, py, prefs] = await Promise.all([
        readCoding(db, userId, input.questionId, 'typescript'),
        readCoding(db, userId, input.questionId, 'python'),
        readPrefs(db, userId),
      ]);
      return {
        work: [ts, py]
          .filter((w): w is CodingWork => w !== null)
          .map((w) => ({
            language: w.language,
            code: w.code,
            bestPassed: w.bestPassed,
            bestTotal: w.bestTotal,
          })),
        prefs,
      };
    },

    codingSave: async (
      userId: string,
      input: { questionId: string; language: Language; code: string | null },
    ) => {
      const db = getDb();
      const prev = await readCoding(
        db,
        userId,
        input.questionId,
        input.language,
      );
      await writeCoding(db, userId, input.questionId, input.language, {
        code: input.code,
        bestPassed: prev?.bestPassed ?? null,
        bestTotal: prev?.bestTotal ?? null,
      });
      return { ok: true as const };
    },

    codingRecordRun: async (
      userId: string,
      input: {
        questionId: string;
        language: Language;
        passed: number;
        total: number;
      },
    ) => {
      const db = getDb();
      const prev = await readCoding(
        db,
        userId,
        input.questionId,
        input.language,
      );
      const best = bestRun(prev, input);
      await writeCoding(db, userId, input.questionId, input.language, {
        code: prev?.code ?? null,
        ...best,
      });
      return best;
    },

    designGet: async (userId: string, input: { questionId: string }) => {
      const db = getDb();
      const [work, grades, prefs] = await Promise.all([
        readDesign(db, userId, input.questionId),
        recentGrades(db, userId, input.questionId),
        readPrefs(db, userId),
      ]);
      return {
        notes: work?.notes ?? null,
        diagram: work?.diagram ?? null,
        grades,
        prefs,
      };
    },

    designSave: async (
      userId: string,
      input: {
        questionId: string;
        notes?: string | undefined;
        diagram?: string | undefined;
      },
    ) => {
      const db = getDb();
      const prev = await readDesign(db, userId, input.questionId);
      await writeDesign(db, userId, input.questionId, {
        notes: input.notes ?? prev?.notes ?? null,
        diagram: input.diagram ?? prev?.diagram ?? null,
      });
      return { ok: true as const };
    },

    designAddGrade: async (
      userId: string,
      input: { questionId: string; record: GradeRecordIo },
    ) => {
      const db = getDb();
      await addGrade(db, userId, input.questionId, input.record);
      return { grades: await recentGrades(db, userId, input.questionId) };
    },

    importLocal: async (
      userId: string,
      input: {
        coding: {
          questionId: string;
          language: Language;
          code: string | null;
          bestPassed: number | null;
          bestTotal: number | null;
        }[];
        designs: {
          questionId: string;
          notes: string | null;
          diagram: string | null;
        }[];
        grades: { questionId: string; record: GradeRecordIo }[];
        prefs?:
          | { language?: Language | undefined; level?: Level | undefined }
          | undefined;
      },
    ) => {
      const db = getDb();
      let imported = 0;
      for (const c of input.coding) {
        if (await readCoding(db, userId, c.questionId, c.language)) continue;
        await writeCoding(db, userId, c.questionId, c.language, {
          code: c.code,
          bestPassed: c.bestPassed,
          bestTotal: c.bestTotal,
        });
        imported++;
      }
      for (const d of input.designs) {
        if (await readDesign(db, userId, d.questionId)) continue;
        await writeDesign(db, userId, d.questionId, {
          notes: d.notes,
          diagram: d.diagram,
        });
        imported++;
      }
      // Grades for a question are imported only if the server has none, so a
      // second browser's import cannot duplicate them.
      const byQuestion = new Map<string, GradeRecordIo[]>();
      for (const g of input.grades)
        byQuestion.set(g.questionId, [
          ...(byQuestion.get(g.questionId) ?? []),
          g.record,
        ]);
      for (const [questionId, records] of byQuestion) {
        if ((await recentGrades(db, userId, questionId)).length > 0) continue;
        for (const r of records) {
          await addGrade(db, userId, questionId, r);
          imported++;
        }
      }
      const existingPrefs = await db.getDoc<UserPrefs>(
        collections.userPrefs,
        userPrefsId(userId),
      );
      if (!existingPrefs && input.prefs) {
        await writePrefs(db, userId, input.prefs);
        imported++;
      }
      return { imported };
    },
  };
}
