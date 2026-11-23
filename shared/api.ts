import {
  authReq,
  defineMessages,
  defineRequests,
  frameworkMessages,
  frameworkRequests,
  z,
} from 'ugly-app/shared';
import {
  LanguageSchema,
  LevelSchema,
  MAX_CODE_CHARS,
  MAX_DIAGRAM_CHARS,
  MAX_NOTES_CHARS,
} from './collections';
import { storedGradeSchema } from './grader';

// Every request is authReq: progress is per user and the whole app requires
// sign-in. The server derives every doc id from the caller's userId.

const questionId = z.string().min(1).max(100);
const code = z.string().max(MAX_CODE_CHARS);
const notes = z.string().max(MAX_NOTES_CHARS);
const diagram = z.string().max(MAX_DIAGRAM_CHARS);

const prefsIo = z.object({ language: LanguageSchema, level: LevelSchema });

const codingWorkIo = z.object({
  language: LanguageSchema,
  code: z.string().nullable(),
  bestPassed: z.number().int().nullable(),
  bestTotal: z.number().int().nullable(),
});

export const gradeRecordIo = z.object({
  at: z.number(),
  level: LevelSchema,
  words: z.number().int(),
  shapes: z.number().int().nullable(),
  /** The company the answer was graded for; absent = general bar. */
  company: z.string().max(40).nullable().optional(),
  grade: storedGradeSchema,
});
export type GradeRecordIo = z.infer<typeof gradeRecordIo>;

const saveRate = { max: 240, window: 60 };

const importLocalInput = z.object({
  coding: z
    .array(
      z.object({
        questionId,
        language: LanguageSchema,
        code: code.nullable(),
        bestPassed: z.number().int().nullable(),
        bestTotal: z.number().int().nullable(),
      }),
    )
    .max(200),
  designs: z
    .array(
      z.object({
        questionId,
        notes: notes.nullable(),
        diagram: diagram.nullable(),
      }),
    )
    .max(100),
  grades: z.array(z.object({ questionId, record: gradeRecordIo })).max(500),
  prefs: prefsIo.partial().optional(),
});
export type ImportLocalInput = z.input<typeof importLocalInput>;

export const requests = defineRequests({
  /** Home page: best run per coding question/language, latest grade per design. */
  progressGet: authReq({
    input: z.object({}),
    output: z.object({
      coding: z.array(codingWorkIo.extend({ questionId: z.string() })),
      latestGrades: z.array(
        z.object({
          questionId: z.string(),
          verdict: storedGradeSchema.shape.verdict,
          score: z.number(),
        }),
      ),
      prefs: prefsIo,
    }),
  }),

  prefsSet: authReq({
    input: prefsIo.partial(),
    output: prefsIo,
    rateLimit: { max: 60, window: 60 },
  }),

  codingGet: authReq({
    input: z.object({ questionId }),
    output: z.object({ work: z.array(codingWorkIo), prefs: prefsIo }),
  }),

  /** Save a draft; `code: null` resets to the starter. */
  codingSave: authReq({
    input: z.object({
      questionId,
      language: LanguageSchema,
      code: code.nullable(),
    }),
    output: z.object({ ok: z.literal(true) }),
    rateLimit: saveRate,
  }),

  /** Record a test run; keeps the best (a broken refactor never erases a solve). */
  codingRecordRun: authReq({
    input: z.object({
      questionId,
      language: LanguageSchema,
      passed: z.number().int().min(0),
      total: z.number().int().min(0),
    }),
    output: z.object({
      bestPassed: z.number().int(),
      bestTotal: z.number().int(),
    }),
    rateLimit: saveRate,
  }),

  designGet: authReq({
    input: z.object({ questionId }),
    output: z.object({
      notes: z.string().nullable(),
      diagram: z.string().nullable(),
      grades: z.array(gradeRecordIo),
      prefs: prefsIo,
    }),
  }),

  /** Save notes and/or the whiteboard (omitted fields are left as they are). */
  designSave: authReq({
    input: z.object({
      questionId,
      notes: notes.optional(),
      diagram: diagram.optional(),
    }),
    output: z.object({ ok: z.literal(true) }),
    rateLimit: saveRate,
  }),

  designAddGrade: authReq({
    input: z.object({ questionId, record: gradeRecordIo }),
    output: z.object({ grades: z.array(gradeRecordIo) }),
    rateLimit: { max: 30, window: 60 },
  }),

  /**
   * One-time upload of progress saved in this browser before it moved to the
   * server. Never overwrites: only fills questions the server has nothing for.
   */
  importLocal: authReq({
    input: importLocalInput,
    output: z.object({ imported: z.number().int() }),
    rateLimit: { max: 10, window: 60 },
  }),
});

export const messages = defineMessages({});

export interface AppRegistry {
  requests: typeof frameworkRequests & typeof requests;
  messages: typeof frameworkMessages & typeof messages;
}
