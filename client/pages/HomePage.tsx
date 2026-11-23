import React, { useEffect, useState } from 'react';
import { codingQuestions, designQuestions } from '../../shared/questions';
import { verdictLabels, type Grade } from '../../shared/grader';
import { importLocalOnce, useTypedApp } from '../progress';
import { Link } from '../router';

interface Run {
  passed: number;
  total: number;
}
interface Progress {
  /** questionId → best runs (TypeScript and/or Python). */
  coding: Map<string, Run[]>;
  grades: Map<string, { verdict: Grade['verdict']; score: number }>;
}

function CodingBadge({
  runs,
  total,
}: {
  runs: Run[] | undefined;
  total: number;
}): React.ReactElement | null {
  // Best of TypeScript and Python.
  const p = [...(runs ?? [])].sort((a, b) => b.passed - a.passed)[0];
  if (!p) return null;
  const solved = (runs ?? []).some(
    (r) => r.passed === r.total && r.total === total,
  );
  return (
    <span className={`badge ${solved ? 'badge-pass' : 'badge-partial'}`}>
      {solved ? 'Solved' : `${p.passed}/${p.total}`}
    </span>
  );
}

function DesignBadge({
  last,
}: {
  last: { verdict: Grade['verdict']; score: number } | undefined;
}): React.ReactElement | null {
  if (!last) return null;
  const good = last.verdict === 'hire' || last.verdict === 'strong_hire';
  return (
    <span className={`badge ${good ? 'badge-pass' : 'badge-partial'}`}>
      {verdictLabels[last.verdict]} · {last.score}/10
    </span>
  );
}

function useProgress(): Progress | null {
  const { socket, userId } = useTypedApp();
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    const run = { live: true };
    void (async () => {
      await importLocalOnce(socket, userId);
      try {
        const res = await socket.request('progressGet', {});
        if (!run.live) return;
        const coding = new Map<string, Run[]>();
        for (const c of res.coding)
          if (c.bestPassed !== null && c.bestTotal !== null)
            coding.set(c.questionId, [
              ...(coding.get(c.questionId) ?? []),
              { passed: c.bestPassed, total: c.bestTotal },
            ]);
        setProgress({
          coding,
          grades: new Map(res.latestGrades.map((g) => [g.questionId, g])),
        });
      } catch (err) {
        console.error('[home] could not load progress', err);
      }
    })();
    return () => {
      run.live = false;
    };
  }, [socket, userId]);
  return progress;
}

export default function HomePage(): React.ReactElement {
  const progress = useProgress();
  return (
    <div className="home safe-area">
      <header className="home-head">
        <div className="eyebrow">Interview practice</div>
        <h1>OpenAI coding &amp; system design</h1>
        <p className="lede">
          Coding questions run your TypeScript or Python against the tests in
          your browser. Design questions are graded by AI against the
          requirements and an interviewer rubric.
        </p>
      </header>

      <section>
        <div className="section-head">
          <h2>Coding</h2>
          <span className="muted">
            {codingQuestions.length} questions · multi-part, like the real loop
          </span>
        </div>
        <div className="grid">
          {codingQuestions.map((q) => {
            const total = q.parts.reduce((n, p) => n + p.tests.length, 0);
            return (
              <Link
                key={q.id}
                to="coding/:id"
                params={{ id: q.id }}
                className="qcard"
              >
                <div className="qcard-top">
                  <span className={`diff diff-${q.difficulty}`}>
                    {q.difficulty}
                  </span>
                  <CodingBadge
                    runs={progress?.coding.get(q.id)}
                    total={total}
                  />
                </div>
                <h3>{q.title}</h3>
                <p>{q.summary}</p>
                <div className="qcard-foot">
                  {q.parts.length} parts · {total} tests · {q.tags.join(', ')}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>System design</h2>
          <span className="muted">
            {designQuestions.length} questions · write it up, get graded
          </span>
        </div>
        <div className="grid">
          {designQuestions.map((q) => (
            <Link
              key={q.id}
              to="design/:id"
              params={{ id: q.id }}
              className="qcard"
            >
              <div className="qcard-top">
                <span className="diff diff-design">design</span>
                <DesignBadge last={progress?.grades.get(q.id)} />
              </div>
              <h3>{q.title}</h3>
              <p>{q.summary}</p>
              <div className="qcard-foot">{q.tags.join(', ')}</div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="home-foot muted">
        The KV serialize question is from{' '}
        <a
          data-id="source-link"
          href="https://www.hellointerview.com/community/questions/kv-serialize-deserialize/cm6xw6unw00003b6qz67bpfaj"
          target="_blank"
          rel="noreferrer"
        >
          Hello Interview
        </a>
        . The rest are written from commonly reported OpenAI interview topics.
        Drafts, test progress, whiteboards and grades are saved to your account,
        so you can switch browsers and pick up where you left off.
      </footer>
    </div>
  );
}
