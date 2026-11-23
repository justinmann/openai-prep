import { format as ruffFormat } from '@wasm-fmt/ruff_fmt';
import * as prettier from 'prettier/standalone';
import * as estree from 'prettier/plugins/estree';
import * as tsPlugin from 'prettier/plugins/typescript';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FORMAT,
  mapCursorByLine,
  parseFormatSettings,
  prettierOptions,
  ruffOptions,
} from '../../shared/format';
import { codingQuestions } from '../../shared/questions';

const ts = (code: string, patch = {}) =>
  prettier.format(code, {
    ...prettierOptions({ ...DEFAULT_FORMAT, ...patch }),
    plugins: [tsPlugin, estree],
  });

describe('format settings', () => {
  it('falls back to defaults for missing or bad stored values', () => {
    expect(parseFormatSettings(null)).toEqual(DEFAULT_FORMAT);
    expect(
      parseFormatSettings({ mode: 'auto', printWidth: 7, semi: 'yes' }),
    ).toEqual({
      ...DEFAULT_FORMAT,
      mode: 'auto',
    });
  });

  it('maps the cursor to the same line and column, clamped', () => {
    expect(mapCursorByLine('ab\ncdef', 'ab\ncd', 7)).toBe(5);
    expect(mapCursorByLine('a\nb\nc', 'a', 4)).toBe(1);
  });
});

describe('prettier (TypeScript)', () => {
  it('applies semicolons, quotes, trailing commas and indent', async () => {
    const src = 'const a = {x:1,y:"s"}\nfunction f(a:number){return [a,a]}\n';
    expect(await ts(src)).toBe(
      "const a = { x: 1, y: 's' };\nfunction f(a: number) {\n  return [a, a];\n}\n",
    );
    expect(
      await ts(src, {
        semi: false,
        singleQuote: false,
        tabWidth: 4,
        bracketSpacing: false,
      }),
    ).toBe(
      'const a = {x: 1, y: "s"}\nfunction f(a: number) {\n    return [a, a]\n}\n',
    );
  });

  it('respects line width and trailing commas', async () => {
    const src =
      "f('aaaaaaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbbbbbbbbbb', 'cccccccccccccccccccccccccc');\n";
    expect(await ts(src, { printWidth: 120 })).toBe(src);
    expect(await ts(src, { printWidth: 80 })).toContain(
      "'cccccccccccccccccccccccccc',\n);",
    );
    expect(await ts(src, { printWidth: 80, trailingComma: 'none' })).toContain(
      "'cccccccccccccccccccccccccc'\n);",
    );
  });

  it('reports syntax errors instead of mangling code', async () => {
    await expect(ts('function (')).rejects.toThrow();
  });

  it('every TypeScript starter and solution formats', async () => {
    for (const q of codingQuestions)
      for (const code of [q.starter, q.solution]) await ts(code);
  });
});

describe('ruff (Python)', () => {
  const py = (code: string, patch = {}) =>
    ruffFormat(
      code,
      'solution.py',
      ruffOptions({ ...DEFAULT_FORMAT, ...patch }),
    );

  it('formats with the chosen indent, quotes and width', () => {
    const src = 'def f( a,b ):\n  return {"x":a,  "y":b}\n';
    expect(py(src)).toBe("def f(a, b):\n    return {'x': a, 'y': b}\n");
    expect(py(src, { singleQuote: false, pyIndent: 2 })).toBe(
      'def f(a, b):\n  return {"x": a, "y": b}\n',
    );
  });

  it('throws on syntax errors', () => {
    expect(() => py('def f(:\n')).toThrow();
  });

  it('every Python starter and solution formats', () => {
    for (const q of codingQuestions)
      if (q.python)
        for (const code of [q.python.starter, q.python.solution]) py(code);
  });
});
