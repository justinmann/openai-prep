import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { codingQuestions } from '../../shared/questions';
import {
  editorCompilerOptions,
  IGNORED_DIAGNOSTICS,
} from '../../shared/runner/tsOptions';

// The editor type-checks as you type. Starters and reference solutions must
// open without red underlines under the same options.

function diagnostics(code: string): string[] {
  const file = '/solution.ts';
  const options = editorCompilerOptions(ts);
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, lang, ...rest) =>
    name === file
      ? ts.createSourceFile(file, code, lang)
      : getSourceFile(name, lang, ...rest);
  const program = ts.createProgram([file], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => !IGNORED_DIAGNOSTICS.includes(d.code))
    .map((d) => {
      const line = d.file?.getLineAndCharacterOfPosition(d.start ?? 0).line;
      return `line ${(line ?? 0) + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
    });
}

describe('editor type checking', () => {
  for (const q of codingQuestions) {
    it(`${q.id}: starter has no type errors`, () => {
      expect(diagnostics(q.starter)).toEqual([]);
    });
    it(`${q.id}: solution has no type errors`, () => {
      expect(diagnostics(q.solution)).toEqual([]);
    });
  }

  it('catches a real error', () => {
    expect(diagnostics('const n: string = 5;')[0]).toMatch(/not assignable/);
  });
});
