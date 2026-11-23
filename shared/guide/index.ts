import { pythonGuide } from './python';
import type { LanguageGuide } from './types';
import { typescriptGuide } from './typescript';
export const guides: Record<'typescript' | 'python', LanguageGuide> = {
  typescript: typescriptGuide,
  python: pythonGuide,
};
export type * from './types';
