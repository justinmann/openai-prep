/// <reference lib="webworker" />
import {
  createSystem,
  createVirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import { createWorker } from '@valtown/codemirror-ts/worker';
import * as Comlink from 'comlink';
import ts from 'typescript';
import { editorCompilerOptions } from '../../shared/runner/tsOptions';

// TypeScript language service for the editor: diagnostics, completions and
// hover types. The lib .d.ts files are bundled from node_modules so nothing
// is fetched from a third-party CDN.

const libs = import.meta.glob<string>(
  [
    '../../node_modules/typescript/lib/lib.es5.d.ts',
    '../../node_modules/typescript/lib/lib.es20*.d.ts',
    '../../node_modules/typescript/lib/lib.decorators*.d.ts',
    '../../node_modules/typescript/lib/lib.dom.d.ts',
    '../../node_modules/typescript/lib/lib.dom.iterable.d.ts',
    '../../node_modules/typescript/lib/lib.dom.asynciterable.d.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
);

export const SOLUTION_PATH = '/solution.ts';

Comlink.expose(
  createWorker(() => {
    const fsMap = new Map<string, string>();
    for (const [file, text] of Object.entries(libs))
      fsMap.set(`/${file.split('/').pop()!}`, text);
    // The VFS treats an empty file as missing.
    fsMap.set(SOLUTION_PATH, '\n');
    const system = createSystem(fsMap);
    return createVirtualTypeScriptEnvironment(
      system,
      [SOLUTION_PATH],
      ts,
      editorCompilerOptions(ts),
    );
  }),
);
