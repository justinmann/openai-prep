import type { Grade, Level } from '../shared/grader';
import type { Language } from '../shared/questions/types';

// Per-browser drafts and progress. Every access is guarded: storage can be
// unavailable (private mode, blocked site data) and the app must still work.

const PREFIX = 'oaiprep:';

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    // ignore: progress just won't persist
  }
}

function readJson<T>(
  key: string,
  isValid: (v: unknown) => v is T,
  fallback: T,
): T {
  const raw = read(key);
  if (raw === null) return fallback;
  try {
    const v: unknown = JSON.parse(raw);
    return isValid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export const codeDraft = {
  get: (id: string) => read(`code:${id}`),
  set: (id: string, code: string) => {
    write(`code:${id}`, code);
  },
  clear: (id: string) => {
    write(`code:${id}`, null);
  },
};

export interface CodingProgress {
  passed: number;
  total: number;
}

const isProgress = (v: unknown): v is CodingProgress =>
  typeof v === 'object' && v !== null && 'passed' in v && 'total' in v;

export const codingProgress = {
  get: (id: string): CodingProgress | null =>
    readJson(
      `progress:${id}`,
      (v): v is CodingProgress | null => v === null || isProgress(v),
      null,
    ),
  /** Keeps the best run, so a broken refactor does not erase a solve. */
  record: (id: string, p: CodingProgress) => {
    const prev = codingProgress.get(id);
    if (!prev || p.passed >= prev.passed || prev.total !== p.total)
      write(`progress:${id}`, JSON.stringify(p));
  },
};

export const designDraft = {
  get: (id: string) => read(`design:${id}`),
  set: (id: string, text: string) => {
    write(`design:${id}`, text);
  },
};

/** The whiteboard's Excalidraw elements, kept as raw JSON; Excalidraw's own `restore` validates them on load. */
export const designDiagram = {
  get: (id: string): unknown[] =>
    readJson(
      `diagram:${id}`,
      (v): v is unknown[] => Array.isArray(v),
      [],
    ).filter(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as { id?: unknown }).id === 'string' &&
        typeof (e as { type?: unknown }).type === 'string',
    ),
  set: (id: string, elements: readonly unknown[]) => {
    write(`diagram:${id}`, JSON.stringify(elements));
  },
};

export interface GradeRecord {
  at: number;
  level: Level;
  words: number;
  /** Elements drawn on the whiteboard; absent on attempts graded before it existed. */
  shapes?: number;
  grade: Grade;
}

const isRecords = (v: unknown): v is GradeRecord[] => Array.isArray(v);

export const gradeHistory = {
  get: (id: string): GradeRecord[] => readJson(`grades:${id}`, isRecords, []),
  add: (id: string, r: GradeRecord) => {
    const next = [r, ...gradeHistory.get(id)].slice(0, 10);
    write(`grades:${id}`, JSON.stringify(next));
    return next;
  },
};

/** Draft and progress key for a question in a language (TS keeps the old key). */
export const langKey = (id: string, lang: Language): string =>
  lang === 'typescript' ? id : `${id}:py`;

export const prefs = {
  language: (): Language =>
    read('language') === 'python' ? 'python' : 'typescript',
  setLanguage: (l: Language) => {
    write('language', l);
  },
  level: (): Level => {
    const v = read('level');
    return v === 'L4' || v === 'L5' || v === 'L6' ? v : 'L5';
  },
  setLevel: (l: Level) => {
    write('level', l);
  },
};
