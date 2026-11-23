import type ts from 'typescript';

/**
 * Compiler options for the editor's type checking, shared with the unit test
 * that keeps starters and solutions free of red underlines. Takes the
 * compiler module so this file does not pull TypeScript into the app bundle.
 */
export function editorCompilerOptions(t: typeof ts): ts.CompilerOptions {
  return {
    target: t.ScriptTarget.ES2022,
    module: t.ModuleKind.ESNext,
    // Treat the file as a module: top-level await is legal ("Run code") and
    // names like `name` or `status` do not clash with DOM globals.
    moduleDetection: t.ModuleDetectionKind.Force,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
  };
}

/** Imports resolve from esm.sh at run time, so their types are unknown here. */
export const IGNORED_DIAGNOSTICS = [
  2307, // Cannot find module 'x'
  7016, // Could not find a declaration file for module 'x'
];
