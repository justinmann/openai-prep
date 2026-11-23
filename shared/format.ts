// Code formatting settings and how they map onto each formatter: Prettier for
// TypeScript, Ruff's formatter (Black-compatible) for Python. Pure, so the
// mapping is unit-tested; the formatters themselves load lazily in the browser
// (client/format.ts).

export type FormatMode = 'manual' | 'auto';

export interface FormatSettings {
  /** manual: only the Format button / Shift+Alt+F. auto: also before every run. */
  mode: FormatMode;
  printWidth: 80 | 100 | 120;
  /** TypeScript indent. */
  tabWidth: 2 | 4;
  /** Python indent (PEP 8 uses 4). */
  pyIndent: 2 | 4;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: 'all' | 'es5' | 'none';
  bracketSpacing: boolean;
}

export const DEFAULT_FORMAT: FormatSettings = {
  mode: 'manual',
  printWidth: 80,
  tabWidth: 2,
  pyIndent: 4,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
};

/** Keeps only known keys with valid values (settings come from storage). */
export function parseFormatSettings(raw: unknown): FormatSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const pick = <K extends keyof FormatSettings>(
    k: K,
    ok: readonly FormatSettings[K][],
  ): FormatSettings[K] =>
    ok.includes(o[k] as FormatSettings[K])
      ? (o[k] as FormatSettings[K])
      : DEFAULT_FORMAT[k];
  return {
    mode: pick('mode', ['manual', 'auto']),
    printWidth: pick('printWidth', [80, 100, 120]),
    tabWidth: pick('tabWidth', [2, 4]),
    pyIndent: pick('pyIndent', [2, 4]),
    semi: pick('semi', [true, false]),
    singleQuote: pick('singleQuote', [true, false]),
    trailingComma: pick('trailingComma', ['all', 'es5', 'none']),
    bracketSpacing: pick('bracketSpacing', [true, false]),
  };
}

export function prettierOptions(s: FormatSettings) {
  return {
    parser: 'typescript',
    printWidth: s.printWidth,
    tabWidth: s.tabWidth,
    semi: s.semi,
    singleQuote: s.singleQuote,
    trailingComma: s.trailingComma,
    bracketSpacing: s.bracketSpacing,
  } as const;
}

export function ruffOptions(s: FormatSettings) {
  return {
    indent_style: 'space',
    indent_width: s.pyIndent,
    line_width: s.printWidth,
    quote_style: s.singleQuote ? 'single' : 'double',
    magic_trailing_comma: 'respect',
  } as const;
}

/**
 * Where the cursor goes after a formatter that cannot track it (Ruff): the
 * same line (clamped) and column (clamped to the line's length).
 */
export function mapCursorByLine(
  before: string,
  after: string,
  cursor: number,
): number {
  const head = before.slice(0, cursor);
  const line = head.split('\n').length - 1;
  const col = cursor - (head.lastIndexOf('\n') + 1);
  const lines = after.split('\n');
  // Past the end of the formatted text: put it at the very end.
  if (line > lines.length - 1) return after.length;
  const l = line;
  const offset = lines.slice(0, l).reduce((n, x) => n + x.length + 1, 0);
  return offset + Math.min(col, lines[l]!.length);
}

/** First line of a formatter error, for the status bar. */
export function formatErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.split('\n')[0]!.slice(0, 160);
}
