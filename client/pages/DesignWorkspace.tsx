import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Button, callTextGen } from 'ugly-app/client';
import {
  GRADER_MODEL,
  buildGraderMessages,
  levels,
  parseGrade,
  requirementCoverage,
  verdictLabels,
  weightedEmphasis,
  type CoverageStatus,
  type Level,
} from '../../shared/grader';
import { findCompany } from '../../shared/companies';
import { countDrawn, diagramOutline } from '../../shared/diagram';
import type { DesignQuestion } from '../../shared/questions';
import { CodeEditor } from '../components/CodeEditor';
import { CompanyPicker } from '../components/CompanyPicker';
import { DesignBrief } from '../components/QuestionBits';
import { TopBar } from '../components/TopBar';
import { useCompanyPref } from '../companyPref';
import type { DesignWorkspaceProps } from '../workspaces';
import { DesignPreview } from './DesignPage';
import type { GradeRecordIo as GradeRecord } from '../../shared/api';
import {
  importLocalOnce,
  saveLabel,
  useAutosave,
  useTypedApp,
  type SaveStatus,
} from '../progress';

const loadWhiteboard = () => import('../components/Whiteboard');
const Whiteboard = lazy(loadWhiteboard);

const STATUS_LABEL: Record<CoverageStatus, string> = {
  met: 'Met',
  partial: 'Partial',
  missing: 'Missing',
};

const TEMPLATE = `## Requirements & assumptions

## Estimates

## API

## Data model

## High-level design

## Deep dives

## Trade-offs & failure modes
`;

const countWords = (s: string) => (s.match(/[A-Za-z0-9]+/g) ?? []).length;

interface Saved {
  notes: string | null;
  diagram: unknown[];
  grades: GradeRecord[];
  level: Level;
}

/** Saved diagram JSON → elements; anything unparseable starts an empty board. */
function parseDiagram(json: string | null): unknown[] {
  if (!json) return [];
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v)
      ? v.filter(
          (e) =>
            typeof e === 'object' &&
            e !== null &&
            typeof (e as { id?: unknown }).id === 'string' &&
            typeof (e as { type?: unknown }).type === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

// The signed-in design workspace. Loaded only in the browser, after sign-in
// (client/workspaces.ts); the server renders DesignPage's preview instead.
export default function DesignApp({
  q,
}: DesignWorkspaceProps): React.ReactElement {
  const { socket, userId } = useTypedApp();
  const [saved, setSaved] = useState<Saved | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const run = { live: true };
    setLoadError(null);
    void (async () => {
      try {
        await importLocalOnce(socket, userId);
        const res = await socket.request('designGet', { questionId: q.id });
        if (run.live)
          setSaved({
            notes: res.notes,
            diagram: parseDiagram(res.diagram),
            grades: res.grades,
            level: res.prefs.level,
          });
      } catch (err) {
        console.error('[design] could not load your work', err);
        if (run.live) setLoadError('Could not load your saved work.');
      }
    })();
    return () => {
      run.live = false;
    };
  }, [q, socket, userId, attempt]);

  if (!saved)
    return (
      <DesignPreview
        q={q}
        status={
          loadError ? (
            <>
              {loadError}{' '}
              <Button
                size="sm"
                variant="secondary"
                data-id="retry-load"
                onClick={() => {
                  setAttempt((n) => n + 1);
                }}
              >
                Retry
              </Button>
            </>
          ) : (
            'Loading your work…'
          )
        }
      />
    );
  return <DesignWorkspace key={q.id} q={q} saved={saved} />;
}

const worst = (a: SaveStatus, b: SaveStatus): SaveStatus =>
  a === 'error' || b === 'error'
    ? 'error'
    : a === 'saving' || b === 'saving'
      ? 'saving'
      : 'saved';

