import { codingQuestions } from './coding';
import { designQuestions } from './design';

export { codingQuestions, designQuestions };
export type * from './types';

export const findCoding = (id: string) =>
  codingQuestions.find((q) => q.id === id);
export const findDesign = (id: string) =>
  designQuestions.find((q) => q.id === id);
