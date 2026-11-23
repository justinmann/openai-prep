import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Turn \`begin\` into \`end\` by changing one letter at a time, where every word after \`begin\` must appear in \`words\`.

\`\`\`python
def ladder_length(begin: str, end: str, words: list[str]) -> int: ...
\`\`\`

- Return the number of words in the shortest ladder, **counting both \`begin\` and \`end\`**, or \`0\` when no ladder exists.
- \`begin\` does not need to be in \`words\`; \`end\` does. \`begin\` and \`end\` differ.
- Each step changes exactly one letter in place (no inserts or deletes). Words of a different length can never be used.

Example: \`hit -> hot -> dot -> dog -> cog\` with \`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog']\` gives \`5\`.`,
  starter: String.raw`def ladder_length(begin: str, end: str, words: list[str]) -> int:
    # TODO
    return 0


def ladder_path(begin: str, end: str, words: list[str]) -> list[str]:
    # TODO
    return []


def all_shortest_paths(begin: str, end: str, words: list[str]) -> list[list[str]]:
    # TODO
    return []
`,
  parts: [
    {
      prompt:
        'Use breadth-first search. Comparing every pair of words is `O(n^2)`; instead bucket words by wildcard patterns (`h*t`, `*ot`, ...) or try each of the 26 letters at each position.',
      tests: [
        {
          name: 'classic example',
          code: String.raw`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog']
assert_equal(ladder_length('hit', 'cog', words), 5)`,
        },
        {
          name: 'end missing from the list',
          code: String.raw`assert_equal(ladder_length('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']), 0)`,
        },
        {
          name: 'disconnected words',
          code: String.raw`assert_equal(ladder_length('aaa', 'zzz', ['aab', 'zzz', 'zzy']), 0)`,
        },
        {
          name: 'one step',
          code: String.raw`assert_equal(ladder_length('cat', 'cot', ['cot']), 2)
assert_equal(ladder_length('a', 'c', ['a', 'b', 'c']), 2, 'single letters')`,
        },
        {
          name: 'shortest beats a longer route',
          code: String.raw`words = ['abd', 'aed', 'aez', 'xez', 'xbz', 'xbd']
assert_equal(ladder_length('abc', 'xbz', words), 4)`,
        },
        {
          name: 'other lengths and duplicates are ignored',
          code: String.raw`words = ['hot', 'hot', 'ho', 'hott', 'dot', 'dog', 'cog', 'cog']
assert_equal(ladder_length('hit', 'cog', words), 5)
assert_equal(ladder_length('hit', 'hott', words), 0)`,
        },
      ],
    },
    {
      prompt: `\`\`\`python
def ladder_path(begin: str, end: str, words: list[str]) -> list[str]: ...
\`\`\`

Return one shortest ladder as a list of words from \`begin\` to \`end\`, or \`[]\` when none exists. When several shortest ladders exist, return the **lexicographically smallest** (compare word by word), so the answer is deterministic.`,
      tests: [
        {
          name: 'classic example picks the smaller branch',
          code: String.raw`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog']
assert_equal(ladder_path('hit', 'cog', words), ['hit', 'hot', 'dot', 'dog', 'cog'])`,
        },
        {
          name: 'no ladder',
          code: String.raw`assert_equal(ladder_path('hit', 'cog', ['hot', 'dot', 'dog']), [])
assert_equal(ladder_path('aaa', 'zzz', ['aab', 'zzz']), [])`,
        },
        {
          name: 'one step',
          code: String.raw`assert_equal(ladder_path('cat', 'cot', ['cot', 'cat']), ['cat', 'cot'])`,
        },
        {
          name: 'smallest first step can be a dead end',
          code: String.raw`# 'aab' sorts first but only leads to a longer ladder.
words = ['aab', 'abb', 'bbb', 'bbc', 'zac', 'zbc']
assert_equal(ladder_path('aac', 'zbc', words), ['aac', 'zac', 'zbc'])`,
        },
        {
          name: 'ties resolved word by word',
          code: String.raw`words = ['ab', 'ba', 'bb', 'ca', 'cb']
assert_equal(ladder_path('aa', 'cb', words), ['aa', 'ab', 'cb'])
assert_equal(ladder_path('aa', 'bb', words), ['aa', 'ab', 'bb'])`,
        },
        {
          name: 'path is a valid shortest ladder',
          code: String.raw`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog', 'hog', 'cot']
path = ladder_path('hit', 'cog', words)
assert_equal(len(path), ladder_length('hit', 'cog', words))
assert_equal(path, ['hit', 'hot', 'cot', 'cog'])`,
        },
      ],
    },
    {
      prompt: `\`\`\`python
def all_shortest_paths(begin: str, end: str, words: list[str]) -> list[list[str]]: ...
\`\`\`

Return **every** shortest ladder, sorted lexicographically, or \`[]\` when none exists.

- Enumerating all simple paths explodes. Run BFS layer by layer, record for each newly reached word **all** of its parents in the previous layer, stop after the layer that reaches \`end\`, then backtrack from \`end\`.
- A word discovered in an earlier layer must not be revisited later. One test uses a ~4.6k-word generated dictionary and must finish fast.`,
      tests: [
        {
          name: 'classic example has two ladders',
          code: String.raw`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog']
assert_equal(all_shortest_paths('hit', 'cog', words), [
    ['hit', 'hot', 'dot', 'dog', 'cog'],
    ['hit', 'hot', 'lot', 'log', 'cog'],
])`,
        },
        {
          name: 'no ladder',
          code: String.raw`assert_equal(all_shortest_paths('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log']), [])`,
        },
        {
          name: 'one step',
          code: String.raw`assert_equal(all_shortest_paths('cat', 'cot', ['cot']), [['cat', 'cot']])`,
        },
        {
          name: 'every route through a cube',
          code: String.raw`words = ['aab', 'aba', 'abb', 'baa', 'bab', 'bba', 'bbb']
assert_equal(all_shortest_paths('aaa', 'bbb', words), [
    ['aaa', 'aab', 'abb', 'bbb'],
    ['aaa', 'aab', 'bab', 'bbb'],
    ['aaa', 'aba', 'abb', 'bbb'],
    ['aaa', 'aba', 'bba', 'bbb'],
    ['aaa', 'baa', 'bab', 'bbb'],
    ['aaa', 'baa', 'bba', 'bbb'],
])`,
        },
        {
          name: 'longer routes are excluded',
          code: String.raw`words = ['abd', 'aed', 'aez', 'xez', 'xbz', 'xbd', 'abz', 'xbc']
assert_equal(all_shortest_paths('abc', 'xbz', words), [
    ['abc', 'abz', 'xbz'],
    ['abc', 'xbc', 'xbz'],
])`,
        },
        {
          name: 'agrees with parts 1 and 2',
          code: String.raw`words = ['hot', 'dot', 'dog', 'lot', 'log', 'cog', 'hog', 'cot', 'hig']
all_paths = all_shortest_paths('hit', 'cog', words)
assert_equal(all_paths[0], ladder_path('hit', 'cog', words))
assert all(len(p) == ladder_length('hit', 'cog', words) for p in all_paths), 'lengths'
assert_equal(all_paths, [['hit', 'hig', 'hog', 'cog'], ['hit', 'hot', 'cot', 'cog'], ['hit', 'hot', 'hog', 'cog']])`,
        },
        {
          name: 'large generated dictionary',
          code: String.raw`import time
seed = [2024]
def rand():
    seed[0] = (seed[0] * 48271) % 2147483647
    return seed[0]
letters = 'abcdefghi'
words = []
for i in range(9 ** 4):
    w = ''
    n = i
    for _ in range(4):
        w += letters[n % 9]
        n //= 9
    if rand() % 10 < 7 or w == 'iiii':
        words.append(w)
assert_equal(len(words), 4579)
t0 = time.perf_counter()
a = all_shortest_paths('aaaa', 'iiii', words)
b = all_shortest_paths('abcd', 'ihgf', words)
ms = (time.perf_counter() - t0) * 1000
assert_equal(len(a), 10)
assert_equal(a[0], ['aaaa', 'aaai', 'aiai', 'iiai', 'iiii'])
assert_equal(a[9], ['aaaa', 'iaaa', 'iiaa', 'iiia', 'iiii'])
assert_equal(len(b), 7)
assert_equal(b[0], ['abcd', 'abcf', 'abgf', 'ibgf', 'ihgf'])
assert_equal(len(set(tuple(p) for p in a)), 10, 'no duplicates')
assert_equal(ladder_length('aaaa', 'iiii', words), 5)
assert ms < 2000, 'took ' + str(round(ms)) + ' ms'`,
        },
      ],
    },
  ],
  solution: String.raw`from collections import defaultdict


def _build_graph(begin: str, words: list[str]) -> dict[str, list[str]]:
    """Wildcard buckets: 'h*t' -> ['hit', 'hot', ...]."""
    buckets: dict[str, list[str]] = defaultdict(list)
    all_words = {w for w in words if len(w) == len(begin)}
    all_words.add(begin)
    for w in all_words:
        for i in range(len(w)):
            buckets[w[:i] + '*' + w[i + 1:]].append(w)
    return buckets


def _neighbours(w: str, buckets: dict[str, list[str]]) -> list[str]:
    out = []
    for i in range(len(w)):
        for v in buckets.get(w[:i] + '*' + w[i + 1:], ()):
            if v != w:
                out.append(v)
    return out


def _distances(start: str, buckets: dict[str, list[str]]) -> dict[str, int]:
    dist = {start: 0}
    layer = [start]
    while layer:
        nxt = []
        for w in layer:
            for v in _neighbours(w, buckets):
                if v not in dist:
                    dist[v] = dist[w] + 1
                    nxt.append(v)
        layer = nxt
    return dist


def _usable(begin: str, end: str, words: list[str]) -> bool:
    return len(begin) == len(end) and end in words


def ladder_length(begin: str, end: str, words: list[str]) -> int:
    if not _usable(begin, end, words):
        return 0
    buckets = _build_graph(begin, words)
    seen = {begin}
    layer = [begin]
    length = 1
    while layer:
        nxt = []
        for w in layer:
            if w == end:
                return length
            for v in _neighbours(w, buckets):
                if v not in seen:
                    seen.add(v)
                    nxt.append(v)
        layer = nxt
        length += 1
    return 0


def ladder_path(begin: str, end: str, words: list[str]) -> list[str]:
    if not _usable(begin, end, words):
        return []
    buckets = _build_graph(begin, words)
    # Distances to end let us walk greedily: always take the smallest
    # neighbour that is exactly one step closer.
    to_end = _distances(end, buckets)
    if begin not in to_end:
        return []
    path = [begin]
    w = begin
    while w != end:
        d = to_end[w]
        w = min(v for v in _neighbours(w, buckets) if to_end.get(v) == d - 1)
        path.append(w)
    return path


def all_shortest_paths(begin: str, end: str, words: list[str]) -> list[list[str]]:
    if not _usable(begin, end, words):
        return []
    buckets = _build_graph(begin, words)
    parents: dict[str, list[str]] = defaultdict(list)
    seen = {begin}
    layer = [begin]
    while layer and end not in parents:
        found: set[str] = set()
        for w in layer:
            for v in _neighbours(w, buckets):
                if v in seen:
                    continue
                found.add(v)
                parents[v].append(w)
        seen |= found
        layer = list(found)
    if end not in parents:
        return []
    out: list[list[str]] = []
    stack = [end]

    def walk(w: str) -> None:
        if w == begin:
            out.append(stack[::-1])
            return
        for p in parents[w]:
            stack.append(p)
            walk(p)
            stack.pop()

    walk(end)
    return sorted(out)
`,
};
