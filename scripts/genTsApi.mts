// Regenerates shared/guide/tsApi.ts: every method and property of the basic
// built-in types, read from TypeScript's own lib .d.ts files (the same ones
// the editor's type checker uses), with signatures and one-line docs.
//   npx tsx scripts/genTsApi.mts
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';

const libDir = path.dirname(
  createRequire(import.meta.url).resolve('typescript'),
);
const host = ts.createCompilerHost({});
// One empty root file so the compiler loads the default libs.
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (name, lang, ...rest) =>
  name === '/root.ts'
    ? ts.createSourceFile(name, 'export {};', lang)
    : getSourceFile(name, lang, ...rest);
const fileExists = host.fileExists.bind(host);
host.fileExists = (name) => name === '/root.ts' || fileExists(name);
const program = ts.createProgram({
  rootNames: ['/root.ts'],
  options: {
    lib: ['lib.es2023.d.ts'],
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
  },
  host,
});
const checker = program.getTypeChecker();
void libDir;

interface Member {
  name: string;
  sig: string;
  doc: string;
}
interface Group {
  title: string;
  /** How you reach the members, e.g. "s." or "Math." */
  prefix: string;
  members: Member[];
}

function globalSymbol(name: string, meaning: ts.SymbolFlags): ts.Symbol {
  // Any lib file works as the location: globals are visible everywhere.
  const anyFile = program.getSourceFile('/root.ts')!;
  const sym = checker
    .getSymbolsInScope(anyFile, meaning)
    .find((s) => s.name === name);
  if (!sym) throw new Error(`no global ${name}`);
  return sym;
}

const firstSentence = (s: string) => {
  const one = s.replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(one);
  return (m ? m[1]! : one).slice(0, 200);
};

const isDeprecated = (sym: ts.Symbol) =>
  sym.getJsDocTags(checker).some((t) => t.name === 'deprecated');

function membersOf(type: ts.Type, opts: { skip?: RegExp } = {}): Member[] {
  const out: Member[] = [];
  for (const p of checker.getPropertiesOfType(type)) {
    const name = p.getName();
    if (name.startsWith('__@') || name.startsWith('[')) continue; // symbol keys
    if (opts.skip?.test(name)) continue;
    if (isDeprecated(p)) continue;
    const decl = p.valueDeclaration ?? p.declarations?.[0];
    if (!decl) continue;
    const t = checker.getTypeOfSymbolAtLocation(p, decl);
    const sigs = t.getCallSignatures();
    const doc = firstSentence(
      ts.displayPartsToString(p.getDocumentationComment(checker)),
    );
    if (
      sigs.length &&
      (p.flags & ts.SymbolFlags.Method || p.flags & ts.SymbolFlags.Function)
    ) {
      const s = checker.signatureToString(
        sigs[0]!,
        decl,
        ts.TypeFormatFlags.NoTruncation |
          ts.TypeFormatFlags.WriteArrowStyleSignature,
      );
      const more =
        sigs.length > 1
          ? `  (+${sigs.length - 1} overload${sigs.length > 2 ? 's' : ''})`
          : '';
      out.push({ name, sig: `${name}${s.replace(/ => /, ': ')}${more}`, doc });
    } else {
      const readonly =
        decl &&
        ts.getCombinedModifierFlags(decl as ts.Declaration) &
          ts.ModifierFlags.Readonly
          ? 'readonly '
          : '';
      out.push({
        name,
        sig: `${readonly}${name}: ${checker.typeToString(t, decl, ts.TypeFormatFlags.NoTruncation)}`,
        doc,
      });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

const iface = (name: string) =>
  checker.getDeclaredTypeOfSymbol(globalSymbol(name, ts.SymbolFlags.Interface));
const value = (name: string) => {
  const sym = globalSymbol(name, ts.SymbolFlags.Value);
  return checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration!);
};

function globalFunctions(names: string[]): Member[] {
  return names.map((n) => {
    const sym = globalSymbol(n, ts.SymbolFlags.Value);
    const decl = sym.valueDeclaration!;
    const sig = checker
      .getTypeOfSymbolAtLocation(sym, decl)
      .getCallSignatures()[0]!;
    return {
      name: n,
      sig: `${n}${checker.signatureToString(sig, decl, ts.TypeFormatFlags.NoTruncation)}`,
      doc: firstSentence(
        ts.displayPartsToString(sym.getDocumentationComment(checker)),
      ),
    };
  });
}

// Constructors carry `prototype` and the call/construct signatures; list only
// the static methods and constants people call.
const statics = { skip: /^(prototype|length|name)$/ };

const groups: Group[] = [
  {
    title: 'Global functions',
    prefix: '',
    members: globalFunctions([
      'parseInt',
      'parseFloat',
      'isNaN',
      'isFinite',
      'encodeURIComponent',
      'decodeURIComponent',
    ]),
  },
  { title: 'string', prefix: 's.', members: membersOf(iface('String')) },
  {
    title: 'String (static)',
    prefix: 'String.',
    members: membersOf(value('String'), statics),
  },
  { title: 'number', prefix: 'n.', members: membersOf(iface('Number')) },
  {
    title: 'Number (static)',
    prefix: 'Number.',
    members: membersOf(value('Number'), statics),
  },
  { title: 'Math', prefix: 'Math.', members: membersOf(value('Math')) },
  { title: 'Array<T>', prefix: 'a.', members: membersOf(iface('Array')) },
  {
    title: 'Array (static)',
    prefix: 'Array.',
    members: membersOf(value('Array'), statics),
  },
  { title: 'Map<K, V>', prefix: 'm.', members: membersOf(iface('Map')) },
  { title: 'Set<T>', prefix: 'set.', members: membersOf(iface('Set')) },
  {
    title: 'Object (static)',
    prefix: 'Object.',
    members: membersOf(value('Object'), statics),
  },
  { title: 'JSON', prefix: 'JSON.', members: membersOf(value('JSON')) },
  { title: 'Promise<T>', prefix: 'p.', members: membersOf(iface('Promise')) },
  {
    title: 'Promise (static)',
    prefix: 'Promise.',
    members: membersOf(value('Promise'), statics),
  },
  { title: 'RegExp', prefix: 're.', members: membersOf(iface('RegExp')) },
  { title: 'Date', prefix: 'd.', members: membersOf(iface('Date')) },
  {
    title: 'Date (static)',
    prefix: 'Date.',
    members: membersOf(value('Date'), statics),
  },
];

const body = JSON.stringify(groups, null, 2);
writeFileSync(
  'shared/guide/tsApi.ts',
  `// GENERATED by scripts/genTsApi.mts from TypeScript ${ts.version}'s lib files. Do not edit.
import type { ApiGroup } from './types';

export const tsApi: ApiGroup[] = ${body};
`,
);
console.log(groups.map((g) => `${g.title}: ${g.members.length}`).join('\n'));
