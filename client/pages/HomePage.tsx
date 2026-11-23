import React from 'react';
import { companies } from '../../shared/companies';
import { codingQuestions, designQuestions } from '../../shared/questions';
import { GITHUB_URL, jsonLdFor } from '../../shared/seo';
import { JsonLd } from '../components/JsonLd';
import { SignInButton, useSignedIn } from '../components/SignIn';
import { SiteFooter, SiteHeader } from '../components/SiteChrome';
import { Link } from '../router';
import { CodingCard, DesignCard } from './QuestionsPage';

// Landing page. Server-rendered; everything here is public.

const FEATURED_CODING = ['spreadsheet', 'lru-cache-ttl', 'web-crawler'];
const FEATURED_DESIGN = [
  'design-chatgpt',
  'design-payment-ledger',
  'design-ride-dispatch',
];

export default function HomePage(): React.ReactElement {
  const signedIn = useSignedIn();
  const featuredCoding = codingQuestions.filter((q) =>
    FEATURED_CODING.includes(q.id),
  );
  const featuredDesign = designQuestions.filter((q) =>
    FEATURED_DESIGN.includes(q.id),
  );
  return (
    <div className="home landing safe-area">
      <JsonLd data={jsonLdFor('', {})} />
      <SiteHeader />

      <section className="hero">
        <div className="eyebrow">Free · open source · runs in your browser</div>
        <h1>
          Practice the coding and system design questions top tech companies ask
        </h1>
        <p className="lede">
          Real questions candidates report from OpenAI, Anthropic, Google, Meta,
          Amazon, Stripe and more. Solve multi-part coding problems in
          TypeScript or Python and run the tests right here. Draw system designs
          on a whiteboard and get AI feedback graded the way each company
          grades.
        </p>
        <div className="cta-row">
          <Link
            to="questions"
            params={{}}
            className="cta cta-primary"
            data-id="cta-browse"
          >
            Browse {codingQuestions.length + designQuestions.length} questions
          </Link>
          {!signedIn && (
            <SignInButton
              id="cta-sign-in"
              label="Sign in to start"
              variant="secondary"
            />
          )}
          <a
            href={GITHUB_URL}
            className="cta cta-ghost"
            target="_blank"
            rel="noreferrer"
            data-id="cta-github"
          >
            View on GitHub
          </a>
        </div>
        <dl className="stats">
          <div>
            <dt>Coding questions</dt>
            <dd>{codingQuestions.length}</dd>
          </div>
          <div>
            <dt>System design</dt>
            <dd>{designQuestions.length}</dd>
          </div>
          <div>
            <dt>Companies</dt>
            <dd>{companies.length}</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>TS · Py</dd>
          </div>
        </dl>
      </section>

      <section className="how">
        <h2>How it works</h2>
        <div className="how-grid">
          <div className="how-card">
            <h3>Code it like the real round</h3>
            <p>
              Progressive problems that add requirements part by part, the way
              practical interviews run. Autocomplete, type errors, a console and
              a test runner, all in your browser. A guide lists what each
              language and library offers, interview-safe.
            </p>
          </div>
          <div className="how-card">
            <h3>Design it on a whiteboard</h3>
            <p>
              Sketch the architecture, add notes on numbers, APIs and
              trade-offs, and get a hire or no-hire verdict with
              requirement-by-requirement feedback and the follow-ups an
              interviewer would ask.
            </p>
          </div>
          <div className="how-card">
            <h3>Scored for your target company</h3>
            <p>
              Pick a company and scores shift: Stripe weights correctness and
              idempotency, Netflix resilience, Amazon operational excellence,
              Google ambiguity and scale, Meta speed.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Interview questions by company</h2>
        </div>
        <div className="company-grid">
          {companies.map((c) => {
            const n =
              codingQuestions.filter((q) => q.companies.includes(c.id)).length +
              designQuestions.filter((q) => q.companies.includes(c.id)).length;
            return (
              <Link
                key={c.id}
                to="companies/:company"
                params={{ company: c.id }}
                className="company-card"
                data-id={`company-${c.id}`}
              >
                <h3>{c.name}</h3>
                <p>{c.tagline}</p>
                <span className="muted small">{n} questions</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Popular coding questions</h2>
          <Link to="questions" params={{}} data-id="see-all-coding">
            See all
          </Link>
        </div>
        <div className="grid">
          {featuredCoding.map((q) => (
            <CodingCard key={q.id} q={q} progress={null} />
          ))}
        </div>
      </section>
      <section>
        <div className="section-head">
          <h2>Popular system design questions</h2>
          <Link to="questions" params={{}} data-id="see-all-design">
            See all
          </Link>
        </div>
        <div className="grid">
          {featuredDesign.map((q) => (
            <DesignCard key={q.id} q={q} progress={null} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
