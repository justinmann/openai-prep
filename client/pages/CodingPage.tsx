import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from 'ugly-app/client';
import { findCoding, questionIn } from '../../shared/questions';
import type { CodingQuestion, Language } from '../../shared/questions';
import { CodeEditor } from '../components/CodeEditor';
import { Markdown } from '../components/Markdown';
import { TopBar } from '../components/TopBar';
import { LanguageGuide } from '../components/LanguageGuide';
import { Link, useRouter } from '../router';
import {
  runCode,
  warmPython,
  type RunHandle,
  type RunUpdate,
} from '../runner/runCode';
import { codeDraft, codingProgress, langKey, prefs } from '../storage';

const ICON: Record<string, string> = {
  pass: '✓',
  fail: '✗',
  timeout: '⏱',
  skipped: '–',
};

export default function CodingPage({ id }: { id: string }): React.ReactElement {
  const q = findCoding(id);
  const [lang, setLang] = useState<Language>(() =>
    q?.python ? prefs.language() : 'typescript',
  );
  if (!q)
    return (
      <div className="notfound">
        No coding question “{id}”.{' '}
        <Link to="" params={{}}>
          Back to the list
        </Link>
      </div>
    );
  return (
    <CodingWorkspace
      key={`${q.id}:${lang}`}
      q={q}
      lang={lang}
      onLang={(l) => {
        prefs.setLanguage(l);
        setLang(l);
      }}
    />
  );
}

function LanguagePicker({
  lang,
  onLang,
}: {
  lang: Language;
  onLang: (l: Language) => void;
}): React.ReactElement {
  return (
    <div className="seg" role="group" aria-label="Language">
      {(['typescript', 'python'] as const).map((l) => (
        <Button
          key={l}
          size="sm"
          variant={lang === l ? 'secondary' : 'ghost'}
          data-id={`lang-${l}`}
          aria-pressed={lang === l}
          onClick={() => {
            onLang(l);
          }}
        >
          {l === 'typescript' ? 'TypeScript' : 'Python'}
        </Button>
      ))}
    </div>
  );
}

