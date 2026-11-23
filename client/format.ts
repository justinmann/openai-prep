import type { Language } from '../shared/questions';
import {
  formatErrorMessage,
  mapCursorByLine,
  prettierOptions,
  ruffOptions,
  type FormatSettings,
} from '../shared/format';

// Formatters load on first use: Prettier's standalone build for TypeScript,
// Ruff's WASM formatter for Python.

export type FormatResult =
  { ok: true; code: string; cursor: number } | { ok: false; error: string };

let ruff: Promise<typeof import('@wasm-fmt/ruff_fmt/vite')> | null = null;

export async function formatCode(
  lang: Language,
  code: string,
  cursor: number,
  s: FormatSettings,
): Promise<FormatResult> {
  try {
    if (lang === 'typescript') {
      const [prettier, ts, estree] = await Promise.all([
        import('prettier/standalone'),
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      const r = await prettier.formatWithCursor(code, {
        ...prettierOptions(s),
        cursorOffset: cursor,
        plugins: [ts, estree],
      });
      return { ok: true, code: r.formatted, cursor: r.cursorOffset };
    }
    ruff ??= import('@wasm-fmt/ruff_fmt/vite').then(async (m) => {
      await m.default();
      return m;
    });
    const m = await ruff;
    const out = m.format(code, 'solution.py', ruffOptions(s));
    return { ok: true, code: out, cursor: mapCursorByLine(code, out, cursor) };
  } catch (err) {
    if (lang === 'python') ruff = null;
    return { ok: false, error: formatErrorMessage(err) };
  }
}
