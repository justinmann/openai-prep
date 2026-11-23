/// <reference lib="webworker" />
import type { CodingTest } from '../../shared/questions/types';
import { moduleUrl, runAll } from '../../shared/runner/harness';

// Runs the candidate's (already transpiled) code off the main thread, so an
// infinite loop freezes only this worker, which the page then terminates.

export interface WorkerIn {
  js: string;
  tests: CodingTest[];
}

export type WorkerOut =
  | { type: 'start'; index: number }
  | { type: 'loading'; specs: string[] }
  | { type: 'result'; result: import('../../shared/runner/harness').TestResult }
  | { type: 'log'; line: import('../../shared/runner/harness').LogLine }
  | { type: 'done' };

const post = (m: WorkerOut) => {
  self.postMessage(m);
};

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  // Imports are fetched from esm.sh as real ES modules.
  const loadModule = async (spec: string): Promise<Record<string, unknown>> =>
    (await import(/* @vite-ignore */ moduleUrl(spec))) as Record<
      string,
      unknown
    >;
  void runAll(
    e.data.js,
    e.data.tests,
    {
      onLoading: (specs) => {
        post({ type: 'loading', specs });
      },
      onStart: (index) => {
        post({ type: 'start', index });
      },
      onResult: (result) => {
        post({ type: 'result', result });
      },
      onLog: (line) => {
        post({ type: 'log', line });
      },
    },
    undefined,
    loadModule,
  ).then(() => {
    post({ type: 'done' });
  });
};
