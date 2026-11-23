import { describe, expect, it } from 'vitest';
import {
  companies,
  codingReadiness,
  findCompany,
} from '../../shared/companies';
import { buildGraderMessages, weightedEmphasis } from '../../shared/grader';
import { codingQuestions, designQuestions } from '../../shared/questions';

describe('companies', () => {
  it('weights sum to 100', () => {
    for (const c of companies) {
      expect(
        c.designEmphasis.reduce((n, e) => n + e.weight, 0),
        c.id,
      ).toBe(100);
      const w = c.codingScore.weights;
      expect(w.correctness + w.speed + w.firstTry, c.id).toBe(100);
    }
  });

  it('every company has questions and every tag is a known company', () => {
    for (const c of companies)
      expect(
        [...codingQuestions, ...designQuestions].some((q) =>
          q.companies.includes(c.id),
        ),
        c.id,
      ).toBe(true);
    for (const q of [...codingQuestions, ...designQuestions]) {
      expect(q.companies.length, q.id).toBeGreaterThan(0);
      for (const id of q.companies)
        expect(findCompany(id), `${q.id}: ${id}`).toBeDefined();
    }
  });

  it('readiness: full marks for a fast first-try solve, partial credit otherwise', () => {
    const meta = findCompany('meta')!;
    expect(
      codingReadiness(meta, { passed: 10, total: 10, minutes: 20, runs: 1 })
        .score,
    ).toBe(10);
    const slow = codingReadiness(meta, {
      passed: 10,
      total: 10,
      minutes: 70,
      runs: 6,
    });
    expect(slow.speed).toBe(0);
    expect(slow.score).toBeLessThan(6);
    // Speed and runs only count once everything passes.
    const half = codingReadiness(meta, {
      passed: 5,
      total: 10,
      minutes: 1,
      runs: 1,
    });
    expect(half.score).toBeLessThan(5);
  });

  it('extra runs cost more where the interview cannot run code', () => {
    const google = findCompany('google')!; // runsCode: false
    const stripe = findCompany('stripe')!; // runsCode: true
    const r = { passed: 8, total: 8, minutes: 30, runs: 4 };
    expect(codingReadiness(google, r).firstTry).toBeLessThan(
      codingReadiness(stripe, r).firstTry,
    );
  });
});

describe('company-weighted grading', () => {
  const q = designQuestions.find((x) => x.id === 'design-payment-ledger')!;

  it('names the company and its weighted areas in the grader prompt', () => {
    const stripe = findCompany('stripe')!;
    const [system] = buildGraderMessages(q, 'answer', 'L5', undefined, stripe);
    const s = system!.content as string;
    expect(s).toContain('interviewer at Stripe');
    for (const e of stripe.designEmphasis)
      expect(s).toContain(`${e.area} (${e.weight}%)`);
    expect(s).toContain('"emphasis"');
  });

  it('without a company the prompt is the general bar and asks for no emphasis', () => {
    const [system] = buildGraderMessages(q, 'answer', 'L5');
    const s = system!.content as string;
    expect(s).toContain('top technology company');
    expect(s).not.toContain('"emphasis"');
  });

  it('matches emphasis scores to areas by name', () => {
    const stripe = findCompany('stripe')!;
    const rows = weightedEmphasis(stripe, {
      verdict: 'hire',
      score: 7,
      summary: '',
      requirements: [],
      rubric: [],
      strengths: [],
      improvements: [],
      followUps: [],
      emphasis: [{ area: 'api design', score: 8, note: 'good' }],
    })!;
    expect(rows.find((r) => r.area === 'API design')!.score).toBe(8);
    expect(rows.find((r) => r.area === 'Clarity')!.score).toBeNull();
  });
});
