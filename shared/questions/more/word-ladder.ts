import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'word-ladder',
  title: 'Word Ladder',
  difficulty: 'medium',
  tags: ['bfs', 'graphs', 'strings'],
  summary:
    'Shortest one-letter-at-a-time transformation: its length, one path, then every shortest path.',
  companies: ['amazon', 'google', 'meta'],
  sources: [
    'https://interviewing.io/guides/hiring-process/amazon',
    'https://leetcode.com/problems/word-ladder/',
  ],
  prompt: `Turn \`begin\` into \`end\` by changing one letter at a time, where every word after \`begin\` must appear in \`words\`.

\`\`\`ts
function ladderLength(begin: string, end: string, words: string[]): number
\`\`\`

- Return the number of words in the shortest ladder, **counting both \`begin\` and \`end\`**, or \`0\` when no ladder exists.
- \`begin\` does not need to be in \`words\`; \`end\` does. \`begin\` and \`end\` differ.
- Each step changes exactly one letter in place (no inserts or deletes). Words of a different length can never be used.

Example: \`hit -> hot -> dot -> dog -> cog\` with \`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog']\` gives \`5\`.`,
  starter: `function ladderLength(begin: string, end: string, words: string[]): number {
  // TODO
  return 0;
}

function ladderPath(begin: string, end: string, words: string[]): string[] {
  // TODO
  return [];
}

function allShortestPaths(begin: string, end: string, words: string[]): string[][] {
  // TODO
  return [];
}
`,
  parts: [
    {
      title: 'Part 1: Shortest ladder length',
      prompt:
        'Use breadth-first search. Comparing every pair of words is `O(n^2)`; instead bucket words by wildcard patterns (`h*t`, `*ot`, ...) or try each of the 26 letters at each position.',
      tests: [
        {
          name: 'classic example',
          code: String.raw`const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog'];
assertEqual(ladderLength('hit', 'cog', words), 5);`,
        },
        {
          name: 'end missing from the list',
          code: String.raw`assertEqual(ladderLength('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']), 0);`,
        },
        {
          name: 'disconnected words',
          code: String.raw`assertEqual(ladderLength('aaa', 'zzz', ['aab', 'zzz', 'zzy']), 0);`,
        },
        {
          name: 'one step',
          code: String.raw`assertEqual(ladderLength('cat', 'cot', ['cot']), 2);
assertEqual(ladderLength('a', 'c', ['a', 'b', 'c']), 2, 'single letters');`,
        },
        {
          name: 'shortest beats a longer route',
          code: String.raw`const words = ['abd', 'aed', 'aez', 'xez', 'xbz', 'xbd'];
assertEqual(ladderLength('abc', 'xbz', words), 4);`,
        },
        {
          name: 'other lengths and duplicates are ignored',
          code: String.raw`const words = ['hot', 'hot', 'ho', 'hott', 'dot', 'dog', 'cog', 'cog'];
assertEqual(ladderLength('hit', 'cog', words), 5);
assertEqual(ladderLength('hit', 'hott', words), 0);`,
        },
      ],
    },
    {
      title: 'Part 2: Return a ladder',
      prompt: `\`\`\`ts
function ladderPath(begin: string, end: string, words: string[]): string[]
\`\`\`

Return one shortest ladder as a list of words from \`begin\` to \`end\`, or \`[]\` when none exists. When several shortest ladders exist, return the **lexicographically smallest** (compare word by word), so the answer is deterministic.`,
      tests: [
        {
          name: 'classic example picks the smaller branch',
          code: String.raw`const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog'];
assertEqual(ladderPath('hit', 'cog', words), ['hit', 'hot', 'dot', 'dog', 'cog']);`,
        },
        {
          name: 'no ladder',
          code: String.raw`assertEqual(ladderPath('hit', 'cog', ['hot', 'dot', 'dog']), []);
assertEqual(ladderPath('aaa', 'zzz', ['aab', 'zzz']), []);`,
        },
        {
          name: 'one step',
          code: String.raw`assertEqual(ladderPath('cat', 'cot', ['cot', 'cat']), ['cat', 'cot']);`,
        },
        {
          name: 'smallest first step can be a dead end',
          code: String.raw`// 'aab' sorts first but only leads to a longer ladder.
const words = ['aab', 'abb', 'bbb', 'bbc', 'zac', 'zbc'];
assertEqual(ladderPath('aac', 'zbc', words), ['aac', 'zac', 'zbc']);`,
        },
        {
          name: 'ties resolved word by word',
          code: String.raw`const words = ['ab', 'ba', 'bb', 'ca', 'cb'];
assertEqual(ladderPath('aa', 'cb', words), ['aa', 'ab', 'cb']);
assertEqual(ladderPath('aa', 'bb', words), ['aa', 'ab', 'bb']);`,
        },
        {
          name: 'path is a valid shortest ladder',
          code: String.raw`const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog', 'hog', 'cot'];
const path = ladderPath('hit', 'cog', words);
assertEqual(path.length, ladderLength('hit', 'cog', words));
assertEqual(path, ['hit', 'hot', 'cot', 'cog']);`,
        },
      ],
    },
    {
      title: 'Part 3: Every shortest ladder',
      prompt: `\`\`\`ts
function allShortestPaths(begin: string, end: string, words: string[]): string[][]
\`\`\`

Return **every** shortest ladder, sorted lexicographically, or \`[]\` when none exists.

- Enumerating all simple paths explodes. Run BFS layer by layer, record for each newly reached word **all** of its parents in the previous layer, stop after the layer that reaches \`end\`, then backtrack from \`end\`.
- A word discovered in an earlier layer must not be revisited later. One test uses a ~4.6k-word generated dictionary and must finish fast.`,
      tests: [
        {
          name: 'classic example has two ladders',
          code: String.raw`const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog'];
assertEqual(allShortestPaths('hit', 'cog', words), [
  ['hit', 'hot', 'dot', 'dog', 'cog'],
  ['hit', 'hot', 'lot', 'log', 'cog'],
]);`,
        },
        {
          name: 'no ladder',
          code: String.raw`assertEqual(allShortestPaths('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']), []);`,
        },
        {
          name: 'one step',
          code: String.raw`assertEqual(allShortestPaths('cat', 'cot', ['cot']), [['cat', 'cot']]);`,
        },
        {
          name: 'every route through a cube',
          code: String.raw`const words = ['aab', 'aba', 'abb', 'baa', 'bab', 'bba', 'bbb'];
assertEqual(allShortestPaths('aaa', 'bbb', words), [
  ['aaa', 'aab', 'abb', 'bbb'],
  ['aaa', 'aab', 'bab', 'bbb'],
  ['aaa', 'aba', 'abb', 'bbb'],
  ['aaa', 'aba', 'bba', 'bbb'],
  ['aaa', 'baa', 'bab', 'bbb'],
  ['aaa', 'baa', 'bba', 'bbb'],
]);`,
        },
        {
          name: 'longer routes are excluded',
          code: String.raw`const words = ['abd', 'aed', 'aez', 'xez', 'xbz', 'xbd', 'abz', 'xbc'];
assertEqual(allShortestPaths('abc', 'xbz', words), [
  ['abc', 'abz', 'xbz'],
  ['abc', 'xbc', 'xbz'],
]);`,
        },
        {
          name: 'agrees with parts 1 and 2',
          code: String.raw`const words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog', 'hog', 'cot', 'hig'];
const all = allShortestPaths('hit', 'cog', words);
assertEqual(all[0], ladderPath('hit', 'cog', words));
assert(all.every((p) => p.length === ladderLength('hit', 'cog', words)), 'lengths');
assertEqual(all, [['hit', 'hig', 'hog', 'cog'], ['hit', 'hot', 'cot', 'cog'], ['hit', 'hot', 'hog', 'cog']]);`,
        },
        {
          name: 'large generated dictionary',
          code: String.raw`let s = 2024;
const rand = () => { s = (s * 48271) % 2147483647; return s; };
const letters = 'abcdefghi';
const words = [];
for (let i = 0; i < 9 ** 4; i++) {
  let w = '', n = i;
  for (let j = 0; j < 4; j++) { w += letters[n % 9]; n = Math.floor(n / 9); }
  if (rand() % 10 < 7 || w === 'iiii') words.push(w);
}
assertEqual(words.length, 4579);
const t0 = now();
const a = allShortestPaths('aaaa', 'iiii', words);
const b = allShortestPaths('abcd', 'ihgf', words);
const ms = now() - t0;
assertEqual(a.length, 10);
assertEqual(a[0], ['aaaa', 'aaai', 'aiai', 'iiai', 'iiii']);
assertEqual(a[9], ['aaaa', 'iaaa', 'iiaa', 'iiia', 'iiii']);
assertEqual(b.length, 7);
assertEqual(b[0], ['abcd', 'abcf', 'abgf', 'ibgf', 'ihgf']);
assertEqual(new Set(a.map((p) => p.join())).size, 10, 'no duplicates');
assertEqual(ladderLength('aaaa', 'iiii', words), 5);
assert(ms < 1000, 'took ' + Math.round(ms) + ' ms');`,
        },
      ],
    },
  ],
  solution: String.raw`// Adjacency through wildcard buckets: 'h*t' -> ['hit', 'hot', ...].
function buildGraph(begin: string, words: string[]): Map<string, string[]> {
  const buckets = new Map<string, string[]>();
  const all = new Set(words.filter((w) => w.length === begin.length));
  all.add(begin);
  for (const w of all) {
    for (let i = 0; i < w.length; i++) {
      const key = w.slice(0, i) + '*' + w.slice(i + 1);
      let list = buckets.get(key);
      if (!list) buckets.set(key, (list = []));
      list.push(w);
    }
  }
  return buckets;
}

function neighbours(w: string, buckets: Map<string, string[]>): string[] {
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    for (const v of buckets.get(w.slice(0, i) + '*' + w.slice(i + 1)) ?? []) {
      if (v !== w) out.push(v);
    }
  }
  return out;
}

/** BFS distances from start to every reachable word. */
function distances(start: string, buckets: Map<string, string[]>): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  let layer = [start];
  while (layer.length > 0) {
    const next: string[] = [];
    for (const w of layer) {
      for (const v of neighbours(w, buckets)) {
        if (!dist.has(v)) { dist.set(v, dist.get(w)! + 1); next.push(v); }
      }
    }
    layer = next;
  }
  return dist;
}

function usable(begin: string, end: string, words: string[]): boolean {
  return begin.length === end.length && words.includes(end);
}

function ladderLength(begin: string, end: string, words: string[]): number {
  if (!usable(begin, end, words)) return 0;
  const buckets = buildGraph(begin, words);
  const seen = new Set([begin]);
  let layer = [begin];
  for (let len = 1; layer.length > 0; len++) {
    const next: string[] = [];
    for (const w of layer) {
      if (w === end) return len;
      for (const v of neighbours(w, buckets)) {
        if (!seen.has(v)) { seen.add(v); next.push(v); }
      }
    }
    layer = next;
  }
  return 0;
}

function ladderPath(begin: string, end: string, words: string[]): string[] {
  if (!usable(begin, end, words)) return [];
  const buckets = buildGraph(begin, words);
  // Distances to end let us walk greedily: always take the smallest
  // neighbour that is exactly one step closer.
  const toEnd = distances(end, buckets);
  if (!toEnd.has(begin)) return [];
  const path = [begin];
  let w = begin;
  while (w !== end) {
    const d = toEnd.get(w)!;
    let best: string | undefined;
    for (const v of neighbours(w, buckets)) {
      if (toEnd.get(v) === d - 1 && (best === undefined || v < best)) best = v;
    }
    w = best!;
    path.push(w);
  }
  return path;
}

function allShortestPaths(begin: string, end: string, words: string[]): string[][] {
  if (!usable(begin, end, words)) return [];
  const buckets = buildGraph(begin, words);
  const parents = new Map<string, string[]>();
  const seen = new Set([begin]);
  let layer = [begin];
  while (layer.length > 0 && !parents.has(end)) {
    const found = new Set<string>();
    for (const w of layer) {
      for (const v of neighbours(w, buckets)) {
        if (seen.has(v)) continue;
        found.add(v);
        let ps = parents.get(v);
        if (!ps) parents.set(v, (ps = []));
        ps.push(w);
      }
    }
    for (const v of found) seen.add(v);
    layer = [...found];
  }
  if (!parents.has(end)) return [];
  const out: string[][] = [];
  const stack: string[] = [end];
  const walk = (w: string) => {
    if (w === begin) { out.push([...stack].reverse()); return; }
    for (const p of parents.get(w) ?? []) { stack.push(p); walk(p); stack.pop(); }
  };
  walk(end);
  const cmp = (a: string[], b: string[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]! ? -1 : 1;
    return 0;
  };
  return out.sort(cmp);
}
`,
};