function DesignWorkspace({
  q,
  saved,
}: {
  q: DesignQuestion;
  saved: Saved;
}): React.ReactElement {
  const { socket } = useTypedApp();
  const [text, setText] = useState(() => saved.notes ?? TEMPLATE);
  const savedDiagram = saved.diagram;
  const diagram = useRef<readonly ExcalidrawElement[] | null>(null);
  // JSON of the board, updated only when the drawing itself changes.
  const [diagramJson, setDiagramJson] = useState<string | null>(null);
  const [shapes, setShapes] = useState(() =>
    countDrawn(savedDiagram as ExcalidrawElement[]),
  );
  const [notesOpen, setNotesOpen] = useState(true);
  const [level, setLevel] = useState<Level>(saved.level);
  const [history, setHistory] = useState<GradeRecord[]>(saved.grades);
  const [shown, setShown] = useState(0);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<'prompt' | 'feedback'>(
    history.length ? 'feedback' : 'prompt',
  );
  const abort = useRef<AbortController | null>(null);
  const [company] = useCompanyPref();

  const notesStatus = useAutosave(
    text,
    (notes) => socket.request('designSave', { questionId: q.id, notes }),
    800,
  );
  const boardStatus = useAutosave(
    diagramJson,
    (json) =>
      json === null
        ? Promise.resolve()
        : socket.request('designSave', { questionId: q.id, diagram: json }),
    1200,
  );
  const saveStatus = worst(notesStatus, boardStatus);
  useEffect(() => () => abort.current?.abort(), []);

  const onDiagramChange = (elements: readonly ExcalidrawElement[]) => {
    diagram.current = elements;
    setShapes(countDrawn(elements));
    setDiagramJson(JSON.stringify(elements));
  };

  const words = countWords(text) - countWords(TEMPLATE);

  const grade = async () => {
    if (grading) return;
    if (shapes < 3 && words < 80) {
      setError(
        'Draw your design on the board, or write at least ~80 words of notes, before asking for feedback.',
      );
      return;
    }
    setError(null);
    setGrading(true);
    abort.current = new AbortController();
    try {
      const board = await loadWhiteboard();
      const elements = diagram.current ?? board.restoreSaved(savedDiagram);
      const outline = diagramOutline(elements);
      let imageDataUrl: string | undefined;
      if (outline) {
        try {
          imageDataUrl = await board.exportDiagramPng(elements);
        } catch (err) {
          // The outline still carries the topology; grade without the picture.
          console.error('[design] diagram export failed', err);
        }
      }
      const content = await callTextGen(
        {
          model: GRADER_MODEL,
          messages: buildGraderMessages(
            q,
            text,
            level,
            {
              outline,
              ...(imageDataUrl ? { imageDataUrl } : {}),
            },
            company ?? undefined,
          ),
          options: {
            maxTokens: 16000,
            reasoningEffort: 'medium',
          },
        },
        { signal: abort.current.signal },
      );
      const raw =
        typeof content === 'string'
          ? content
          : content.map((p) => (p.type === 'text' ? p.text : '')).join('');
      const g = parseGrade(raw);
      const record: GradeRecord = {
        at: Date.now(),
        level,
        words: Math.max(0, words),
        shapes,
        company: company?.id ?? null,
        grade: g,
      };
      // Show it at once; the server copy is what other browsers will see.
      setHistory((h) => [record, ...h].slice(0, 10));
      socket
        .request('designAddGrade', { questionId: q.id, record })
        .then((res) => {
          setHistory(res.grades);
        })
        .catch((err: unknown) => {
          console.error('[design] could not save the grade', err);
          setError(
            'Graded, but the result could not be saved to your account.',
          );
        });
      setShown(0);
      setLeft('feedback');
    } catch (err) {
      if (abort.current.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        /402|balance|credit/i.test(msg)
          ? 'Grading failed: your ugly.bot account is out of AI credit.'
          : /401|auth/i.test(msg)
            ? 'Grading failed: please sign in again.'
            : `Grading failed: ${msg.slice(0, 200)}`,
      );
    } finally {
      setGrading(false);
    }
  };

  const rec = history[shown];

  return (
    <div className="workspace">
      <TopBar title={q.title} heading>
        <CompanyPicker />
        <div className="seg" role="group" aria-label="Target level">
          {(Object.keys(levels) as Level[]).map((l) => (
            <Button
              key={l}
              size="sm"
              variant={level === l ? 'secondary' : 'ghost'}
              data-id={`level-${l}`}
              aria-label={`Grade as ${levels[l]}`}
              onClick={() => {
                setLevel(l);
                void socket
                  .request('prefsSet', { level: l })
                  .catch((err: unknown) => {
                    console.error('[design] could not save level', err);
                  });
              }}
            >
              {l}
            </Button>
          ))}
        </div>
        <Button
          variant="primary"
          size="sm"
          data-id="grade-design"
          disabled={grading}
          onClick={() => void grade()}
        >
          {grading ? 'Grading…' : 'Get feedback'}{' '}
          {!grading && <span className="kbd">⌘↵</span>}
        </Button>
      </TopBar>

      <div className="split">
        <aside className="pane pane-left">
          <div className="seg">
            <Button
              size="sm"
              variant={left === 'prompt' ? 'secondary' : 'ghost'}
              data-id="show-prompt"
              onClick={() => {
                setLeft('prompt');
              }}
            >
              Problem
            </Button>
            <Button
              size="sm"
              variant={left === 'feedback' ? 'secondary' : 'ghost'}
              data-id="show-feedback"
              onClick={() => {
                setLeft('feedback');
              }}
            >
              Feedback{history.length ? ` (${history.length})` : ''}
            </Button>
          </div>

          {left === 'prompt' ? (
            <DesignBrief q={q} />
          ) : grading ? (
            <div className="prompt empty">
              Reading your design against the requirements and rubric… this
              takes up to a minute.
            </div>
          ) : !rec ? (
            <div className="prompt empty">
              No feedback yet. Draw your design on the board, add notes
              underneath, then press Get feedback.
            </div>
          ) : (
            <Feedback
              q={q}
              rec={rec}
              history={history}
              shown={shown}
              onShow={setShown}
            />
          )}
        </aside>

        <main className="pane pane-right">
          <div className="board-wrap">
            <Suspense
              fallback={
                <div className="board-loading">Loading whiteboard…</div>
              }
            >
              <Whiteboard initial={savedDiagram} onChange={onDiagramChange} />
            </Suspense>
          </div>
          <div className={`notes ${notesOpen ? '' : 'notes-closed'}`}>
            <div className="notes-head">
              <span className="small muted">
                Notes: numbers, API, data model, trade-offs (what you would say
                out loud)
              </span>
              <Button
                size="sm"
                variant="ghost"
                data-id="toggle-notes"
                aria-label={notesOpen ? 'Hide notes' : 'Show notes'}
                onClick={() => {
                  setNotesOpen((o) => !o);
                }}
              >
                {notesOpen ? 'Hide' : 'Show'}
              </Button>
            </div>
            {notesOpen && (
              <div className="editor-wrap">
                <CodeEditor
                  value={text}
                  onChange={setText}
                  language="markdown"
                  onSubmit={() => void grade()}
                  data-id="design-editor"
                  aria-label="Design notes editor"
                />
              </div>
            )}
          </div>
          <div className="statusbar">
            <span className="muted small">
              {shapes} on the board · {Math.max(0, words)} words · graded as{' '}
              {levels[level]}
              {company ? ` at ${company.name}` : ''} ·{' '}
              <span
                data-id="save-status"
                className={saveStatus === 'error' ? 'error' : ''}
              >
                {saveLabel[saveStatus]}
              </span>
            </span>
            {error && <span className="error small">{error}</span>}
          </div>
        </main>
      </div>
    </div>
  );
}

