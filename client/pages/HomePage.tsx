import React from 'react';
import { codingQuestions, designQuestions } from '../../shared/questions';
import { verdictLabels } from '../../shared/grader';
import { Link } from '../router';
import { codingProgress, gradeHistory } from '../storage';

function CodingBadge({
  id,
  total,
}: {
  id: string;
  total: number;
}): React.ReactElement | null {
  const p = codingProgress.get(id);
  if (!p) return null;
  const solved = p.passed === p.total && p.total === total;
  return (
    <span className={`badge ${solved ? 'badge-pass' : 'badge-partial'}`}>
      {solved ? 'Solved' : `${p.passed}/${p.total}`}
    </span>
  );
}

function DesignBadge({ id }: { id: string }): React.ReactElement | null {
  const last = gradeHistory.get(id)[0];
  if (!last) return null;
  const good =
    last.grade.verdict === 'hire' || last.grade.verdict === 'strong_hire';
  return (
    <span className={`badge ${good ? 'badge-pass' : 'badge-partial'}`}>
      {verdictLabels[last.grade.verdict]} · {last.grade.score}/10
    </span>
  );
}

export default function HomePage(): React.ReactElement {
  return (
    <div className="home safe-area">
      <header className="home-head">
        <div className="eyebrow">Interview practice</div>
        <h1>OpenAI coding &amp; system design</h1>
        <p className="lede">
          Coding questions run your TypeScript against the tests in your
          browser. Design questions are graded by AI against the requirements
          and an interviewer rubric.
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
                  <CodingBadge id={q.id} total={total} />
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
                <DesignBadge id={q.id} />
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
        Drafts and progress are saved in this browser.
      </footer>
    </div>
  );
}
