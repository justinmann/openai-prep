// Question bank types. Prompts are lightweight markdown (paragraphs, `code`,
// fenced blocks, bullet lists, **bold**, ### headings) rendered by
// client/components/Markdown.tsx.

/**
 * One test case. `code` is the body of an async JavaScript function that runs
 * in the same scope as the candidate's transpiled code, so it can reference
 * their functions and classes directly. Helpers in scope: assertEqual(actual,
 * expected, label?), assert(cond, message?), assertThrows(fn, label?),
 * sleep(ms), now().
 */
export interface CodingTest {
  name: string;
  code: string;
}

export interface CodingPart {
  title: string;
  prompt: string;
  tests: CodingTest[];
}

export interface CodingQuestion {
  kind: 'coding';
  id: string;
  title: string;
  difficulty: 'medium' | 'hard';
  tags: string[];
  summary: string;
  /** Where the question comes from, shown as a link. */
  sourceUrl?: string;
  prompt: string;
  starter: string;
  /** Interviews are progressive: each part adds requirements and tests. */
  parts: CodingPart[];
  /** A reference TypeScript solution that passes every part's tests. */
  solution: string;
}

export interface RubricItem {
  id: string;
  label: string;
  /** What a strong answer covers for this item. Sent to the grader only. */
  detail: string;
}

export interface DesignQuestion {
  kind: 'design';
  id: string;
  title: string;
  tags: string[];
  summary: string;
  prompt: string;
  functional: string[];
  nonFunctional: string[];
  /** Scale assumptions to anchor estimates. */
  scale: string[];
  rubric: RubricItem[];
  /** Deep-dive questions an interviewer is likely to push on. */
  followUps: string[];
}

export type Question = CodingQuestion | DesignQuestion;
