import React from 'react';
import { Button } from 'ugly-app/client';
import { findCompany } from '../../shared/companies';
import { codingQuestions, designQuestions } from '../../shared/questions';
import { useCompanyPref } from '../companyPref';
import { NotFound } from '../components/NotFound';
import { Sources } from '../components/QuestionBits';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { Link } from '../router';
import { QuestionGrid } from './QuestionsPage';

// One page per company: how its loop runs, what its design rounds weight, and
// the questions candidates report it asking. Server-rendered for search.

export default function CompanyPage({
  company: id,
}: {
  company: string;
}): React.ReactElement {
  const c = findCompany(id);
  const [pref, setPref] = useCompanyPref();
  if (!c) return <NotFound what={`company “${id}”`} />;
  const coding = codingQuestions.filter((q) => q.companies.includes(c.id));
  const design = designQuestions.filter((q) => q.companies.includes(c.id));
  const w = c.codingScore.weights;
  return (
    <div className="home safe-area">
      <SiteHeader />
      <header className="home-head">
        <div className="eyebrow">
          <Link to="questions" params={{}}>
            Questions
          </Link>{' '}
          / {c.name}
        </div>
        <h1>{c.name} coding &amp; system design interview questions</h1>
        <p className="lede">{c.tagline}</p>
        <div className="cta-row">
          {pref?.id === c.id ? (
            <span className="badge badge-pass" data-id="practicing-for">
              Scoring for {c.name}
            </span>
          ) : (
            <Button
              variant="primary"
              data-id="practice-for-company"
              onClick={() => {
                setPref(c.id);
              }}
            >
              Score my answers for {c.name}
            </Button>
          )}
        </div>
      </header>

      <section className="company-facts">
        <div className="fact">
          <h2>Coding rounds</h2>
          <p>{c.coding}</p>
          <p className="muted small">
            Readiness score here: tests {w.correctness}%, speed against a{' '}
            {c.codingScore.budgetMin}-minute budget {w.speed}%, few runs to
            green {w.firstTry}%.
            {!c.codingScore.runsCode &&
              ` ${c.name} interviews usually do not let you run code, so extra runs cost more.`}
          </p>
        </div>
        <div className="fact">
          <h2>System design rounds</h2>
          <p>{c.design}</p>
          <h3>What the grader weights for {c.name}</h3>
          <ul className="weights">
            {c.designEmphasis.map((e) => (
              <li key={e.area}>
                <div className="weight-head">
                  <span>{e.area}</span>
                  <span className="mono">{e.weight}%</span>
                </div>
                <div className="weight-bar" aria-hidden="true">
                  <span style={{ width: `${e.weight * 2.5}%` }} />
                </div>
                <div className="muted small">{e.detail}</div>
              </li>
            ))}
          </ul>
          <h3>Red flags</h3>
          <ul>
            {c.redFlags.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>

      <QuestionGrid coding={coding} design={design} />
      <section>
        <Sources urls={c.sources} />
      </section>
      <SiteFooter />
    </div>
  );
}
