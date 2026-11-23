import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from 'ugly-app/client';
import { codingReadiness } from '../../shared/companies';
import { questionIn } from '../../shared/questions';
import type { CodingQuestion, Language } from '../../shared/questions';
import { CodeEditor } from '../components/CodeEditor';
import { CompanyPicker } from '../components/CompanyPicker';
import { CodingProblem } from '../components/QuestionBits';
import { TopBar } from '../components/TopBar';
import { LanguageGuide } from '../components/LanguageGuide';
import { useCompanyPref } from '../companyPref';
import { useRouter } from '../router';
import type { CodingWorkspaceProps } from '../workspaces';
import { CodingPreview } from './CodingPage';
import {
  runCode,
  warmPython,
  type RunHandle,
  type RunMode,
  type RunUpdate,
} from '../runner/runCode';
import {
  importLocalOnce,
  saveLabel,
  useAutosave,
  useTypedApp,
} from '../progress';

const ICON: Record<string, string> = {
  pass: '✓',
  fail: '✗',
  timeout: '⏱',
  skipped: '–',
};

// The signed-in coding workspace. Loaded only in the browser, after sign-in
// (client/workspaces.ts); the server renders CodingPage's preview instead.
export default function CodingApp({
  q,
  lang: picked,
}: CodingWorkspaceProps): React.ReactElement {
  const { socket, userId } = useTypedApp();
  // The saved draft for the language on screen; null while loading.
  const [state, setState] = useState<{
    lang: Language;
    code: string | null;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Only the latest load may set state (a language click can start a second).
  const loadSeq = useRef(0);
  const load = useCallback(
    async (want?: Language) => {
      const seq = ++loadSeq.current;
      setLoadError(null);
      try {
        await importLocalOnce(socket, userId);
        const res = await socket.request('codingGet', { questionId: q.id });
        const lang = q.python ? (want ?? res.prefs.language) : 'typescript';
        if (seq !== loadSeq.current) return;
        setState({
          lang,
          code: res.work.find((w) => w.language === lang)?.code ?? null,
        });
      } catch (err) {
        console.error('[coding] could not load your draft', err);
        setLoadError('Could not load your saved code.');
      }
    },
    [q, socket, userId],
  );
  useEffect(() => {
    void load(picked);
    if (picked)
      void socket
        .request('prefsSet', { language: picked })
        .catch((err: unknown) => {
          console.error('[coding] could not save language', err);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first load only
  }, [load]);

  if (!state)
    return (
      <CodingPreview
        q={q}
        lang={picked ?? 'typescript'}
        onLang={(l) => {
          void load(l);
        }}
        status={
          loadError ? (
            <>
              {loadError}{' '}
              <Button
                size="sm"
                variant="secondary"
                data-id="retry-load"
                onClick={() => void load()}
              >
                Retry
              </Button>
            </>
          ) : (
            'Loading your code…'
          )
        }
      />
    );
  return (
    <CodingWorkspace
      key={`${q.id}:${state.lang}`}
      q={q}
      lang={state.lang}
      savedCode={state.code}
      onLang={(l) => {
        setState(null);
        void socket
          .request('prefsSet', { language: l })
          .catch((err: unknown) => {
            console.error('[coding] could not save language', err);
          });
        void load(l);
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

function ConsolePane({
  run,
  main,
  lang,
}: {
  run: RunUpdate | null;
  main: boolean;
  lang: Language;
}): React.ReactElement {
  const outcome = main ? run?.results[0] : undefined;
  let status: React.ReactNode = null;
  if (main && run) {
    if (run.compileError)
      status = (
        <div className="run-status run-fail">
          <strong>Could not run</strong>
          <pre>{run.compileError}</pre>
        </div>
      );
    else if (run.loading)
      status = (
        <div className="run-status">Loading {run.loading.join(', ')}…</div>
      );
    else if (!run.done || !outcome)
      status = <div className="run-status">Running…</div>;
    else if (outcome.status === 'pass')
      status = (
        <div className="run-status run-ok" data-id="run-ok">
          Finished in {Math.round(outcome.ms)} ms
        </div>
      );
    else
      status = (
        <div className="run-status run-fail" data-id="run-error">
          {outcome.message ?? 'Failed'}
        </div>
      );
  }
  if (!run?.logs.length && !status)
    return (
      <div className="empty">
        {lang === 'python' ? 'print()' : 'console.log'} output from your code
        appears here. <strong>Run code</strong> (
        <span className="kbd">⇧⌘↵</span>) runs your file as a program, without
        the tests.
      </div>
    );
  return (
    <div>
      {status}
      {run?.logs.length ? (
        <pre className="console">
          {run.logs.map((l, i) => (
            <div key={i} className={`log log-${l.level}`}>
              {l.text}
            </div>
          ))}
        </pre>
      ) : main && run?.done ? (
        <div className="empty">No output.</div>
      ) : null}
    </div>
  );
}

function CodingWorkspace({
  q,
  lang,
  savedCode,
  onLang,
}: {
  q: CodingQuestion;
  lang: Language;
  savedCode: string | null;
  onLang: (l: Language) => void;
}): React.ReactElement {
  const view = useMemo(() => questionIn(q, lang), [q, lang]);
  const { socket } = useTypedApp();
  const tests = useMemo(() => view.parts.flatMap((p) => p.tests), [view]);
  const partOf = useMemo(
    () => view.parts.flatMap((p, pi) => p.tests.map(() => pi)),
    [view],
  );
  const [code, setCode] = useState(() => savedCode ?? view.starter);
  const [run, setRun] = useState<RunUpdate | null>(null);
  // "Run code" (no tests) is tracked apart so it never wipes test results.
  const [mainRun, setMainRun] = useState<RunUpdate | null>(null);
  const [lastMode, setLastMode] = useState<RunMode>('tests');
  const [tab, setTab] = useState<'results' | 'console'>('results');
  const [left, setLeft] = useState<'prompt' | 'solution'>('prompt');
  const [confirmReset, setConfirmReset] = useState(false);
  const [company] = useCompanyPref();
  // For the company readiness score: time on the question and test runs.
  const openedAt = useRef(Date.now());
  const [runs, setRuns] = useState(0);
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

  // Untouched starter code is saved as null, so a later starter change shows up.
  const saveStatus = useAutosave(
    code,
    (c) =>
      socket.request('codingSave', {
        questionId: q.id,
        language: lang,
        code: c === view.starter ? null : c,
      }),
    800,
  );

  useEffect(() => () => handle.current?.cancel(), []);

  useEffect(() => {
    if (lang === 'python') warmPython();
  }, [lang]);

  const running =
    (run !== null && !run.done) || (mainRun !== null && !mainRun.done);
  const consoleRun = lastMode === 'main' ? mainRun : run;

  const runMain = useCallback(() => {
    handle.current?.cancel();
    setTab('console');
    setLastMode('main');
    handle.current = runCode(lang, codeRef.current, [], setMainRun, 'main');
  }, [lang]);

  const start = useCallback(() => {
    handle.current?.cancel();
    setTab('results');
    setLastMode('tests');
    setRuns((n) => n + 1);
    handle.current = runCode(lang, codeRef.current, tests, (u) => {
      setRun(u);
      if (u.done && !u.compileError) {
        socket
          .request('codingRecordRun', {
            questionId: q.id,
            language: lang,
            passed: u.results.filter((r) => r?.status === 'pass').length,
            total: tests.length,
          })
          .catch((err: unknown) => {
            console.error('[coding] could not save test progress', err);
          });
      }
    });
  }, [socket, q.id, lang, tests]);

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
      <TopBar title={q.title} heading>
        <CompanyPicker />
        <span
          className={`muted small save-status ${saveStatus === 'error' ? 'error' : ''}`}
          data-id="save-status"
        >
          {saveLabel[saveStatus]}
        </span>
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
          <>
            <Button
              variant="secondary"
              size="sm"
              data-id="run-code"
              aria-label="Run code without tests"
              onClick={runMain}
            >
              Run code <span className="kbd">⇧⌘↵</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              data-id="run-tests"
              onClick={start}
            >
              Run tests <span className="kbd">⌘↵</span>
            </Button>
          </>
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
            <CodingProblem
              q={q}
              view={view}
              badge={(pi) => {
                const passed = passedIn(pi);
                const n = view.parts[pi]?.tests.length ?? 0;
                return passed !== null && run?.done ? (
                  <span
                    className={`badge ${passed === n ? 'badge-pass' : 'badge-partial'}`}
                  >
                    {passed}/{n}
                  </span>
                ) : null;
              }}
            />
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
              onRunCode={runMain}
              services
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
                  Console
                  {consoleRun?.logs.length
                    ? ` (${consoleRun.logs.length})`
                    : ''}
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
                <ConsolePane
                  run={consoleRun}
                  main={lastMode === 'main'}
                  lang={lang}
                />
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
                  {run.done && company && (
                    <Readiness
                      company={company}
                      passed={totalPassed}
                      total={tests.length}
                      minutes={(Date.now() - openedAt.current) / 60000}
                      runs={runs}
                    />
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

function Readiness({
  company,
  passed,
  total,
  minutes,
  runs,
}: {
  company: NonNullable<ReturnType<typeof useCompanyPref>[0]>;
  passed: number;
  total: number;
  minutes: number;
  runs: number;
}): React.ReactElement {
  const r = codingReadiness(company, { passed, total, minutes, runs });
  const w = company.codingScore.weights;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <div className="readiness" data-id="readiness">
      <div className="readiness-head">
        <span className="readiness-score mono">{r.score}/10</span>
        <span>
          {company.name} readiness
          <span className="muted small">
            {' '}
            · tests {w.correctness}%, speed {w.speed}%, few runs {w.firstTry}%
          </span>
        </span>
      </div>
      <div className="muted small">
        {passed}/{total} tests · {Math.round(minutes)} min of a{' '}
        {company.codingScore.budgetMin}-min budget (speed {pct(r.speed)}) ·{' '}
        {runs} run{runs === 1 ? '' : 's'} (first-try {pct(r.firstTry)})
        {!company.codingScore.runsCode &&
          ` · ${company.name} interviews usually do not let you run code, so every extra run costs more`}
        {passed < total && ' · speed and runs count once every test passes'}
      </div>
    </div>
  );
}
