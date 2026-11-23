import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { linter, type Diagnostic } from '@codemirror/lint';
import { Prec, type Extension } from '@codemirror/state';
import * as Comlink from 'comlink';
import type { PyLangApi } from './pyLangWorker';

// Python editor services backed by jedi (completions) and pyflakes
// (diagnostics) in a Pyodide worker started on first use.

let api: Comlink.Remote<PyLangApi> | null = null;
let ready: Promise<Comlink.Remote<PyLangApi>> | null = null;

function service(): Promise<Comlink.Remote<PyLangApi>> {
  ready ??= (async () => {
    api ??= Comlink.wrap<PyLangApi>(
      new Worker(new URL('./pyLangWorker.ts', import.meta.url), {
        type: 'module',
      }),
    );
    await api.warm();
    return api;
  })().catch((err: unknown) => {
    ready = null;
    throw err;
  });
  return ready;
}

const TYPE_MAP: Record<string, string> = {
  module: 'namespace',
  class: 'class',
  instance: 'variable',
  function: 'function',
  param: 'variable',
  keyword: 'keyword',
  property: 'property',
  statement: 'variable',
  path: 'text',
};

async function complete(
  ctx: CompletionContext,
): Promise<CompletionResult | null> {
  const word = ctx.matchBefore(/\w*/);
  const afterDot = ctx.matchBefore(/\.\w*/) !== null;
  if (!ctx.explicit && !afterDot && (!word || word.from === word.to))
    return null;
  const s = await service();
  const line = ctx.state.doc.lineAt(ctx.pos);
  const items = await s.complete(
    ctx.state.doc.toString(),
    line.number,
    ctx.pos - line.from,
  );
  if (ctx.aborted) return null;
  const options: Completion[] = items.map((c, i) => ({
    label: c.label,
    type: TYPE_MAP[c.type] ?? 'text',
    ...(c.detail ? { detail: c.detail } : {}),
    boost: -i / items.length,
  }));
  return { from: word ? word.from : ctx.pos, options, validFor: /^\w*$/ };
}

const lint = linter(
  async (view) => {
    const s = await service();
    const doc = view.state.doc;
    const found = await s.lint(doc.toString());
    const pos = (line: number, col: number) => {
      const l = doc.line(Math.min(Math.max(line, 1), doc.lines));
      return Math.min(l.from + col, l.to);
    };
    return found.map((d): Diagnostic => {
      const from = pos(d.line, d.col);
      return {
        from,
        to: Math.max(pos(d.endLine, d.endCol), Math.min(from + 1, doc.length)),
        severity: d.severity,
        message: d.message,
      };
    });
  },
  { delay: 400 },
);

export async function pythonServices(): Promise<Extension> {
  await service();
  return [Prec.highest(autocompletion({ override: [complete] })), lint];
}
