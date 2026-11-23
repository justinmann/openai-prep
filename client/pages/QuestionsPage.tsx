import React, { useEffect, useState } from 'react';
import { Button, useAppOptional } from 'ugly-app/client';
import { companies, type CompanyId } from '../../shared/companies';
import { verdictLabels, type Grade } from '../../shared/grader';
import { codingQuestions, designQuestions } from '../../shared/questions';
import type { CodingQuestion, DesignQuestion } from '../../shared/questions';
import { importLocalOnce, type Socket } from '../progress';
import { useCompanyPref } from '../companyPref';
import { CompanyChips } from '../components/QuestionBits';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { Link } from '../router';

// Every question, filterable by company. Server-rendered with no filter and no
// progress; badges appear once a signed-in visitor's progress loads.

interface Run {
  passed: number;
  total: number;
}
interface Progress {
  coding: Map<string, Run[]>;
  grades: Map<string, { verdict: Grade['verdict']; score: number }>;
}

function useProgress(): Progress | null {
  const app = useAppOptional();
  const socket = app?.socket as unknown as Socket | undefined;
  const userId = app?.userId;
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    if (!socket || !userId) return;
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
        console.error('[questions] could not load progress', err);
      }
    })();
    return () => {
      run.live = false;
    };
  }, [socket, userId]);
  return progress;
}

function CodingBadge({
  runs,
  total,
}: {
  runs: Run[] | undefined;
  total: number;
}): React.ReactElement | null {
  const best = [...(runs ?? [])].sort((a, b) => b.passed - a.passed)[0];
  if (!best) return null;
  const solved = (runs ?? []).some(
    (r) => r.passed === r.total && r.total === total,
  );
  return (
    <span className={`badge ${solved ? 'badge-pass' : 'badge-partial'}`}>
      {solved ? 'Solved' : `${best.passed}/${best.total}`}
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

export function CodingCard({
  q,
  progress,
}: {
  q: CodingQuestion;
  progress: Progress | null;
}): React.ReactElement {
  const total = q.parts.reduce((n, p) => n + p.tests.length, 0);
  return (
    <div className="qcard">
      <div className="qcard-top">
        <span className={`diff diff-${q.difficulty}`}>{q.difficulty}</span>
        <CodingBadge runs={progress?.coding.get(q.id)} total={total} />
      </div>
      <h3>
        <Link
          to="coding/:id"
          params={{ id: q.id }}
          className="qcard-link"
          data-id={`q-${q.id}`}
        >
          {q.title}
        </Link>
      </h3>
      <p>{q.summary}</p>
      <CompanyChips ids={q.companies} />
      <div className="qcard-foot">
        {q.parts.length} parts · {total} tests · {q.tags.join(', ')}
      </div>
    </div>
  );
}

export function DesignCard({
  q,
  progress,
}: {
  q: DesignQuestion;
  progress: Progress | null;
}): React.ReactElement {
  return (
    <div className="qcard">
      <div className="qcard-top">
        <span className="diff diff-design">design</span>
        <DesignBadge last={progress?.grades.get(q.id)} />
      </div>
      <h3>
        <Link
          to="design/:id"
          params={{ id: q.id }}
          className="qcard-link"
          data-id={`q-${q.id}`}
        >
          {q.title}
        </Link>
      </h3>
      <p>{q.summary}</p>
      <CompanyChips ids={q.companies} />
      <div className="qcard-foot">{q.tags.join(', ')}</div>
    </div>
  );
}

export function QuestionGrid({
  coding,
  design,
}: {
  coding: CodingQuestion[];
  design: DesignQuestion[];
}): React.ReactElement {
  const progress = useProgress();
  return (
    <>
      <section>
        <div className="section-head">
          <h2>Coding</h2>
          <span className="muted">
            {coding.length} questions · multi-part, run the tests in your
            browser
          </span>
        </div>
        <div className="grid">
          {coding.map((q) => (
            <CodingCard key={q.id} q={q} progress={progress} />
          ))}
        </div>
      </section>
      <section>
        <div className="section-head">
          <h2>System design</h2>
          <span className="muted">
            {design.length} questions · draw it, write it up, get graded
          </span>
        </div>
        <div className="grid">
          {design.map((q) => (
            <DesignCard key={q.id} q={q} progress={progress} />
          ))}
        </div>
      </section>
    </>
  );
}

export default function QuestionsPage(): React.ReactElement {
  const [pref] = useCompanyPref();
  const [filter, setFilter] = useState<CompanyId | null>(null);
  // Start from the company you practice for, after hydration.
  useEffect(() => {
    if (pref) setFilter(pref.id);
  }, [pref]);
  const coding = codingQuestions.filter(
    (q) => !filter || q.companies.includes(filter),
  );
  const design = designQuestions.filter(
    (q) => !filter || q.companies.includes(filter),
  );
  return (
    <div className="home safe-area">
      <SiteHeader />
      <header className="home-head">
        <div className="eyebrow">Question bank</div>
        <h1>Coding &amp; system design interview questions</h1>
        <p className="lede">
          {codingQuestions.length} coding and {designQuestions.length} system
          design questions, tagged by the companies candidates report asking
          them.
        </p>
      </header>
      <div className="filter-row" role="group" aria-label="Filter by company">
        <Button
          size="sm"
          variant={filter === null ? 'secondary' : 'ghost'}
          data-id="filter-all"
          onClick={() => {
            setFilter(null);
          }}
        >
          All
        </Button>
        {companies.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={filter === c.id ? 'secondary' : 'ghost'}
            data-id={`filter-${c.id}`}
            onClick={() => {
              setFilter(c.id);
            }}
          >
            {c.name}
          </Button>
        ))}
      </div>
      <QuestionGrid coding={coding} design={design} />
      <SiteFooter />
    </div>
  );
}
