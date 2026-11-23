import React, { useEffect, useRef, useState } from 'react';
import { Button, callTextGen } from 'ugly-app/client';
import {
  GRADER_MODEL,
  buildGraderMessages,
  levels,
  parseGrade,
  requirementCoverage,
  verdictLabels,
  type CoverageStatus,
  type Level,
} from '../../shared/grader';
import { findDesign } from '../../shared/questions';
import type { DesignQuestion } from '../../shared/questions';
import { CodeEditor } from '../components/CodeEditor';
import { Markdown } from '../components/Markdown';
import { TopBar } from '../components/TopBar';
import { Link } from '../router';
import { designDraft, gradeHistory, prefs, type GradeRecord } from '../storage';

const STATUS_LABEL: Record<CoverageStatus, string> = { met: 'Met', partial: 'Partial', missing: 'Missing' };

const TEMPLATE = `## Requirements & assumptions

## Estimates

## API

## Data model

## High-level design

## Deep dives

## Trade-offs & failure modes
`;

const countWords = (s: string) => (s.match(/[A-Za-z0-9]+/g) ?? []).length;

export default function DesignPage({ id }: { id: string }): React.ReactElement {
  const q = findDesign(id);
  if (!q)
    return (
      <div className="notfound">
        No design question “{id}”. <Link to="" params={{}}>Back to the list</Link>
      </div>
    );
  return <DesignWorkspace key={q.id} q={q} />;
}

function DesignWorkspace({ q }: { q: DesignQuestion }): React.ReactElement {
  const [text, setText] = useState(() => designDraft.get(q.id) ?? TEMPLATE);
  const [level, setLevel] = useState<Level>(() => prefs.level());
  const [history, setHistory] = useState<GradeRecord[]>(() => gradeHistory.get(q.id));
  const [shown, setShown] = useState(0);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<'prompt' | 'feedback'>(history.length ? 'feedback' : 'prompt');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { designDraft.set(q.id, text); }, 300);
    return () => { clearTimeout(t); };
  }, [text, q.id]);
  useEffect(() => () => abort.current?.abort(), []);

  const words = countWords(text) - countWords(TEMPLATE);

  const grade = async () => {
    if (grading) return;
    if (words < 80) {
      setError('Write a bit more first: the grader needs at least ~80 words of design to judge.');
      return;
    }
    setError(null);
    setGrading(true);
    abort.current = new AbortController();
    try {
      const content = await callTextGen(
        {
          model: GRADER_MODEL,
          messages: buildGraderMessages(q, text, level),
          options: { maxTokens: 6000, temperature: 0.2, reasoningEffort: 'off' },
        },
        { signal: abort.current.signal },
      );
      const raw =
        typeof content === 'string'
          ? content
          : content.map((p) => (p.type === 'text' ? p.text : '')).join('');
      const g = parseGrade(raw);
      const next = gradeHistory.add(q.id, { at: Date.now(), level, words, grade: g });
      setHistory(next);
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
      <TopBar title={q.title}>
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
                prefs.setLevel(l);
              }}
            >
              {l}
            </Button>
          ))}
        </div>
        <Button variant="primary" size="sm" data-id="grade-design" disabled={grading} onClick={() => void grade()}>
          {grading ? 'Grading…' : 'Get feedback'} {!grading && <span className="kbd">⌘↵</span>}
        </Button>
      </TopBar>

      <div className="split">
        <aside className="pane pane-left">
          <div className="seg">
            <Button size="sm" variant={left === 'prompt' ? 'secondary' : 'ghost'} data-id="show-prompt" onClick={() => { setLeft('prompt'); }}>
              Problem
            </Button>
            <Button
              size="sm"
              variant={left === 'feedback' ? 'secondary' : 'ghost'}
              data-id="show-feedback"
              onClick={() => { setLeft('feedback'); }}
            >
              Feedback{history.length ? ` (${history.length})` : ''}
            </Button>
          </div>

          {left === 'prompt' ? (
            <div className="prompt">
              <Markdown text={q.prompt} />
              <h4>Functional requirements</h4>
              <ul>
                {q.functional.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <h4>Non-functional requirements</h4>
              <ul>
                {q.nonFunctional.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <h4>Scale</h4>
              <ul>
                {q.scale.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <h4>What the grader looks for</h4>
              <ul className="rubric-list">
                {q.rubric.map((r) => (
                  <li key={r.id}>{r.label}</li>
                ))}
              </ul>
            </div>
          ) : grading ? (
            <div className="prompt empty">Reading your design against the requirements and rubric… this takes up to a minute.</div>
          ) : !rec ? (
            <div className="prompt empty">No feedback yet. Write your design on the right, then press Get feedback.</div>
          ) : (
            <Feedback q={q} rec={rec} history={history} shown={shown} onShow={setShown} />
          )}
        </aside>

        <main className="pane pane-right">
          <div className="editor-wrap">
            <CodeEditor
              value={text}
              onChange={setText}
              language="markdown"
              onSubmit={() => void grade()}
              data-id="design-editor"
              aria-label="Design answer editor"
            />
          </div>
          <div className="statusbar">
            <span className="muted small">
              {Math.max(0, words)} words · graded as {levels[level]} · saved in this browser
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
  const labelFor = (rid: string) => q.rubric.find((r) => r.id === rid)?.label ?? rid;
  return (
    <div className="prompt feedback" data-id="feedback">
      <div className={`verdict ${good ? 'verdict-good' : 'verdict-bad'}`}>
        <div className="verdict-score mono">{g.score}/10</div>
        <div>
          <div className="verdict-label">{verdictLabels[g.verdict]}</div>
          <div className="muted small">
            as {levels[rec.level]} · {rec.words} words · {new Date(rec.at).toLocaleString()}
          </div>
        </div>
      </div>
      <p>{g.summary}</p>

      <h4>Requirements</h4>
      {requirementCoverage(q, g).map((r) => (
        <div key={r.id} className="cov">
          <span className={`pill pill-${r.status ?? 'none'}`}>{r.status ? STATUS_LABEL[r.status] : 'n/a'}</span>
          <div>
            <div className="cov-title">{r.text}</div>
            <div className="cov-note">{r.note}</div>
          </div>
        </div>
      ))}

      <h4>Rubric</h4>
      {g.rubric.map((r) => (
        <div key={r.id} className="cov">
          <span className={`pill pill-${r.status}`}>{STATUS_LABEL[r.status]}</span>
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
        {[...g.followUps, ...q.followUps.filter((f) => !g.followUps.includes(f))].slice(0, 6).map((s, i) => (
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
                onClick={() => { onShow(i); }}
              >
                {new Date(h.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {h.grade.score}/10
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