function CodingWorkspace({
  q,
  lang,
  onLang,
}: {
  q: CodingQuestion;
  lang: Language;
  onLang: (l: Language) => void;
}): React.ReactElement {
  const view = useMemo(() => questionIn(q, lang), [q, lang]);
  const key = langKey(q.id, lang);
  const tests = useMemo(() => view.parts.flatMap((p) => p.tests), [view]);
  const partOf = useMemo(
    () => view.parts.flatMap((p, pi) => p.tests.map(() => pi)),
    [view],
  );
  const [code, setCode] = useState(() => codeDraft.get(key) ?? view.starter);
  const [run, setRun] = useState<RunUpdate | null>(null);
  const [tab, setTab] = useState<'results' | 'console'>('results');
  const [left, setLeft] = useState<'prompt' | 'solution'>('prompt');
  const [confirmReset, setConfirmReset] = useState(false);
  const handle = useRef<RunHandle | null>(null);
  const router = useRouter();
  const openGuide = useCallback(() => {
    let popup: { hide: () => void } | null = null;
    popup = router.openPopup(
      <LanguageGuide
        initial={lang}
        onClose={() => {
          popup?.hide();
        }}
      />,
      { mode: 'transient' },
    );
  }, [router, lang]);
  const codeRef = useRef(code);
  codeRef.current = code;

  useEffect(() => {
    const t = setTimeout(() => {
      codeDraft.set(key, code);
    }, 300);
    return () => {
      clearTimeout(t);
    };
  }, [code, key]);

  useEffect(() => () => handle.current?.cancel(), []);

  useEffect(() => {
    if (lang === 'python') warmPython();
  }, [lang]);

  const running = run !== null && !run.done;

  const start = useCallback(() => {
    handle.current?.cancel();
    setTab('results');
    handle.current = runCode(lang, codeRef.current, tests, (u) => {
      setRun(u);
      if (u.done && !u.compileError) {
        codingProgress.record(key, {
          passed: u.results.filter((r) => r?.status === 'pass').length,
          total: tests.length,
        });
      }
    });
  }, [key, lang, tests]);

  const passedIn = (pi: number) =>
    run
      ? run.results.filter((r, i) => partOf[i] === pi && r?.status === 'pass')
          .length
      : null;
  const totalPassed = run
    ? run.results.filter((r) => r?.status === 'pass').length
    : 0;

  return (
    <div className="workspace">
      <TopBar title={q.title}>
        {q.python && <LanguagePicker lang={lang} onLang={onLang} />}
        <Button
          variant="ghost"
          size="sm"
          data-id="open-guide"
          aria-label="Language guide"
          onClick={openGuide}
        >
          ?
        </Button>
        {running ? (
          <Button
            variant="secondary"
            size="sm"
            data-id="stop-run"
            onClick={() => handle.current?.cancel()}
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            data-id="run-tests"
            onClick={start}
          >
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
              onClick={() => {
                setLeft('prompt');
              }}
            >
              Problem
            </Button>
            <Button
              size="sm"
              variant={left === 'solution' ? 'secondary' : 'ghost'}
              data-id="show-solution"
              onClick={() => {
                setLeft('solution');
              }}
            >
              Reference solution
            </Button>
          </div>

          {left === 'prompt' ? (
            <div className="prompt">
              <div className="meta-row">
                <span className={`diff diff-${q.difficulty}`}>
                  {q.difficulty}
                </span>
                {q.tags.map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
              <Markdown text={view.prompt} />
              {view.parts.map((p, pi) => {
                const passed = passedIn(pi);
                return (
                  <div key={p.title} className="part">
                    <div className="part-head">
                      <h3>{p.title}</h3>
                      {passed !== null && run?.done && (
                        <span
                          className={`badge ${passed === p.tests.length ? 'badge-pass' : 'badge-partial'}`}
                        >
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
                  <a
                    data-id="source-link"
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {new URL(q.sourceUrl).hostname}
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div className="prompt">
              <p className="muted small">
                One correct approach. Try the problem first; reading this does
                not change your code.
              </p>
              <pre className="md-pre solution">
                <code>{view.solution}</code>
              </pre>
            </div>
          )}
        </aside>

        <main className="pane pane-right">
          <div className="editor-wrap">
            <CodeEditor
              value={code}
              onChange={setCode}
              language={lang}
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
                  onClick={() => {
                    setTab('results');
                  }}
                >
                  Tests
                  {run?.done && !run.compileError
                    ? ` ${totalPassed}/${tests.length}`
                    : ''}
                </Button>
                <Button
                  size="sm"
                  variant={tab === 'console' ? 'secondary' : 'ghost'}
                  data-id="tab-console"
                  onClick={() => {
                    setTab('console');
                  }}
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
                        setCode(view.starter);
                        codeDraft.clear(key);
                        setConfirmReset(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-id="cancel-reset"
                      onClick={() => {
                        setConfirmReset(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    data-id="reset-code"
                    onClick={() => {
                      setConfirmReset(true);
                    }}
                  >
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
                  <div className="empty">
                    {lang === 'python' ? 'print()' : 'console.log'} output from
                    your code appears here.
                  </div>
                )
              ) : !run ? (
                <div className="empty">
                  Press <span className="kbd">⌘↵</span> or{' '}
                  <strong>Run tests</strong> to check your solution.{' '}
                  {lang === 'python' ? (
                    <>
                      Your code runs in Python 3 (Pyodide) in a worker in this
                      browser. The standard library is available, and packages
                      Pyodide ships, such as <code>numpy</code>, load on{' '}
                      <code>import</code>. The first run loads Python, which
                      takes a few seconds.
                    </>
                  ) : (
                    <>
                      Your code runs in a sandboxed worker in this browser;
                      types are stripped, not checked. You can{' '}
                      <code>import</code> npm packages by name (loaded from
                      esm.sh), e.g.{' '}
                      <code>
                        import {'{'} chunk {'}'} from &apos;lodash-es&apos;
                      </code>
                      .
                    </>
                  )}
                </div>
              ) : run.compileError ? (
                <div className="compile-error">
                  <strong>
                    {lang === 'python' ? 'Could not run' : 'Could not compile'}
                  </strong>
                  <pre>{run.compileError}</pre>
                </div>
              ) : (
                <>
                  {run.loading && (
                    <div className="loading">
                      Loading {run.loading.join(', ')}
                      {lang === 'typescript' ? ' from esm.sh' : ''}…
                    </div>
                  )}
                  {run.done && totalPassed === tests.length && (
                    <div className="allpass">
                      All {tests.length} tests pass. Talk through complexity and
                      edge cases next.
                    </div>
                  )}
                  {view.parts.map((p) => (
                    <div key={p.title} className="result-group">
                      <div className="result-group-head">{p.title}</div>
                      {p.tests.map((t) => {
                        const idx = tests.indexOf(t);
                        const r = run.results[idx];
                        const st = r
                          ? r.status
                          : run.running === idx
                            ? 'running'
                            : 'pending';
                        return (
                          <div
                            key={t.name}
                            className={`trow t-${st}`}
                            data-id={`test-${idx}`}
                          >
                            <span className="ticon">{ICON[st] ?? '·'}</span>
                            <div className="tmain">
                              <div className="tname">{t.name}</div>
                              {r?.message && r.status !== 'pass' && (
                                <div className="tmsg">{r.message}</div>
                              )}
                            </div>
                            {r && r.status !== 'skipped' && (
                              <span className="tms mono">
                                {Math.round(r.ms)} ms
                              </span>
                            )}
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
