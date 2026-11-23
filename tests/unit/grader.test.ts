import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { buildGraderMessages, parseGrade } from '../../shared/grader';
import { designQuestions } from '../../shared/questions/design';

const q = designQuestions[0]!;

describe('grader', () => {
  it('puts every requirement, rubric item and the answer in the prompt', () => {
    const [system, user] = buildGraderMessages(q, 'MY ANSWER', 'L6');
    expect(system!.content).toContain('staff engineer');
    for (const f of [...q.functional, ...q.nonFunctional])
      expect(user!.content).toContain(f);
    for (const r of q.rubric) expect(user!.content).toContain(r.id);
    expect(user!.content).toContain('<answer>\nMY ANSWER\n</answer>');
  });

  it('sends the whiteboard outline and image alongside the notes', () => {
    const [system, user] = buildGraderMessages(q, 'MY NOTES', 'L5', {
      outline: '- "API" → "Queue"',
      imageDataUrl: 'data:image/png;base64,AAAA',
    });
    expect(system!.content).toContain('Excalidraw whiteboard');
    expect(Array.isArray(user!.content)).toBe(true);
    const parts = user!.content as Exclude<typeof user.content, string>;
    const text = parts[0]!.type === 'text' ? parts[0]!.text : '';
    expect(text).toContain('<diagram>\n- "API" → "Queue"\n</diagram>');
    expect(text).toContain('<answer>\nMY NOTES\n</answer>');
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,AAAA' },
    });
  });

  it('falls back to text-only grading when nothing was drawn', () => {
    const [system, user] = buildGraderMessages(q, 'MY ANSWER', 'L5', {
      outline: '',
    });
    expect(system!.content).toContain('wrote their answer as text');
    expect(user!.content).toContain('CANDIDATE ANSWER:');
  });

  it('parses a real model reply (rubric items used "note")', () => {
    const raw = readFileSync(
      new URL('./fixtures/grader-reply-webhooks.txt', import.meta.url),
      'utf8',
    );
    const g = parseGrade(raw);
    expect(g.verdict).toBe('no_hire');
    expect(g.rubric).toHaveLength(7);
    expect(g.rubric[0]!.note.length).toBeGreaterThan(10);
  });

  it('accepts "feedback" in rubric items and tolerates a code fence', () => {
    const body = {
      verdict: 'hire',
      score: 7,
      summary: 's',
      requirements: [{ requirement: 'r', status: 'met', note: 'n' }],
      rubric: [{ id: 'api', status: 'partial', feedback: 'f' }],
      strengths: [],
      improvements: ['i'],
      followUps: [],
    };
    const g = parseGrade('```json\n' + JSON.stringify(body) + '\n```');
    expect(g.rubric[0]).toEqual({ id: 'api', status: 'partial', note: 'f' });
  });

  it('rejects replies without JSON', () => {
    expect(() => parseGrade('Sorry, I cannot help')).toThrow(/did not return/);
  });
});

describe('requirement coverage', () => {
  it('numbers functional then non-functional and fills gaps', async () => {
    const { allRequirements, requirementCoverage } =
      await import('../../shared/grader');
    const reqs = allRequirements(q);
    expect(reqs).toHaveLength(q.functional.length + q.nonFunctional.length);
    expect(reqs[q.functional.length]!.kind).toBe('non-functional');
    const g = parseGrade(
      JSON.stringify({
        verdict: 'hire',
        score: 7,
        summary: 's',
        requirements: [{ id: 'r2', status: 'met', note: 'good' }],
        rubric: [],
        strengths: [],
        improvements: [],
        followUps: [],
      }),
    );
    const cov = requirementCoverage(q, g);
    expect(cov).toHaveLength(reqs.length);
    expect(cov[1]!.status).toBe('met');
    expect(cov[0]!.status).toBeNull();
  });
});
