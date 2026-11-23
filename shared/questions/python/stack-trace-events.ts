import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `A sampling profiler records the call stack at regular moments. Convert those snapshots into start/end events a trace viewer can draw as nested spans.

\`\`\`python
# sample: {'ts': int, 'stack': list[str]}   stack is outermost first
# event:  {'kind': 'start' | 'end', 'ts': int, 'name': str}

def convert_samples(samples: list[dict]) -> list[dict]: ...
\`\`\`

- Samples arrive in strictly increasing \`ts\` order.
- Compare each sample with the previous one by their **longest common prefix**. Frames past the prefix in the old stack end at the new sample's \`ts\`, **innermost first**. Frames past the prefix in the new stack start at that \`ts\`, **outermost first**. Ends come before starts.
- After the last sample, end every open frame (innermost first) at the last sample's \`ts\`.
- In this part, a function name appears at most once per stack.

\`\`\`python
convert_samples([
    {'ts': 0, 'stack': ['main']},
    {'ts': 1, 'stack': ['main', 'parse']},
    {'ts': 2, 'stack': ['main']},
])
# start main@0, start parse@1, end parse@2, end main@2
\`\`\``,
  starter: String.raw`def convert_samples(samples: list[dict]) -> list[dict]:
    # TODO
    return []
`,
  parts: [
    {
      tests: [
        {
          name: 'single sample',
          code: String.raw`assert_equal(convert_samples([{'ts': 0, 'stack': ['main', 'f']}]), [
    {'kind': 'start', 'ts': 0, 'name': 'main'},
    {'kind': 'start', 'ts': 0, 'name': 'f'},
    {'kind': 'end', 'ts': 0, 'name': 'f'},
    {'kind': 'end', 'ts': 0, 'name': 'main'},
])`,
        },
        {
          name: 'push and pop',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a'),
    S(1, 'a', 'b'),
    S(2, 'a', 'b', 'c'),
    S(3, 'a'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@1 s:c@2 e:c@3 e:b@3 e:a@3')`,
        },
        {
          name: 'sibling calls',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b'),
    S(1, 'a', 'c'),
    S(2, 'a', 'c'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@0 e:b@1 s:c@1 e:c@2 e:a@2')`,
        },
        {
          name: 'new root replaces the old one',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b'),
    S(5, 'x'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@0 e:b@5 e:a@5 s:x@5 e:x@5')`,
        },
        {
          name: 'unchanged stacks emit nothing in between',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a'),
    S(1, 'a'),
    S(2, 'a'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 e:a@2')`,
        },
        {
          name: 'empty input',
          code: String.raw`assert_equal(convert_samples([]), [])`,
        },
      ],
    },
    {
      tests: [
        {
          name: 'mutual recursion a -> b -> a',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a'),
    S(1, 'a', 'b'),
    S(2, 'a', 'b', 'a'),
    S(3, 'a', 'b'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@1 s:a@2 e:a@3 e:b@3 e:a@3')`,
        },
        {
          name: 'direct recursion',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'f'),
    S(1, 'f', 'f'),
    S(2, 'f', 'f', 'f'),
    S(3, 'f'),
]
assert_equal(fmt(convert_samples(samples)), 's:f@0 s:f@1 s:f@2 e:f@3 e:f@3 e:f@3')`,
        },
        {
          name: 'identity change closes everything above it',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b', 'c'),
    S(1, 'a', 'x', 'c'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@0 s:c@0 e:c@1 e:b@1 s:x@1 s:c@1 e:c@1 e:x@1 e:a@1')`,
        },
        {
          name: 'same name at a shallower depth',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b'),
    S(1, 'b'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@0 e:b@1 e:a@1 s:b@1 e:b@1')`,
        },
        {
          name: 'idle samples close everything',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a'),
    S(1),
    S(2, 'a'),
]
assert_equal(fmt(convert_samples(samples)), 's:a@0 e:a@1 s:a@2 e:a@2')`,
        },
      ],
    },
    {
      prompt: `Sampling catches brief calls that just add clutter. Add a parameter:

\`\`\`python
def convert_samples(samples: list[dict], min_samples: int = 1) -> list[dict]: ...
\`\`\`

- A frame instance (one start/end pair from Part 2) **persists** for the number of consecutive samples it appears in. Emit its events only if that count is \`>= min_samples\`.
- Frames you keep have exactly the times Part 2 gives them; do not merge the two sides of a dropped blip into one span.
- A frame above a dropped frame lives within it, so it is dropped too.`,
      tests: [
        {
          name: 'default keeps every frame',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b'),
    S(1, 'a', 'c'),
    S(2, 'a'),
]
assert_equal(fmt(convert_samples(samples, 1)), fmt(convert_samples(samples)))
assert_equal(fmt(convert_samples(samples)), 's:a@0 s:b@0 e:b@1 s:c@1 e:c@2 e:a@2')`,
        },
        {
          name: 'drops a one-sample blip',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b'),
    S(1, 'a', 'b'),
    S(2, 'a', 'c'),
    S(3, 'a', 'b'),
    S(4, 'a', 'b'),
]
assert_equal(fmt(convert_samples(samples, 2)), 's:a@0 s:b@0 e:b@2 s:b@3 e:b@4 e:a@4')`,
        },
        {
          name: 'drops everything above a short frame',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a'),
    S(1, 'a', 'b', 'c'),
    S(2, 'a'),
    S(3, 'a'),
]
assert_equal(fmt(convert_samples(samples, 2)), 's:a@0 e:a@3')`,
        },
        {
          name: 'threshold counts consecutive samples',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b'),
    S(1, 'a', 'b'),
    S(2, 'a'),
]
assert_equal(fmt(convert_samples(samples, 2)), 's:a@0 s:b@0 e:b@2 e:a@2', 'b lasts exactly 2')
assert_equal(fmt(convert_samples(samples, 3)), 's:a@0 e:a@2', 'b is too short for 3')
assert_equal(fmt(convert_samples(samples, 4)), '', 'a lasts 3 samples')`,
        },
        {
          name: 'short outer frame',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a'),
    S(1, 'b'),
    S(2, 'b'),
]
assert_equal(fmt(convert_samples(samples, 2)), 's:b@1 e:b@2')`,
        },
        {
          name: 'reopened frames are new instances',
          code: String.raw`def S(ts, *stack): return {'ts': ts, 'stack': list(stack)}
def fmt(es): return ' '.join(e['kind'][0] + ':' + e['name'] + '@' + str(e['ts']) for e in es)
samples = [
    S(0, 'a', 'b', 'c'),
    S(1, 'a', 'x', 'c'),
    S(2, 'a', 'b', 'c'),
]
assert_equal(fmt(convert_samples(samples, 2)), 's:a@0 e:a@2')`,
        },
      ],
    },
  ],
  solution: String.raw`def convert_samples(samples: list[dict], min_samples: int = 1) -> list[dict]:
    # Each event remembers which frame instance it belongs to, so short
    # instances can be filtered out afterwards without changing any times.
    events: list[tuple[dict, int]] = []
    persisted: list[int] = []  # instance -> number of samples it spanned
    open_frames: list[tuple[str, int, int]] = []  # (name, instance, start index)

    def close_down_to(depth: int, idx: int, ts: int) -> None:
        while len(open_frames) > depth:
            name, inst, start = open_frames.pop()
            persisted[inst] = idx - start
            events.append(({'kind': 'end', 'ts': ts, 'name': name}, inst))

    for i, sample in enumerate(samples):
        ts, stack = sample['ts'], sample['stack']
        k = 0
        while k < len(open_frames) and k < len(stack) and open_frames[k][0] == stack[k]:
            k += 1
        close_down_to(k, i, ts)
        for name in stack[k:]:
            inst = len(persisted)
            persisted.append(0)
            open_frames.append((name, inst, i))
            events.append(({'kind': 'start', 'ts': ts, 'name': name}, inst))
    if samples:
        close_down_to(0, len(samples), samples[-1]['ts'])

    return [ev for ev, inst in events if persisted[inst] >= min_samples]
`,
};
