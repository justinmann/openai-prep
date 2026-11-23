import { d1, defineCollections, type InferDocType } from 'ugly-app/shared';
import { z } from 'zod';
import { storedGradeSchema } from './grader';

// Per-user practice progress, so a session started in one browser continues in
// another. Every doc carries `userId` and every id embeds it, so one user can
// never address another's rows (ids are global across the table).

export const LanguageSchema = z.enum(['typescript', 'python']);
export const LevelSchema = z.enum(['L4', 'L5', 'L6']);

/** Size caps, enforced by the API. D1 rows top out at 2 MB. */
export const MAX_CODE_CHARS = 200_000;
export const MAX_NOTES_CHARS = 100_000;
export const MAX_DIAGRAM_CHARS = 1_500_000;

/** One coding question in one language: the draft and the best test run. */
export const CodingWorkSchema = z.object({
  userId: z.string(),
  questionId: z.string(),
  language: LanguageSchema,
  /** null = never edited / reset: the client shows the starter code. */
  code: z.string().nullable(),
  bestPassed: z.number().int().nullable(),
  bestTotal: z.number().int().nullable(),
});
export type CodingWork = InferDocType<typeof CodingWorkSchema>;
export const codingWorkId = (
  userId: string,
  questionId: string,
  lang: string,
) => `${userId}+coding+${questionId}+${lang}`;

/** One design question: the notes and the whiteboard. */
export const DesignWorkSchema = z.object({
  userId: z.string(),
  questionId: z.string(),
  notes: z.string().nullable(),
  /** Excalidraw elements as JSON text; Excalidraw's restore() validates on load. */
  diagram: z.string().nullable(),
});
export type DesignWork = InferDocType<typeof DesignWorkSchema>;
export const designWorkId = (userId: string, questionId: string) =>
  `${userId}+design+${questionId}`;

/** One graded design attempt (newest first, last 10 shown). */
export const DesignGradeSchema = z.object({
  userId: z.string(),
  questionId: z.string(),
  at: z.number(),
  level: LevelSchema,
  words: z.number().int(),
  shapes: z.number().int().nullable(),
  /** The company the answer was graded for; absent = general bar. */
  company: z.string().nullable().optional(),
  grade: storedGradeSchema,
});
export type DesignGrade = InferDocType<typeof DesignGradeSchema>;

export const UserPrefsSchema = z.object({
  userId: z.string(),
  language: LanguageSchema,
  level: LevelSchema,
});
export type UserPrefs = InferDocType<typeof UserPrefsSchema>;
export const userPrefsId = (userId: string) => `${userId}+prefs`;

const meta = {
  db: d1,
  cache: false,
  trackable: false,
  public: false,
  cascadeFrom: null,
} as const;

// After changing a collection, run: npm run db:schema-gen && npm run db:migrate
export const collections = defineCollections({
  codingWork: {
    schema: CodingWorkSchema,
    meta,
    // progressGet: every row for the user
    indexes: [{ fields: { userId: 1 } }],
  },
  designWork: {
    schema: DesignWorkSchema,
    meta,
    indexes: [{ fields: { userId: 1 } }],
  },
  designGrade: {
    schema: DesignGradeSchema,
    meta,
    // designGet: a question's attempts newest first; progressGet: all, by user
    indexes: [{ fields: { userId: 1, questionId: 1, at: -1 } }],
  },
  userPrefs: {
    schema: UserPrefsSchema,
    meta,
    indexes: [],
  },
});

export type AppCollections = typeof collections;
