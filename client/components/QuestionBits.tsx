import React from 'react';
import { findCompany, type CompanyId } from '../../shared/companies';
import type { DesignQuestion, QuestionView } from '../../shared/questions';
import type { CodingQuestion } from '../../shared/questions/types';
import { Link } from '../router';
import { Markdown } from './Markdown';

// Server-renderable pieces of a question page, shared by the signed-out
// preview and the signed-in workspace so both show the same problem.

export function CompanyChips({
  ids,
}: {
  ids: readonly CompanyId[];
}): React.ReactElement | null {
  if (!ids.length) return null;
  return (
    <div className="company-chips" aria-label="Reported at">
      {ids.map((id) => {
        const c = findCompany(id);
        return c ? (
          <Link
            key={id}
            to="companies/:company"
            params={{ company: id }}
            className="company-chip"
            data-id={`company-chip-${id}`}
          >
            {c.name}
          </Link>
        ) : null;
      })}
    </div>
  );
}

export function Sources({
  urls,
}: {
  urls: readonly string[];
}): React.ReactElement | null {
  if (!urls.length) return null;
  return (
    <p className="muted small sources">
      Reported in:{' '}
      {urls.map((u, i) => {
        let host = u;
        try {
          host = new URL(u).hostname.replace(/^www\./, '');
        } catch {
          // keep the raw string
        }
        return (
          <React.Fragment key={u}>
            {i > 0 && ', '}
            <a
              href={u}
              target="_blank"
              rel="noreferrer nofollow"
              data-id={`source-${i}`}
            >
              {host}
            </a>
          </React.Fragment>
        );
      })}
      . Wording here is our own.
    </p>
  );
}

/** The coding problem: prompt, parts (with optional pass badges), sources. */
export function CodingProblem({
  q,
  view,
  badge,
}: {
  q: CodingQuestion;
  view: QuestionView;
  badge?: (partIndex: number) => React.ReactNode;
}): React.ReactElement {
  return (
    <div className="prompt">
      <div className="meta-row">
        <span className={`diff diff-${q.difficulty}`}>{q.difficulty}</span>
        {q.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
      <CompanyChips ids={q.companies} />
      <Markdown text={view.prompt} />
      {view.parts.map((p, pi) => (
        <div key={p.title} className="part">
          <div className="part-head">
            <h2 className="part-title">{p.title}</h2>
            {badge?.(pi)}
          </div>
          <Markdown text={p.prompt} />
        </div>
      ))}
      <Sources urls={q.sources} />
    </div>
  );
}

/** The design brief: prompt, requirements, scale, rubric headings, sources. */
export function DesignBrief({ q }: { q: DesignQuestion }): React.ReactElement {
  return (
    <div className="prompt">
      <CompanyChips ids={q.companies} />
      <Markdown text={q.prompt} />
      <h2 className="brief-h">Functional requirements</h2>
      <ul>
        {q.functional.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <h2 className="brief-h">Non-functional requirements</h2>
      <ul>
        {q.nonFunctional.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <h2 className="brief-h">Scale</h2>
      <ul>
        {q.scale.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <h2 className="brief-h">What the grader looks for</h2>
      <ul className="rubric-list">
        {q.rubric.map((r) => (
          <li key={r.id}>{r.label}</li>
        ))}
      </ul>
      <Sources urls={q.sources} />
    </div>
  );
}