function Feedback({
  q,
  rec,
  history,
  shown,
  onShow,
}: {
  q: DesignQuestion;
  rec: GradeRecord;
  history: GradeRecord[];
  shown: number;
  onShow: (i: number) => void;
}): React.ReactElement {
  const g = rec.grade;
  const good = g.verdict === 'hire' || g.verdict === 'strong_hire';
  const labelFor = (rid: string) =>
    q.rubric.find((r) => r.id === rid)?.label ?? rid;
  const company = findCompany(rec.company ?? '');
  const emphasis = weightedEmphasis(company, g);
  return (
    <div className="prompt feedback" data-id="feedback">
      <div className={`verdict ${good ? 'verdict-good' : 'verdict-bad'}`}>
        <div className="verdict-score mono">{g.score}/10</div>
        <div>
          <div className="verdict-label">{verdictLabels[g.verdict]}</div>
          <div className="muted small">
            as {levels[rec.level]}
            {company ? ` at ${company.name}` : ''} ·{' '}
            {rec.shapes != null ? `${rec.shapes} on the board · ` : ''}
            {rec.words} words · {new Date(rec.at).toLocaleString()}
          </div>
        </div>
      </div>
      <p>{g.summary}</p>

      {company && emphasis && (
        <>
          <h4>What {company.name} weights</h4>
          {emphasis.map((e) => (
            <div key={e.area} className="cov" data-id="emphasis-row">
              <span className="pill pill-score mono">
                {e.score === null ? 'n/a' : `${e.score}/10`}
              </span>
              <div>
                <div className="cov-title">
                  {e.area} <span className="muted small">({e.weight}%)</span>
                </div>
                <div className="cov-note">{e.note}</div>
              </div>
            </div>
          ))}
        </>
      )}

      <h4>Requirements</h4>
      {requirementCoverage(q, g).map((r) => (
        <div key={r.id} className="cov">
          <span className={`pill pill-${r.status ?? 'none'}`}>
            {r.status ? STATUS_LABEL[r.status] : 'n/a'}
          </span>
          <div>
            <div className="cov-title">{r.text}</div>
            <div className="cov-note">{r.note}</div>
          </div>
        </div>
      ))}

      <h4>Rubric</h4>
      {g.rubric.map((r) => (
        <div key={r.id} className="cov">
          <span className={`pill pill-${r.status}`}>
            {STATUS_LABEL[r.status]}
          </span>
          <div>
            <div className="cov-title">{labelFor(r.id)}</div>
            <div className="cov-note">{r.note}</div>
          </div>
        </div>
      ))}

      {g.strengths.length > 0 && (
        <>
          <h4>Strengths</h4>
          <ul>
            {g.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
      <h4>Improve next</h4>
      <ol>
        {g.improvements.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <h4>Follow-ups the interviewer would ask</h4>
      <ul>
        {[
          ...g.followUps,
          ...q.followUps.filter((f) => !g.followUps.includes(f)),
        ]
          .slice(0, 6)
          .map((s, i) => (
            <li key={i}>{s}</li>
          ))}
      </ul>

      {history.length > 1 && (
        <>
          <h4>Previous attempts</h4>
          <div className="history">
            {history.map((h, i) => (
              <Button
                key={h.at}
                size="sm"
                variant={i === shown ? 'secondary' : 'ghost'}
                data-id={`attempt-${i}`}
                onClick={() => {
                  onShow(i);
                }}
              >
                {new Date(h.at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · {h.grade.score}/10
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
