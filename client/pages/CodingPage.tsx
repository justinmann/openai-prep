import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'ugly-app/client';
import { findCoding } from '../../shared/questions';
import type { CodingQuestion } from '../../shared/questions';
import { CodeEditor } from '../components/CodeEditor';
import { Markdown } from '../components/Markdown';
import { TopBar } from '../components/TopBar';
import { Link } from '../router';
import { runCode, type RunHandle, type RunUpdate } from '../runner/runCode';
import { codeDraft, codingProgress } from '../storage';

const ICON: Record<string, string> = { pass: '✓', fail: '✗', timeout: '⏱', skipped: '–' };

export default function CodingPage({ id }: { id: string }): React.ReactElement {
  const q = findCoding(id);
  if (!q)
    return (
      <div className="notfound">
        No coding question “{id}”. <Link to="" params={{}}>Back to the list</Link>
      </div>
    );
  return <CodingWorkspace key={q.id} q={q} />;
}

function CodingWorkspace({ q }: { q: CodingQuestion }): React.ReactElement {
  const tests = useMemo(() => q.parts.flatMap((p) => p.tests), [q]);
  const partOf = useMemo(() => q.parts.flatMap((p, pi) => p.tests.map(() => pi)), [q]);
  const [code, setCode] = useState(() => codeDraft.get(q.id) ?? q.starter);
  const [run, setRun] = useState<RunUpdate | null>(null);
  const [tab, setTab] = useState<'results' | 'console'>('results');
  const [left, setLeft] = useState<'prompt' | 'solution'>('prompt');
  const [confirmReset, setConfirmReset] = useState(false);
  const handle = useRef<RunHandle | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    const t = setTimeout(() => { codeDraft.set(q.id, code); }, 300);
    return () => { clearTimeout(t); };
  }, [code, q.id]);

  useEffect(() => () => handle.current?.cancel(), []);

  const running = run !== null && !run.done;

  const start = useCallback(() => {
    handle.current?.cancel();
    setTab('results');
    handle.current = runCode(codeRef.current, tests, (u) => {
      setRun(u);
      if (u.done && !u.compileError) {
        codingProgress.record(q.id, {
          passed: u.results.filter((r) => r?.status === 'pass').length,
          total: tests.length,
        });
      }
    });
  }, [q.id, tests]);

  const passedIn = (pi: number) =>
    run ? run.results.filter((r, i) => partOf[i] === pi && r?.status === 'pass').length : null;
  const totalPassed = run ? run.results.filter((r) => r?.status === 'pass').length : 0;

  return (
    <div className="workspace">
      <TopBar title={q.title}>
        {running ? (
          <Button variant="secondary" size="sm" data-id="stop-run" onClick={() => handle.current?.cancel()}>
            Stop
          </Button>
        ) : (
          <Button variant="primary" size="sm" data-id="run-tests" onClick={start}>
            Run tests <span className="kbd">⌘↵</span>
          </Button>
        )}
      </TopBar>

      <div className="split">
        <aside className="pane pane-left">
          <div className="seg">
            <Button
              size="sm"
              variant={left === 'prompt' ? 'secondary' : 'ghost'}
              data-id="show-prompt"
              onClick={() => { setLeft('prompt'); }}
            >
              Problem
            </Button>
            <Button
              size="sm"
              variant={left === 'solution' ? 'secondary' : 'ghost'}
              data-id="show-solution"
              onClick={() => { setLeft('solution'); }}
            >
              Reference solution
            </Button>
          </div>

          {left === 'prompt' ? (
            <div className="prompt">
              <div className="meta-row">
                <span className={`diff diff-${q.difficulty}`}>{q.difficulty}</span>
                {q.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
              <Markdown text={q.prompt} />
              {q.parts.map((p, pi) => {
                const passed = passedIn(pi);
                return (
                  <div key={p.title} className="part">
                    <div className="part-head">
                      <h3>{p.title}</h3>
                      {passed !== null && run?.done && (
                        <span className={`badge ${passed === p.tests.length ? 'badge-pass' : 'badge-partial'}`}>
                          {passed}/{p.tests.length}
                        </span>
                      )}
                    </div>
                    <Markdown text={p.prompt} />
                  </div>
                );
              })}
              {q.sourceUrl && (
                <p className="muted small">
                  Source:{' '}
                  <a data-id="source-link" href={q.sourceUrl} target="_blank" rel="noreferrer">
                    {new URL(q.sourceUrl).hostname}
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="prompt">
              <p className="muted small">
                One correct approach. Try the problem first; reading this does not change your code.
              </p>
              <pre className="md-pre solution">
                <code>{q.solution}</code>
              </pre>
            </div>
          )}
        </aside>

        <main className="pane pane-right">
          <div className="editor-wrap">
            <CodeEditor
              value={code}
              onChange={setCode}
              language="typescript"
              onSubmit={start}
              data-id="code-editor"
              aria-label="Solution code editor"
            />
          </div>

          <div className="results">
            <div className="results-head">
              <div className="seg">
                <Button
                  size="sm"
                  variant={tab === 'results' ? 'secondary' : 'ghost'}
                  data-id="tab-results"
                  onClick={() => { setTab('results'); }}
                >
                  Tests{run?.done && !run.compileError ? ` ${totalPassed}/${tests.length}` : ''}
                </Button>
                <Button
                  size="sm"
                  variant={tab === 'console' ? 'secondary' : 'ghost'}
                  data-id="tab-console"
                  onClick={() => { setTab('console'); }}
                >
                  Console{run?.logs.length ? ` (${run.logs.length})` : ''}
                </Button>
              </div>
              <div className="results-tools">
                {confirmReset ? (
                  <>
                    <span className="muted small">Discard your code?</span>
                    <Button
                      size="sm"
                      variant="error"
                      data-id="confirm-reset"
                      onClick={() => {
                        setCode(q.starter);
                        codeDraft.clear(q.id);
                        setConfirmReset(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button size="sm" variant="ghost" data-id="cancel-reset" onClick={() => { setConfirmReset(false); }}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" data-id="reset-code" onClick={() => { setConfirmReset(true); }}>
                    Reset to starter
                  </Button>
                )}
              </div>
            </div>

            <div className="results-body" data-id="results-body">
              {tab === 'console' ? (
                run?.logs.length ? (
                  <pre className="console">
                    {run.logs.map((l, i) => (
                      <div key={i} className={`log log-${l.level}`}>
                        {l.text}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <div className="empty">console.log output from your code appears here.</div>
                )
              ) : !run ? (
                <div className="empty">
                  Press <span className="kbd">⌘↵</span> or <strong>Run tests</strong> to check your solution. Your
                  code runs in a sandboxed worker in this browser; types are stripped, not checked. You can{' '}
                  <code>import</code> npm packages by name (loaded from esm.sh), e.g.{' '}
                  <code>import {'{'} chunk {'}'} from &apos;lodash-es&apos;</code>.
                </div>
              ) : run.compileError ? (
                <div className="compile-error">
                  <strong>Could not compile</strong>
                  <pre>{run.compileError}</pre>
                </div>
              ) : (
                <>
                  {run.loading && <div className="loading">Loading {run.loading.join(', ')} from esm.sh…</div>}
                  {run.done && totalPassed === tests.length && (
                    <div className="allpass">All {tests.length} tests pass. Talk through complexity and edge cases next.</div>
                  )}
                  {q.parts.map((p) => (
                    <div key={p.title} className="result-group">
                      <div className="result-group-head">{p.title}</div>
                      {p.tests.map((t) => {
                        const idx = tests.indexOf(t);
                        const r = run.results[idx];
                        const st = r ? r.status : run.running === idx ? 'running' : 'pending';
                        return (
                          <div key={t.name} className={`trow t-${st}`} data-id={`test-${idx}`}>
                            <span className="ticon">{ICON[st] ?? '·'}</span>
                            <div className="tmain">
                              <div className="tname">{t.name}</div>
                              {r?.message && r.status !== 'pass' && <div className="tmsg">{r.message}</div>}
                            </div>
                            {r && r.status !== 'skipped' && <span className="tms mono">{Math.round(r.ms)} ms</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
