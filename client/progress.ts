import { useEffect, useRef, useState } from 'react';
import { useApp, type AppSocket } from 'ugly-app/client';
import {
  gradeRecordIo,
  type AppRegistry,
  type ImportLocalInput,
} from '../shared/api';
import { codingQuestions, designQuestions } from '../shared/questions';

// Progress lives on the server (per user) so it follows you between browsers.
// This module holds the client side: a typed socket, autosave, and the one-time
// upload of progress an older version kept in this browser's localStorage.

export type Socket = AppSocket<AppRegistry>;

/** useApp() types its socket loosely; narrow it to this app's registry once. */
export function useTypedApp() {
  const app = useApp();
  return { ...app, socket: app.socket as unknown as Socket };
}

export type SaveStatus = 'saved' | 'saving' | 'error';

/**
 * Save `value` `ms` after it stops changing (never on mount). A pending save is
 * flushed when the component unmounts, so leaving a page keeps the last edit.
 */
export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<unknown>,
  ms: number,
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const first = useRef(true);
  const pending = useRef<{ v: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const alive = useRef(true);

  const flush = useRef(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (alive.current) setStatus('saving');
    saveRef.current(p.v).then(
      () => {
        if (alive.current && !pending.current) setStatus('saved');
      },
      (err: unknown) => {
        console.error('[progress] save failed', err);
        if (alive.current) setStatus('error');
      },
    );
  });

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = { v: value };
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush.current();
    }, ms);
  }, [value, ms]);

  useEffect(() => {
    alive.current = true;
    const onHide = () => {
      flush.current();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      alive.current = false;
      flush.current();
    };
  }, []);

  return status;
}

export const saveLabel: Record<SaveStatus, string> = {
  saved: 'saved',
  saving: 'saving…',
  error: 'not saved, check your connection',
};

// ── One-time import of localStorage progress ─────────────────────────────────

const PREFIX = 'oaiprep:';

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  const raw = read(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readRun(key: string): { passed: number; total: number } | null {
  const v = readJson(key);
  if (
    v &&
    typeof v === 'object' &&
    typeof (v as { passed?: unknown }).passed === 'number' &&
    typeof (v as { total?: unknown }).total === 'number'
  )
    return v as { passed: number; total: number };
  return null;
}

/** Everything an older version of this app saved in this browser. */
export function collectLocalProgress(): ImportLocalInput | null {
  const coding: ImportLocalInput['coding'] = [];
  for (const q of codingQuestions)
    for (const [language, suffix] of [
      ['typescript', ''],
      ['python', ':py'],
    ] as const) {
      const code = read(`code:${q.id}${suffix}`);
      const run = readRun(`progress:${q.id}${suffix}`);
      if (code === null && !run) continue;
      coding.push({
        questionId: q.id,
        language,
        code,
        bestPassed: run?.passed ?? null,
        bestTotal: run?.total ?? null,
      });
    }

  const designs: ImportLocalInput['designs'] = [];
  const grades: ImportLocalInput['grades'] = [];
  for (const q of designQuestions) {
    const notes = read(`design:${q.id}`);
    const diagram = read(`diagram:${q.id}`);
    if (notes !== null || diagram !== null)
      designs.push({ questionId: q.id, notes, diagram });
    const recs = readJson(`grades:${q.id}`);
    if (Array.isArray(recs))
      for (const r of recs) {
        const ok = gradeRecordIo.safeParse({
          shapes: null,
          ...(r as object),
        });
        if (ok.success) grades.push({ questionId: q.id, record: ok.data });
      }
  }

  const lang = read('language');
  const level = read('level');
  const prefs: NonNullable<ImportLocalInput['prefs']> = {};
  if (lang === 'python' || lang === 'typescript') prefs.language = lang;
  if (level === 'L4' || level === 'L5' || level === 'L6') prefs.level = level;

  if (!coding.length && !designs.length && !grades.length && !lang && !level)
    return null;
  return { coding, designs, grades, prefs };
}

let importing: Promise<void> | null = null;

/**
 * Upload this browser's old localStorage progress once per user. The server
 * never overwrites existing rows, so running it from two browsers is safe.
 * Resolves (never rejects) once the server has whatever this browser had.
 */
export function importLocalOnce(socket: Socket, userId: string): Promise<void> {
  const flag = `imported:${userId}`;
  if (read(flag)) return Promise.resolve();
  importing ??= (async () => {
    const payload = collectLocalProgress();
    try {
      if (payload) {
        const { imported } = await socket.request('importLocal', payload);
        if (imported) console.log(`[progress] imported ${imported} item(s)`);
      }
      try {
        localStorage.setItem(PREFIX + flag, '1');
      } catch {
        // storage blocked: harmless, the import is idempotent
      }
    } catch (err) {
      console.error('[progress] import of local progress failed', err);
    } finally {
      importing = null;
    }
  })();
  return importing;
}
