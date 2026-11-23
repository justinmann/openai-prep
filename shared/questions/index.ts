import { codingQuestions as tsOnly } from './coding';
import { designQuestions } from './design';
import { pythonVersions } from './python';
import type { CodingQuestion, CodingTest, Language } from './types';

export const codingQuestions: CodingQuestion[] = tsOnly.map((q) => {
  const python = pythonVersions[q.id];
  return python ? { ...q, python } : q;
});
export { designQuestions };
export type * from './types';

export const findCoding = (id: string) =>
  codingQuestions.find((q) => q.id === id);
export const findDesign = (id: string) =>
  designQuestions.find((q) => q.id === id);

export interface QuestionView {
  prompt: string;
  starter: string;
  solution: string;
  parts: { title: string; prompt: string; tests: CodingTest[] }[];
}

/** A coding question as shown in one language. Python falls back to the TS prompt text. */
export function questionIn(q: CodingQuestion, lang: Language): QuestionView {
  const py = lang === 'python' ? q.python : undefined;
  if (!py) return q;
  return {
    prompt: py.prompt ?? q.prompt,
    starter: py.starter,
    solution: py.solution,
    parts: q.parts.map((p, i) => ({
      title: p.title,
      prompt: py.parts[i]?.prompt ?? p.prompt,
      tests: py.parts[i]?.tests ?? [],
    })),
  };
}
