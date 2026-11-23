import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'stack-trace-events',
  title: 'Stack Samples to Trace Events',
  difficulty: 'medium',
  tags: ['profiling', 'stacks', 'diffing'],
  summary:
    "Turn a sampling profiler's stack snapshots into start/end trace events, with recursion and noise filtering.",
  companies: ['anthropic'],
  sources: [
    'https://www.fastprep.io/problems/anthropic-convert-stack-samples-to-trace-events',
    'https://prachub.com/coding-questions/convert-stack-samples-to-trace-events',
  ],
  prompt: `A sampling profiler records the call stack at regular moments. Convert those snapshots into start/end events a trace viewer can draw as nested spans.

\`\`\`ts
type Sample = { ts: number; stack: string[] }; // stack is outermost first
type TraceEvent = { kind: 'start' | 'end'; ts: number; name: string };

function convertSamples(samples: Sample[]): TraceEvent[]
\`\`\`

- Samples arrive in strictly increasing \`ts\` order.
- Compare each sample with the previous one by their **longest common prefix**. Frames past the prefix in the old stack end at the new sample's \`ts\`, **innermost first**. Frames past the prefix in the new stack start at that \`ts\`, **outermost first**. Ends come before starts.
- After the last sample, end every open frame (innermost first) at the last sample's \`ts\`.
- In this part, a function name appears at most once per stack.

\`\`\`ts
convertSamples([
  { ts: 0, stack: ['main'] },
  { ts: 1, stack: ['main', 'parse'] },
  { ts: 2, stack: ['main'] },
]);
// start main@0, start parse@1, end parse@2, end main@2
\`\`\``,
  starter: `type Sample = { ts: number; stack: string[] };
type TraceEvent = { kind: 'start' | 'end'; ts: number; name: string };

function convertSamples(samples: Sample[]): TraceEvent[] {
  // TODO
  return [];
}
`,
  parts: [
    {
      title: 'Part 1: Diff consecutive stacks',
      prompt:
        'Emit the events described above. Tests print events compactly as `s:name@ts` / `e:name@ts`.',
      tests: [
        {
          name: 'single sample',
          code: String.raw`assertEqual(convertSamples([{ ts: 0, stack: ['main', 'f'] }]), [
  { kind: 'start', ts: 0, name: 'main' },
  { kind: 'start', ts: 0, name: 'f' },
  { kind: 'end', ts: 0, name: 'f' },
  { kind: 'end', ts: 0, name: 'main' },
]);`,
        },
        {
          name: 'push and pop',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a'),
  S(1, 'a', 'b'),
  S(2, 'a', 'b', 'c'),
  S(3, 'a'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@1 s:c@2 e:c@3 e:b@3 e:a@3');`,
        },
        {
          name: 'sibling calls',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b'),
  S(1, 'a', 'c'),
  S(2, 'a', 'c'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@0 e:b@1 s:c@1 e:c@2 e:a@2');`,
        },
        {
          name: 'new root replaces the old one',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b'),
  S(5, 'x'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@0 e:b@5 e:a@5 s:x@5 e:x@5');`,
        },
        {
          name: 'unchanged stacks emit nothing in between',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a'),
  S(1, 'a'),
  S(2, 'a'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 e:a@2');`,
        },
        {
          name: 'empty input',
          code: String.raw`assertEqual(convertSamples([]), []);`,
        },
      ],
    },
    {
      title: 'Part 2: Recursion and identity',
      prompt: `Drop the unique-name assumption. A frame is identified by its **position** in the stack, not its name:

- The same name at two depths is two separate frames (\`a -> b -> a\`, or \`f -> f -> f\`).
- If the frame at some depth changes, it and everything above it end, even if a deeper frame has the same name as before; the new frames start fresh.
- A sample may have an empty stack (the program was idle): everything ends there.`,
      tests: [
        {
          name: 'mutual recursion a -> b -> a',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a'),
  S(1, 'a', 'b'),
  S(2, 'a', 'b', 'a'),
  S(3, 'a', 'b'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@1 s:a@2 e:a@3 e:b@3 e:a@3');`,
        },
        {
          name: 'direct recursion',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'f'),
  S(1, 'f', 'f'),
  S(2, 'f', 'f', 'f'),
  S(3, 'f'),
];
assertEqual(fmt(convertSamples(samples)), 's:f@0 s:f@1 s:f@2 e:f@3 e:f@3 e:f@3');`,
        },
        {
          name: 'identity change closes everything above it',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b', 'c'),
  S(1, 'a', 'x', 'c'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@0 s:c@0 e:c@1 e:b@1 s:x@1 s:c@1 e:c@1 e:x@1 e:a@1');`,
        },
        {
          name: 'same name at a shallower depth',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b'),
  S(1, 'b'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@0 e:b@1 e:a@1 s:b@1 e:b@1');`,
        },
        {
          name: 'idle samples close everything',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a'),
  S(1),
  S(2, 'a'),
];
assertEqual(fmt(convertSamples(samples)), 's:a@0 e:a@1 s:a@2 e:a@2');`,
        },
      ],
    },
    {
      title: 'Part 3: Denoise short frames',
      prompt: `Sampling catches brief calls that just add clutter. Add a parameter:

\`\`\`ts
function convertSamples(samples: Sample[], minSamples = 1): TraceEvent[]
\`\`\`

- A frame instance (one start/end pair from Part 2) **persists** for the number of consecutive samples it appears in. Emit its events only if that count is \`>= minSamples\`.
- Frames you keep have exactly the times Part 2 gives them; do not merge the two sides of a dropped blip into one span.
- A frame above a dropped frame lives within it, so it is dropped too.`,
      tests: [
        {
          name: 'default keeps every frame',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b'),
  S(1, 'a', 'c'),
  S(2, 'a'),
];
assertEqual(fmt(convertSamples(samples, 1)), fmt(convertSamples(samples)));
assertEqual(fmt(convertSamples(samples)), 's:a@0 s:b@0 e:b@1 s:c@1 e:c@2 e:a@2');`,
        },
        {
          name: 'drops a one-sample blip',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b'),
  S(1, 'a', 'b'),
  S(2, 'a', 'c'),
  S(3, 'a', 'b'),
  S(4, 'a', 'b'),
];
assertEqual(fmt(convertSamples(samples, 2)), 's:a@0 s:b@0 e:b@2 s:b@3 e:b@4 e:a@4');`,
        },
        {
          name: 'drops everything above a short frame',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a'),
  S(1, 'a', 'b', 'c'),
  S(2, 'a'),
  S(3, 'a'),
];
assertEqual(fmt(convertSamples(samples, 2)), 's:a@0 e:a@3');`,
        },
        {
          name: 'threshold counts consecutive samples',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b'),
  S(1, 'a', 'b'),
  S(2, 'a'),
];
assertEqual(fmt(convertSamples(samples, 2)), 's:a@0 s:b@0 e:b@2 e:a@2', 'b lasts exactly 2');
assertEqual(fmt(convertSamples(samples, 3)), 's:a@0 e:a@2', 'b is too short for 3');
assertEqual(fmt(convertSamples(samples, 4)), '', 'a lasts 3 samples');`,
        },
        {
          name: 'short outer frame',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a'),
  S(1, 'b'),
  S(2, 'b'),
];
assertEqual(fmt(convertSamples(samples, 2)), 's:b@1 e:b@2');`,
        },
        {
          name: 'reopened frames are new instances',
          code: String.raw`const S = (ts, ...stack) => ({ ts, stack });
const fmt = (es) => es.map((e) => e.kind[0] + ':' + e.name + '@' + e.ts).join(' ');
const samples = [
  S(0, 'a', 'b', 'c'),
  S(1, 'a', 'x', 'c'),
  S(2, 'a', 'b', 'c'),
];
assertEqual(fmt(convertSamples(samples, 2)), 's:a@0 e:a@2');`,
        },
      ],
    },
  ],
  solution: String.raw`type Sample = { ts: number; stack: string[] };
type TraceEvent = { kind: 'start' | 'end'; ts: number; name: string };

function convertSamples(samples: Sample[], minSamples = 1): TraceEvent[] {
  // Each event remembers which frame instance it belongs to, so short
  // instances can be filtered out afterwards without changing any times.
  const events: { ev: TraceEvent; inst: number }[] = [];
  const persisted: number[] = []; // instance -> number of samples it spanned
  const open: { name: string; inst: number; startIdx: number }[] = [];

  const closeDownTo = (depth: number, idx: number, ts: number): void => {
    while (open.length > depth) {
      const f = open.pop()!;
      persisted[f.inst] = idx - f.startIdx;
      events.push({ ev: { kind: 'end', ts, name: f.name }, inst: f.inst });
    }
  };

  samples.forEach(({ ts, stack }, i) => {
    let k = 0;
    while (k < open.length && k < stack.length && open[k]!.name === stack[k]) k++;
    closeDownTo(k, i, ts);
    for (let d = k; d < stack.length; d++) {
      const inst = persisted.length;
      persisted.push(0);
      open.push({ name: stack[d]!, inst, startIdx: i });
      events.push({ ev: { kind: 'start', ts, name: stack[d]! }, inst });
    }
  });
  if (samples.length > 0) closeDownTo(0, samples.length, samples[samples.length - 1]!.ts);

  return events.filter((e) => persisted[e.inst]! >= minSamples).map((e) => e.ev);
}
`,
};
