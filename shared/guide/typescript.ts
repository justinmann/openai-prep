import type { LanguageGuide } from './types';

// Interview-safe TypeScript: the features and idioms you can rely on in a
// timed coding interview, plus the traps that bite under pressure. Every
// snippet with `run` unset is executed by tests/unit/guide.test.ts, and the
// `// → value` comments are what the Console tab prints for it.

export const typescriptGuide: LanguageGuide = {
  language: 'typescript',
  tabs: [
    {
      id: 'basics',
      label: 'Basics',
      intro:
        'The everyday syntax. Types are annotations only: they help you think, but nothing here checks them at run time.',
      entries: [
        {
          title: 'let and const',
          code: String.raw`const xs = [1, 2];
xs.push(3); // allowed: const blocks reassignment, not mutation
let count = 0;
count += 1;
console.log(xs, count); // → [1, 2, 3] 1`,
          note: 'Default to const and use let only for values you reassign. Never use var: it is function scoped and leaks out of loops.',
        },
        {
          title: 'Type annotations and inference',
          code: String.raw`const n = 5; // inferred as number, no annotation needed
function area(w: number, h: number): number {
  return w * h;
}
const names: string[] = ['ada', 'linus'];
const scores: Record<string, number> = { ada: 3 };
const pair: [string, number] = ['ada', 3]; // tuple
console.log(area(n, 2), names.length, scores.ada, pair[1]); // → 10 2 3 3`,
          note: 'Annotate function parameters and return types, and let locals be inferred. Empty arrays and maps need a type: new Map<string, number>().',
        },
        {
          title: 'Union types and narrowing',
          code: String.raw`type Value = string | number | null;
function show(v: Value): string {
  if (v === null) return 'null';
  if (typeof v === 'number') return v.toFixed(1);
  return v.toUpperCase(); // TS knows v is a string here
}
console.log(show(2), show('hi'), show(null)); // → 2.0 HI null`,
          note: 'Check typeof, ===, Array.isArray or instanceof and TypeScript narrows the type inside that branch.',
        },
        {
          title: 'Optional chaining and ??',
          code: String.raw`const user: { profile?: { name?: string } } = {};
console.log(user.profile?.name); // → undefined
console.log(user.profile?.name ?? 'anon'); // → anon
const qty: number = 0;
console.log(qty || 10, qty ?? 10); // → 10 0
const counts = new Map<string, number>();
counts.set('a', (counts.get('a') ?? 0) + 1);
console.log(counts.get('a')); // → 1`,
          note: '?? falls back only on null and undefined; || also replaces 0, empty string and false, which is a bug when 0 is a real value.',
        },
        {
          title: 'Destructuring',
          code: String.raw`const [first, , third = 0, ...rest] = [1, 2, 3, 4, 5];
const { id, name = 'anon' } = { id: 7 } as { id: number; name?: string };
let a = 1;
let b = 2;
[a, b] = [b, a]; // swap
console.log(first, third, rest, id, name, a, b); // → 1 3 [4, 5] 7 anon 2 1`,
          note: 'Defaults apply only when the value is undefined. Destructure in parameters too: function f({ id, name }: User).',
        },
        {
          title: 'Spread',
          code: String.raw`const a = [1, 2];
const b = [...a, 3]; // copy and append
const base = { x: 1, y: 2 };
const moved = { ...base, y: 5 }; // later keys win
console.log(b, moved, Math.max(...b)); // → [1, 2, 3] {"x": 1, "y": 5} 3`,
          note: 'Spread copies one level only (nested arrays and objects are shared). Math.max(...hugeArray) can throw a RangeError past ~100k items; use reduce there.',
        },
        {
          title: 'Functions and arrow functions',
          code: String.raw`function add(a: number, b: number): number {
  return a + b;
}
const square = (x: number) => x * x;
const toPoint = (x: number, y: number) => ({ x, y }); // wrap an object literal in ()
console.log(add(1, 2), square(4), toPoint(1, 2)); // → 3 16 {"x": 1, "y": 2}`,
          note: 'Function declarations are hoisted, so helpers can sit below the code that calls them. Arrows do not bind their own this, which makes them the right choice for callbacks.',
        },
        {
          title: 'Default, optional and rest parameters',
          code: String.raw`function greet(name: string, greeting = 'hi', punct?: string): string {
  return greeting + ', ' + name + (punct ?? '');
}
const sum = (...nums: number[]) => nums.reduce((s, n) => s + n, 0);
function bucket(key: string, into: string[] = []): string[] {
  into.push(key);
  return into;
}
console.log(greet('ada'), greet('bo', 'yo', '!'), sum(1, 2, 3)); // → hi, ada yo, bo! 6
console.log(bucket('a'), bucket('b')); // → ["a"] ["b"]`,
          note: 'Defaults are evaluated on every call, so a default [] is a fresh array each time (unlike Python).',
        },
        {
          title: 'Template strings',
          code: String.raw`const name = 'ada';
const n = 3;
// Written with a template literal in real code (see the note).
const msg = 'Hi ' + name + ', you have ' + n + ' new messages';
console.log(msg); // → Hi ada, you have 3 new messages
console.log(String(n) + '/' + [1, 2]); // → 3/1,2`,
          note: 'In real code write `Hi ${name}, you have ${n} new messages`: backticks, any expression inside ${ }, and they may span lines. Arrays interpolate as "1,2", objects as "[object Object]", so JSON.stringify them.',
        },
        {
          title: 'Integer division and modulo',
          code: String.raw`console.log(7 / 2); // → 3.5
console.log(Math.floor(7 / 2), Math.trunc(7 / 2)); // → 3 3
console.log(Math.floor(-7 / 2), Math.trunc(-7 / 2)); // → -4 -3
console.log(-7 % 3, ((-7 % 3) + 3) % 3); // → -1 2
console.log((7 / 2) | 0, (2 ** 32 + 5) | 0); // → 3 5`,
          note: 'There is no integer type: / always gives a float. % keeps the sign of the left side, and | 0 truncates to 32 bits, so it silently corrupts numbers past 2^31.',
        },
        {
          title: 'Safe integers and BigInt',
          code: String.raw`console.log(Number.MAX_SAFE_INTEGER); // → 9007199254740991
console.log(2 ** 53 === 2 ** 53 + 1); // → true
const big = 2n ** 64n;
console.log(big, typeof big); // → 18446744073709551616n bigint
console.log(BigInt(10) * 3n, 7n / 2n, Number(5n) + 1); // → 30n 3n 6`,
          note: 'Numbers are exact integers only up to 2^53 - 1. BigInt is exact at any size, but you cannot mix it with number (1n + 1 throws) and Math functions do not accept it.',
        },
      ],
    },
    {
      id: 'loops',
      label: 'Loops',
      intro:
        'for...of is the default loop. Reach for an index loop when you need the index or want to step, skip or walk backwards.',
      entries: [
        {
          title: 'Classic for loop',
          code: String.raw`const xs = [10, 20, 30];
const out: string[] = [];
for (let i = 0; i < xs.length; i++) out.push(i + ':' + xs[i]);
console.log(out.join(' ')); // → 0:10 1:20 2:30
const back: number[] = [];
for (let i = xs.length - 1; i >= 0; i -= 2) back.push(xs[i]!);
console.log(back); // → [30, 10]`,
          note: 'Use it for backwards walks, steps other than 1, and pairs (for j = i + 1). Declare the counter with let so each iteration gets its own binding.',
        },
        {
          title: 'for...of over arrays and strings',
          code: String.raw`let vowels = 0;
for (const ch of 'hello') if ('aeiou'.includes(ch)) vowels++;
console.log(vowels); // → 2
for (const [i, x] of ['a', 'b'].entries()) console.log(i, x);
// → 0 a
// → 1 b`,
          note: 'for...of gives values, and .entries() gives [index, value] pairs. Over a string it yields whole code points, so emoji stay intact.',
        },
        {
          title: 'for...of over Map and Set',
          code: String.raw`const ages = new Map([['ada', 36], ['bo', 4]]);
for (const [name, age] of ages) console.log(name, age);
// → ada 36
// → bo 4
console.log([...ages.keys()], [...ages.values()]); // → ["ada", "bo"] [36, 4]
for (const x of new Set([3, 1, 3])) console.log(x);
// → 3
// → 1`,
          note: 'Map and Set iterate in insertion order, which you can rely on. Spread into an array when you need map, filter or sort.',
        },
        {
          title: 'for...in (avoid on arrays)',
          code: String.raw`const arr = [10, 20];
for (const i in arr) console.log(i + 1);
// → 01
// → 11
for (const x of arr) console.log(x + 1);
// → 11
// → 21`,
          note: 'for...in walks string keys, so index arithmetic silently concatenates, and it also visits inherited enumerable properties. Use for...of, or Object.keys for objects.',
        },
        {
          title: 'while and do-while',
          code: String.raw`let n = 13;
const bits: number[] = [];
while (n > 0) {
  bits.push(n % 2);
  n = Math.floor(n / 2);
}
console.log(bits.reverse().join('')); // → 1101
let tries = 0;
do {
  tries++;
} while (tries < 0); // the body runs once even though the condition is false
console.log(tries); // → 1`,
          note: 'while fits loops driven by a condition (two pointers, a queue that is not empty). Make sure something in the body always moves toward the exit.',
        },
        {
          title: 'break and continue with labels',
          code: String.raw`const grid = [[1, 3], [5, 6], [8, 9]];
let found: [number, number] | null = null;
outer: for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r]!.length; c++) {
    if (grid[r]![c]! % 2 !== 0) continue; // next column
    found = [r, c];
    break outer; // leaves both loops
  }
}
console.log(found); // → [1, 1]`,
          note: 'A plain break only exits the innermost loop. A label avoids a "done" flag when searching a grid.',
        },
        {
          title: 'forEach vs for...of',
          code: String.raw`const xs = [1, 2, 3];
xs.forEach((x) => {
  if (x > 1) return; // only skips this element, no way to break
  console.log('each', x);
});
// → each 1
const order: string[] = [];
xs.forEach(async (x) => {
  await null;
  order.push('cb' + x);
});
order.push('after');
console.log(order[0]); // → after`,
          note: 'forEach cannot break or return early, and it does not wait for async callbacks. Use for...of when you need break, continue or await in the body.',
        },
        {
          title: 'Iterating objects',
          code: String.raw`const stock = { apples: 3, pears: 0 };
for (const [k, v] of Object.entries(stock)) console.log(k, v);
// → apples 3
// → pears 0
console.log(Object.keys(stock), Object.values(stock)); // → ["apples", "pears"] [3, 0]
const doubled = Object.fromEntries(Object.entries(stock).map(([k, v]) => [k, v * 2]));
console.log(doubled); // → {"apples": 6, "pears": 0}
console.log(Object.keys({ b: 1, 2: 1, 1: 1 })); // → ["1", "2", "b"]`,
          note: 'Keys are always strings, and integer-like keys come first in numeric order regardless of insertion. Use a Map when order or key type matters.',
        },
        {
          title: 'Ranges',
          code: String.raw`const range = (n: number) => Array.from({ length: n }, (_, i) => i);
console.log(range(5)); // → [0, 1, 2, 3, 4]
console.log(Array.from({ length: 3 }, (_, i) => 10 + i * 5)); // → [10, 15, 20]
console.log([...Array(3).keys()]); // → [0, 1, 2]`,
          note: 'There is no range(): Array.from({ length: n }, (_, i) => i) is the idiom. For a plain counting loop, a classic for is cheaper than building an array.',
        },
      ],
    },
    {
      id: 'collections',
      label: 'Collections',
      intro:
        'Arrays, Map and Set cover almost everything. There is no built-in deque or priority queue, so know how to fake a queue and write a heap.',
      entries: [
        {
          title: 'Array ends: push, pop, shift, unshift',
          code: String.raw`const a = [1, 2, 3];
a.push(4); // O(1), returns the new length
console.log(a.pop(), a); // → 4 [1, 2, 3]
a.unshift(0); // O(n): moves every element
console.log(a.shift(), a); // → 0 [1, 2, 3]
console.log([].pop(), a.at(-1)); // → undefined 3`,
          note: 'push and pop are O(1); shift and unshift are O(n), so a shift-based queue makes BFS quadratic. pop on an empty array returns undefined instead of throwing.',
        },
        {
          title: 'slice vs splice',
          code: String.raw`const a = [0, 1, 2, 3, 4];
console.log(a.slice(1, 3), a.slice(-2)); // → [1, 2] [3, 4]
const removed = a.splice(1, 2); // mutates: remove 2 items at index 1
console.log(removed, a); // → [1, 2] [0, 3, 4]
a.splice(1, 0, 9, 9); // insert without removing
console.log(a); // → [0, 9, 9, 3, 4]`,
          note: 'slice copies and never mutates (the end index is exclusive). splice edits in place and returns what it removed.',
        },
        {
          title: 'map, filter, reduce, flat',
          code: String.raw`const xs = [1, 2, 3, 4];
console.log(xs.map((x) => x * x)); // → [1, 4, 9, 16]
console.log(xs.filter((x) => x % 2 === 0)); // → [2, 4]
console.log(xs.reduce((sum, x) => sum + x, 0)); // → 10
const counts = ['a', 'b', 'a'].reduce<Record<string, number>>((acc, s) => {
  acc[s] = (acc[s] ?? 0) + 1;
  return acc;
}, {});
console.log(counts); // → {"a": 2, "b": 1}
console.log([[1, 2], [3, [4]]].flat(), ['a b', 'c'].flatMap((s) => s.split(' '))); // → [1, 2, 3, [4]] ["a", "b", "c"]`,
          note: 'Always pass reduce an initial value: on an empty array without one it throws. flat() goes one level deep by default; flat(Infinity) flattens fully.',
        },
        {
          title: 'Searching: find, some, includes, indexOf',
          code: String.raw`const xs = [5, 12, 8, 130];
console.log(xs.find((x) => x > 10), xs.findIndex((x) => x > 10)); // → 12 1
console.log(xs.find((x) => x > 999), xs.findIndex((x) => x > 999)); // → undefined -1
console.log(xs.some((x) => x > 100), xs.every((x) => x > 1)); // → true true
console.log(xs.includes(8), xs.indexOf(8), xs.lastIndexOf(8)); // → true 2 2
console.log([NaN].includes(NaN), [NaN].indexOf(NaN)); // → true -1`,
          note: 'All of these are O(n). If you search the same array repeatedly, build a Set or Map once instead.',
        },
        {
          title: 'Sorting with comparators and multiple keys',
          code: String.raw`const xs = [10, 9, 1, 100];
console.log([...xs].sort()); // → [1, 10, 100, 9]
console.log([...xs].sort((a, b) => a - b)); // → [1, 9, 10, 100]
const people = [
  { name: 'bo', age: 30 },
  { name: 'ada', age: 30 },
  { name: 'cy', age: 25 },
];
people.sort((a, b) => b.age - a.age || a.name.localeCompare(b.name));
console.log(people.map((p) => p.name)); // → ["ada", "bo", "cy"]`,
          note: 'Without a comparator sort compares strings, even for numbers. sort mutates (copy with [...xs] first) and is stable; chain tie-breakers with ||.',
        },
        {
          title: '2D arrays (the fill trap)',
          code: String.raw`const bad: number[][] = Array(3).fill([]);
bad[0]!.push(1);
console.log(bad); // → [[1], [1], [1]]
const grid = Array.from({ length: 2 }, () => Array<number>(3).fill(0));
grid[0]![1] = 5;
console.log(grid); // → [[0, 5, 0], [0, 0, 0]]`,
          note: 'fill([]) puts the same array object in every row. Build rows with Array.from and a factory function so each row is new.',
        },
        {
          title: 'Map and Set',
          code: String.raw`const m = new Map<string, number>();
m.set('b', 2).set('a', 1);
console.log(m.get('a'), m.get('z'), m.has('b'), m.size); // → 1 undefined true 2
console.log([...m.keys()]); // → ["b", "a"]
m.delete('b');
const s = new Set([1, 2, 2, 3]);
s.add(4);
console.log(s.size, s.has(2), [...s]); // → 4 true [1, 2, 3, 4]`,
          note: 'Use .size (not .length) and .get (not [key]). Both keep insertion order, which makes a Map an easy LRU: delete and re-set to move a key to the end.',
        },
        {
          title: 'Keys by identity, tuple keys as strings',
          code: String.raw`const m = new Map<number[], string>();
m.set([1, 2], 'a');
console.log(m.get([1, 2])); // → undefined
const key = (r: number, c: number) => r + ',' + c;
const visited = new Set<string>();
visited.add(key(1, 2));
console.log(visited.has(key(1, 2)), visited.has(key(12, 0))); // → true false
const [r, c] = '1,2'.split(',').map(Number);
console.log(r, c); // → 1 2`,
          note: 'Arrays and objects are compared by reference, so [1, 2] is a new key every time. Encode tuples as strings (a template literal `${r},${c}` in real code) with a separator, or as r * cols + c.',
        },
        {
          title: 'Objects as records',
          code: String.raw`const counts: Record<string, number> = {};
for (const w of ['a', 'b', 'a']) counts[w] = (counts[w] ?? 0) + 1;
console.log(counts); // → {"a": 2, "b": 1}
console.log(Object.hasOwn(counts, 'a'), Object.hasOwn(counts, 'toString')); // → true false
delete counts.a;
console.log(Object.keys(counts).length); // → 1`,
          note: 'Fine for string keys you control. For arbitrary user keys ("__proto__", "constructor") or non-string keys, use a Map.',
        },
        {
          title: 'Queue and stack',
          code: String.raw`const queue: number[] = [1];
let head = 0; // read pointer instead of queue.shift()
const order: number[] = [];
while (head < queue.length) {
  const x = queue[head++]!;
  order.push(x);
  if (x < 4) queue.push(x * 2, x * 2 + 1);
}
console.log(order); // → [1, 2, 3, 4, 5, 6, 7]
const stack: string[] = [];
for (const ch of '(()') ch === '(' ? stack.push(ch) : stack.pop();
console.log(stack.length); // → 1`,
          note: 'A head index makes dequeue O(1). For a long-lived queue, occasionally drop the consumed prefix with queue = queue.slice(head) and reset head. A stack is just push and pop.',
        },
        {
          title: 'Binary min-heap (write it yourself)',
          code: String.raw`class MinHeap<T> {
  private a: T[] = [];
  constructor(private less: (x: T, y: T) => boolean) {}
  get size(): number { return this.a.length; }
  peek(): T | undefined { return this.a[0]; }
  push(x: T): void {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i]!, a[p]!)) break;
      [a[i], a[p]] = [a[p]!, a[i]!];
      i = p;
    }
  }
  pop(): T | undefined {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length === 0 || last === undefined) return top;
    a[0] = last;
    for (let i = 0; ; ) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && this.less(a[l]!, a[m]!)) m = l;
      if (r < a.length && this.less(a[r]!, a[m]!)) m = r;
      if (m === i) break;
      [a[i], a[m]] = [a[m]!, a[i]!];
      i = m;
    }
    return top;
  }
}
const h = new MinHeap<[number, string]>((x, y) => x[0] < y[0]);
h.push([5, 'e']);
h.push([1, 'a']);
h.push([3, 'c']);
console.log(h.pop(), h.pop(), h.size); // → [1, "a"] [3, "c"] 1`,
          note: 'JavaScript has no priority queue. Parent of i is (i - 1) >> 1, children are 2i + 1 and 2i + 2; push sifts up, pop moves the last item to the root and sifts down. For a max-heap flip the comparator.',
        },
        {
          title: 'Binary search (lower bound)',
          code: String.raw`// First index i with a[i] >= target (a.length if none).
function lowerBound(a: number[], target: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid]! < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
const a = [1, 3, 3, 5];
console.log(lowerBound(a, 3), lowerBound(a, 4), lowerBound(a, 9)); // → 1 3 4`,
          note: 'The half-open [lo, hi) form never loops forever. For "last version at or before t", use the upper bound (a[mid] <= t) minus 1.',
        },
        {
          title: 'Deep copies with structuredClone',
          code: String.raw`const orig = { tags: ['a'], when: new Date(0), m: new Map([['k', 1]]) };
const shallow = { ...orig };
const deep = structuredClone(orig);
orig.tags.push('b');
console.log(shallow.tags, deep.tags); // → ["a", "b"] ["a"]
console.log(deep.m.get('k'), deep.when instanceof Date); // → 1 true`,
          note: 'structuredClone copies Maps, Sets, Dates and cycles. It throws on functions and turns class instances into plain objects; JSON.parse(JSON.stringify(x)) is worse (loses Map, Date, undefined).',
        },
      ],
    },
    {
      id: 'strings',
      label: 'Strings',
      intro:
        'Strings are immutable UTF-16 sequences. Every method returns a new string.',
      entries: [
        {
          title: 'Indexing and length',
          code: String.raw`const s = 'hello';
console.log(s[0], s.at(-1), s.length, s[99]); // → h o 5 undefined
const t = s.toUpperCase();
console.log(s, t); // → hello HELLO
console.log(s[0]!.toUpperCase() + s.slice(1)); // → Hello`,
          note: 'Out-of-range indexes give undefined, not an error. s[0] = "j" does nothing, so build a new string (or work on an array of characters).',
        },
        {
          title: 'slice and substring',
          code: String.raw`const s = 'interview';
console.log(s.slice(0, 5), s.slice(5), s.slice(-4)); // → inter view view
console.log(s.substring(5, 0), JSON.stringify(s.slice(5, 0))); // → inter ""`,
          note: 'Prefer slice: it accepts negative indexes. substring swaps its arguments when start > end, which hides bugs.',
        },
        {
          title: 'split and join',
          code: String.raw`console.log('a,b,,c'.split(',')); // → ["a", "b", "", "c"]
console.log('  two   words '.trim().split(/\s+/)); // → ["two", "words"]
console.log('abc'.split(''), ['x', 'y'].join('-'), [1, 2].join()); // → ["a", "b", "c"] x-y 1,2
console.log(''.split(','), 'a=1;b=2'.split(';').map((kv) => kv.split('='))); // → [""] [["a", "1"], ["b", "2"]]`,
          note: 'Splitting an empty string gives [""] (one empty field), not []. join() with no argument uses a comma.',
        },
        {
          title: 'Splitting on the first separator only',
          code: String.raw`const line = 'key:a:b';
console.log(line.split(':', 2)); // → ["key", "a"]
const i = line.indexOf(':');
console.log(line.slice(0, i), line.slice(i + 1)); // → key a:b`,
          note: 'split with a limit drops the rest of the string (unlike Python maxsplit). For "key:value" where the value may contain the separator, use indexOf and slice.',
        },
        {
          title: 'includes, startsWith, endsWith, indexOf',
          code: String.raw`const path = '/usr/local/bin';
console.log(path.includes('local'), path.startsWith('/usr'), path.endsWith('/')); // → true true false
console.log(path.indexOf('/', 1), path.lastIndexOf('/'), path.indexOf('x')); // → 4 10 -1`,
          note: 'indexOf returns -1 when missing, and -1 is truthy, so test with includes or compare to -1 explicitly.',
        },
        {
          title: 'padStart, padEnd and repeat',
          code: String.raw`console.log('7'.padStart(3, '0'), 'ab'.padEnd(4, '.')); // → 007 ab..
console.log('-'.repeat(5)); // → -----
console.log((5).toString(2).padStart(8, '0')); // → 00000101`,
          note: 'Handy for fixed-width serialization (length prefixes, zero-padded ids) and printing grids.',
        },
        {
          title: 'Character codes',
          code: String.raw`console.log('a'.charCodeAt(0), String.fromCharCode(98)); // → 97 b
const shift = (ch: string, k: number) =>
  String.fromCharCode(((ch.charCodeAt(0) - 97 + k) % 26) + 97);
console.log(shift('y', 3)); // → b
const counts = new Array<number>(26).fill(0);
for (const ch of 'banana') counts[ch.charCodeAt(0) - 97]!++;
console.log(counts[0], counts[1], counts[13]); // → 3 1 2`,
          note: 'A 26-slot count array is the classic anagram and frequency trick. Comparing characters with < works too: "a" < "b".',
        },
        {
          title: 'Code points and emoji',
          code: String.raw`const s = 'hi👍';
console.log(s.length, [...s].length); // → 4 3
console.log(s.codePointAt(2), s.charCodeAt(2)); // → 128077 55357
console.log(String.fromCodePoint(128077) === '👍'); // → true
console.log([...s].reverse().join('')); // → 👍ih`,
          note: 'length, indexing and split("") count UTF-16 units, so an emoji is 2. Spread or for...of iterate whole code points; use them to reverse or count characters.',
        },
        {
          title: 'Regex basics',
          code: String.raw`const re = /^[a-z]+\d*$/;
console.log(re.test('abc12'), re.test('12abc')); // → true false
console.log('a1b22c333'.match(/\d+/g), 'abc'.match(/\d+/g)); // → ["1", "22", "333"] null
console.log('x=1, y=2'.replace(/(\w)=(\d)/g, '$2=$1')); // → 1=x, 2=y
for (const m of 'x=1, y=2'.matchAll(/(\w)=(\d)/g)) console.log(m[1], m[2], m.index);
// → x 1 0
// → y 2 5
console.log('a.b.c'.replace('.', '-'), 'a.b.c'.replaceAll('.', '-')); // → a-b.c a-b-c`,
          note: 'replace with a string changes only the first match; use /g or replaceAll. match returns null (not []) when nothing matches, and a /g regex reused with .test keeps lastIndex between calls.',
        },
        {
          title: 'Building strings with join',
          code: String.raw`const rows: string[] = [];
for (let r = 0; r < 3; r++) rows.push(['row', r].join(''));
console.log(rows.join(' | ')); // → row0 | row1 | row2
let s = '';
for (const w of ['a', 'b']) s += w; // fine for short strings
console.log(s); // → ab`,
          note: 'Collect pieces in an array and join once at the end: it is clear and handles separators. Join lines with "\\n" to print a grid.',
        },
        {
          title: 'Number and string conversion',
          code: String.raw`console.log(Number('42'), Number(''), Number('4x'), Number(' 7 ')); // → 42 0 NaN 7
console.log(parseInt('42px', 10), parseInt('ff', 16), parseInt('101', 2)); // → 42 255 5
console.log((255).toString(16), (5).toString(2), String(12), (3.14159).toFixed(2)); // → ff 101 12 3.14
console.log(['1', '2', '3'].map(Number), ['1', '2', '3'].map((s) => parseInt(s))); // → [1, 2, 3] [1, 2, 3]
console.log(['1', '2', '3'].map(parseInt)); // → [1, NaN, NaN]`,
          note: 'Number("") is 0, not NaN, so validate input. Always give parseInt a radix, and never pass it straight to map: the index becomes the radix.',
        },
      ],
    },
    {
      id: 'classes',
      label: 'Classes & types',
      intro:
        'Most of these questions want a class with a few methods. Keep state in private fields and model variants with discriminated unions.',
      entries: [
        {
          title: 'Classes with private fields',
          code: String.raw`class Counter {
  #count = 0; // JS private: truly hidden at run time
  private step: number; // TS private: compile time only
  constructor(step = 1) {
    this.step = step;
  }
  inc(): number {
    this.#count += this.step;
    return this.#count;
  }
}
const c = new Counter(2);
c.inc();
console.log(c.inc(), Object.keys(c)); // → 4 ["step"]`,
          note: 'Either style is fine in an interview; # fields are enforced by the engine, private is only a type check (and types are not checked here).',
        },
        {
          title: 'Getters, parameter properties and static members',
          code: String.raw`class Temperature {
  static readonly ABS_ZERO = -273.15;
  constructor(public celsius: number) {} // declares and assigns this.celsius
  get fahrenheit(): number {
    return (this.celsius * 9) / 5 + 32;
  }
  static fromFahrenheit(f: number): Temperature {
    return new Temperature(((f - 32) * 5) / 9);
  }
}
const t = Temperature.fromFahrenheit(212);
console.log(t.celsius, t.fahrenheit, Temperature.ABS_ZERO); // → 100 212 -273.15`,
          note: 'A getter is read like a property, without parentheses. Static members live on the class itself, which suits factories and constants.',
        },
        {
          title: 'Interfaces and type aliases',
          code: String.raw`interface Account {
  id: string;
  balance: number;
  readonly createdAt: number;
  note?: string;
}
type Op = 'deposit' | 'withdraw';
function apply(acc: Account, op: Op, amount: number): Account {
  return { ...acc, balance: acc.balance + (op === 'deposit' ? amount : -amount) };
}
const a: Account = { id: 'u1', balance: 10, createdAt: 0 };
console.log(apply(a, 'withdraw', 3).balance, a.balance); // → 7 10`,
          note: 'Use interface for object shapes (a class can implement it) and type for unions, tuples and aliases. Both vanish at run time, so you cannot check "x instanceof Account".',
        },
        {
          title: 'Generics',
          code: String.raw`class TypedStack<T> {
  private items: T[] = [];
  push(x: T): void { this.items.push(x); }
  pop(): T | undefined { return this.items.pop(); }
}
function groupBy<T, K>(xs: T[], keyOf: (x: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const x of xs) {
    const k = keyOf(x);
    const bucket = out.get(k);
    if (bucket) bucket.push(x);
    else out.set(k, [x]);
  }
  return out;
}
console.log(groupBy(['ab', 'c', 'de'], (s) => s.length)); // → Map{2 => ["ab", "de"], 1 => ["c"]}
const st = new TypedStack<number>();
st.push(1);
console.log(st.pop(), st.pop()); // → 1 undefined`,
          note: 'Generics keep a container reusable without losing types. Inference usually fills in the type arguments for functions.',
        },
        {
          title: 'Discriminated unions with an exhaustive switch',
          code: String.raw`type Cell =
  | { kind: 'number'; value: number }
  | { kind: 'ref'; target: string }
  | { kind: 'sum'; args: Cell[] };
function evaluate(c: Cell, lookup: (id: string) => number): number {
  switch (c.kind) {
    case 'number': return c.value;
    case 'ref': return lookup(c.target);
    case 'sum': return c.args.reduce((s, a) => s + evaluate(a, lookup), 0);
    default: {
      const unreachable: never = c; // compile error if a case is missing
      throw new Error('unknown cell ' + JSON.stringify(unreachable));
    }
  }
}
const cell: Cell = { kind: 'sum', args: [{ kind: 'number', value: 2 }, { kind: 'ref', target: 'A1' }] };
console.log(evaluate(cell, () => 40)); // → 42`,
          note: 'A shared literal field (kind) lets TypeScript narrow each case. The never assignment turns a forgotten case into a type error in the editor.',
        },
        {
          title: 'Custom Error subclasses',
          code: String.raw`class InsufficientCredits extends Error {
  constructor(public needed: number, public available: number) {
    super('need ' + needed + ', have ' + available);
    this.name = 'InsufficientCredits';
  }
}
try {
  throw new InsufficientCredits(5, 2);
} catch (err) {
  if (!(err instanceof InsufficientCredits)) throw err;
  console.log(err.name, err.message, err.needed); // → InsufficientCredits need 5, have 2 5
}`,
          note: 'The catch variable is unknown, so narrow it with instanceof and rethrow what you do not handle. Set this.name so logs show the class.',
        },
        {
          title: 'Implementing [Symbol.iterator]',
          code: String.raw`class Range implements Iterable<number> {
  constructor(private start: number, private end: number) {}
  [Symbol.iterator](): Iterator<number> {
    let i = this.start;
    const end = this.end;
    return {
      next: () => (i < end ? { value: i++, done: false } : { value: undefined, done: true }),
    };
  }
}
console.log([...new Range(2, 5)]); // → [2, 3, 4]
for (const x of new Range(0, 2)) console.log(x);
// → 0
// → 1`,
          note: 'Anything with a [Symbol.iterator]() that returns { next() } works with for...of, spread and Array.from. Each call should return a fresh iterator.',
        },
        {
          title: 'Generator functions',
          code: String.raw`function* chunks<T>(xs: T[], size: number): Generator<T[]> {
  for (let i = 0; i < xs.length; i += size) yield xs.slice(i, i + size);
}
console.log([...chunks([1, 2, 3, 4, 5], 2)]); // → [[1, 2], [3, 4], [5]]
class Tree {
  constructor(public val: number, public kids: Tree[] = []) {}
  *[Symbol.iterator](): Generator<number> {
    yield this.val;
    for (const k of this.kids) yield* k; // delegate to the child's iterator
  }
}
console.log([...new Tree(1, [new Tree(2, [new Tree(3)]), new Tree(4)])]); // → [1, 2, 3, 4]`,
          note: 'A generator is the shortest way to write an iterator: it pauses at each yield. Making [Symbol.iterator] a generator method makes the class iterable.',
        },
        {
          title: 'Wrapping an iterator: hasNext and peek',
          code: String.raw`class PeekingIterator<T> {
  private buf: IteratorResult<T>;
  constructor(private it: Iterator<T>) {
    this.buf = it.next();
  }
  hasNext(): boolean { return !this.buf.done; }
  peek(): T { return this.buf.value as T; }
  next(): T {
    const v = this.buf.value as T;
    this.buf = this.it.next();
    return v;
  }
}
const p = new PeekingIterator([1, 2][Symbol.iterator]());
console.log(p.peek(), p.next(), p.next(), p.hasNext()); // → 1 1 2 false`,
          note: 'JS iterators have no hasNext, so buffer one result ahead. Interview iterator questions (peek, flatten, interleave) are all variations on this buffer.',
        },
      ],
    },
    {
      id: 'async',
      label: 'Async',
      intro:
        'One thread, many awaits. Code between two awaits never interleaves with other code, which makes shared counters safe; anything across an await can change.',
      entries: [
        {
          title: 'Promises and the event loop',
          code: String.raw`const p = new Promise<number>((resolve) => setTimeout(() => resolve(42), 10));
p.then((v) => console.log('then', v));
console.log('sync first');
const v = await p;
console.log('awaited', v);
// → sync first
// → then 42
// → awaited 42`,
          note: 'A promise callback always runs later, even when the promise is already settled. Synchronous code finishes first.',
        },
        {
          title: 'async/await with try/catch',
          code: String.raw`async function loadUser(id: number): Promise<string> {
  if (id < 0) throw new Error('bad id');
  return 'user' + id;
}
try {
  console.log(await loadUser(1)); // → user1
  await loadUser(-1);
} catch (err) {
  console.log('caught', (err as Error).message); // → caught bad id
}
console.log(await loadUser(-1).catch(() => 'fallback')); // → fallback`,
          note: 'try/catch only sees a rejection you await inside the try. "return promise" without await inside a try escapes the catch; write "return await promise".',
        },
        {
          title: 'Promise.all and Promise.allSettled',
          code: String.raw`function after<T>(ms: number, v: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(v), ms));
}
console.log(await Promise.all([after(20, 'a'), after(10, 'b')])); // → ["a", "b"]
const results = await Promise.allSettled([after(5, 1), Promise.reject(new Error('x'))]);
console.log(results.map((r) => r.status)); // → ["fulfilled", "rejected"]
try {
  await Promise.all([after(5, 1), Promise.reject(new Error('boom'))]);
} catch (e) {
  console.log((e as Error).message); // → boom
}`,
          note: 'all keeps input order and rejects on the first failure (the other tasks keep running). Use allSettled when you need every outcome.',
        },
        {
          title: 'Promise.race and Promise.any',
          code: String.raw`function after<T>(ms: number, v: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(v), ms));
}
console.log(await Promise.race([after(30, 'slow'), after(5, 'fast')])); // → fast
console.log(await Promise.any([Promise.reject(new Error('a')), after(5, 'ok')])); // → ok
try {
  await Promise.any([Promise.reject(new Error('a'))]);
} catch (e) {
  console.log(e instanceof AggregateError); // → true
}`,
          note: 'race settles with the first to settle, success or failure; any waits for the first success. Neither cancels the losers.',
        },
        {
          title: 'Sleep with a setTimeout promise',
          code: String.raw`const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const t0 = Date.now();
await delay(50);
console.log(Date.now() - t0 >= 45); // → true`,
          note: 'The one-liner every async question needs. Timers are a minimum, not exact: allow a few ms of slack in assertions.',
        },
        {
          title: 'Sequential vs parallel awaits',
          code: String.raw`const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const log: string[] = [];
const task = async (name: string) => {
  log.push('start ' + name);
  await delay(5);
  log.push('end ' + name);
};
for (const n of ['a', 'b']) await task(n);
console.log(log.join(', ')); // → start a, end a, start b, end b
log.length = 0;
await Promise.all(['a', 'b'].map(task));
console.log(log.join(', ')); // → start a, start b, end a, end b`,
          note: 'await in a loop runs one task at a time. Start them all and await Promise.all when they are independent.',
        },
        {
          title: 'Concurrency limit (worker pool)',
          code: String.raw`async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++; // safe: no await between the read and the increment
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
let active = 0;
let peak = 0;
const out = await mapLimit([30, 10, 20, 10, 5], 2, async (ms) => {
  active++;
  peak = Math.max(peak, active);
  await new Promise((r) => setTimeout(r, ms));
  active--;
  return ms * 2;
});
console.log(out, peak); // → [60, 20, 40, 20, 10] 2`,
          note: 'Start N workers that each pull the next index until the work runs out. Results stay in input order because each worker writes to its own index.',
        },
        {
          title: 'Timeouts with Promise.race',
          code: String.raw`function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout after ' + ms + ' ms')), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}
const slow = new Promise((r) => setTimeout(() => r('done'), 100));
try {
  await withTimeout(slow, 20);
} catch (e) {
  console.log((e as Error).message); // → timeout after 20 ms
}
console.log(await withTimeout(Promise.resolve('fast'), 20)); // → fast`,
          note: 'Clear the timer in finally so it does not keep firing after the real work wins. The slow work itself is not cancelled; pass an AbortSignal if it must stop.',
        },
        {
          title: 'Crawler skeleton: BFS with a visited set',
          code: String.raw`const links: Record<string, string[]> = { '/': ['/a', '/b'], '/a': ['/b', '/c'], '/b': ['/'], '/c': [] };
async function fetchLinks(url: string): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 5));
  return links[url] ?? [];
}
async function crawl(start: string): Promise<string[]> {
  const seen = new Set([start]);
  let frontier = [start];
  while (frontier.length > 0) {
    const pages = await Promise.all(frontier.map((u) => fetchLinks(u)));
    frontier = [];
    for (const url of pages.flat()) {
      if (seen.has(url)) continue;
      seen.add(url); // mark when queued, not when fetched
      frontier.push(url);
    }
  }
  return [...seen].sort();
}
console.log(await crawl('/')); // → ["/", "/a", "/b", "/c"]`,
          note: 'Mark a URL as seen before fetching it, or two in-flight requests fetch the same page. Level-by-level is simplest; use the worker pool when you need a hard cap on concurrent fetches.',
        },
        {
          title: 'Async generators and for await',
          code: String.raw`async function* pages(total: number): AsyncGenerator<string[]> {
  for (let p = 1; p <= total; p++) {
    await new Promise((r) => setTimeout(r, 5));
    yield ['item' + p + 'a', 'item' + p + 'b'];
  }
}
const all: string[] = [];
for await (const page of pages(2)) all.push(...page);
console.log(all); // → ["item1a", "item1b", "item2a", "item2b"]`,
          note: 'Good for paginated APIs and streams: the consumer pulls one page at a time. break out of the for await to stop fetching.',
        },
      ],
    },
    {
      id: 'libraries',
      label: 'Libraries',
      intro:
        'Built-ins need no import. Any npm package can be imported by name at the top of your code and is loaded from esm.sh when you run. In a real interview you usually cannot install anything, so be ready to write a heap or queue yourself and to say which library you would use in production.',
      entries: [
        {
          title: 'Built-ins you get for free',
          code: String.raw`console.log(Math.max(3, 7), JSON.stringify({ a: [1] })); // → 7 {"a":[1]}
console.log(new URL('https://x.dev/a/b?q=1').pathname); // → /a/b
console.log(new TextEncoder().encode('hé').length); // → 3
console.log(typeof crypto.randomUUID()); // → string
console.log(new Intl.NumberFormat('en-US').format(1234567.5)); // → 1,234,567.5`,
          note: 'TextEncoder gives the real byte length of a string, which matters for serialization formats and memory budgets.',
        },
        {
          title: 'Dates without a library',
          code: String.raw`const d = new Date(Date.UTC(2024, 0, 31)); // months are 0-based
console.log(d.toISOString()); // → 2024-01-31T00:00:00.000Z
d.setUTCDate(d.getUTCDate() + 1); // rolls over into February
console.log(d.toISOString().slice(0, 10)); // → 2024-02-01`,
          note: 'Use the UTC methods to avoid time-zone surprises. Date objects are mutable, so copy with new Date(d) before changing one you do not own.',
        },
        {
          title: 'LRU cache with a plain Map',
          code: String.raw`class LRU<K, V> {
  private m = new Map<K, V>();
  constructor(private capacity: number) {}
  get(k: K): V | undefined {
    if (!this.m.has(k)) return undefined;
    const v = this.m.get(k)!;
    this.m.delete(k); // re-insert to mark as most recent
    this.m.set(k, v);
    return v;
  }
  set(k: K, v: V): void {
    this.m.delete(k);
    this.m.set(k, v);
    if (this.m.size > this.capacity) this.m.delete(this.m.keys().next().value!);
  }
}
const lru = new LRU<string, number>(2);
lru.set('a', 1);
lru.set('b', 2);
lru.get('a');
lru.set('c', 3);
console.log(lru.get('b'), lru.get('a')); // → undefined 1`,
          note: 'Map iterates in insertion order, so its first key is the least recently used. This is the answer interviewers expect before any library.',
        },
        {
          title: 'lodash-es',
          code: String.raw`import { chunk, groupBy, sortBy, cloneDeep, debounce } from 'lodash-es';
console.log(chunk([1, 2, 3, 4, 5], 2)); // → [[1, 2], [3, 4], [5]]
console.log(groupBy(['one', 'two', 'three'], (s) => s.length)); // → {"3": ["one", "two"], "5": ["three"]}
const users = [{ n: 'b', a: 2 }, { n: 'a', a: 2 }, { n: 'c', a: 1 }];
console.log(sortBy(users, ['a', 'n']).map((u) => u.n)); // → ["c", "a", "b"]
const orig = { a: [{ b: 2 }] };
const copy = cloneDeep(orig);
copy.a[0]!.b = 9;
console.log(orig.a[0]!.b); // → 2
const save = debounce((v: number) => console.log('saved', v), 50);
save(1);
save(2);
save(3);
// → saved 3`,
          note: 'sortBy is stable and ascending only (orderBy takes directions). debounce runs once, after the calls stop for the given ms.',
          run: false,
        },
        {
          title: '@datastructures-js/priority-queue',
          code: String.raw`import { MinPriorityQueue, PriorityQueue } from '@datastructures-js/priority-queue';
const tasks = new MinPriorityQueue<{ id: string; cost: number }>((t) => t.cost);
tasks.enqueue({ id: 'a', cost: 5 });
tasks.enqueue({ id: 'b', cost: 1 });
tasks.enqueue({ id: 'c', cost: 3 });
console.log(tasks.dequeue()?.id, tasks.front()?.id, tasks.size()); // → b c 2
const pq = new PriorityQueue<[number, string]>((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
pq.enqueue([2, 'x']);
pq.enqueue([1, 'z']);
pq.enqueue([1, 'y']);
console.log(pq.dequeue(), pq.isEmpty()); // → [1, "y"] false`,
          note: 'MinPriorityQueue and MaxPriorityQueue take a function that picks the priority; PriorityQueue takes a full comparator. size() and isEmpty() are methods.',
          run: false,
        },
        {
          title: '@datastructures-js/deque',
          code: String.raw`import { Deque } from '@datastructures-js/deque';
const dq = new Deque<number>([1, 2, 3]);
dq.pushFront(0);
dq.pushBack(4);
console.log(dq.popFront(), dq.popBack()); // → 0 4
console.log(dq.front(), dq.back(), dq.size()); // → 1 3 3`,
          note: 'O(1) at both ends, for sliding-window maximums and 0-1 BFS. Without it, use an array with a head index.',
          run: false,
        },
        {
          title: 'mnemonist: Heap and LRUCache',
          code: String.raw`import { Heap, LRUCache } from 'mnemonist';
const heap = new Heap<number>((a, b) => a - b); // smallest first
heap.push(5);
heap.push(1);
heap.push(3);
console.log(heap.pop(), heap.peek(), heap.size); // → 1 3 2
const cache = new LRUCache<string, number>(2);
cache.set('a', 1);
cache.set('b', 2);
cache.get('a'); // 'b' is now least recently used
cache.set('c', 3);
console.log(cache.has('b'), cache.get('a'), cache.size); // → false 1 2`,
          note: 'mnemonist has many fast structures (Heap, LRUCache, Trie, BiMap). Here size is a property, not a method.',
          run: false,
        },
        {
          title: 'date-fns',
          code: String.raw`import { format, addDays, differenceInDays } from 'date-fns';
const d = new Date(2024, 0, 30); // local time, January 30
console.log(format(addDays(d, 3), 'yyyy-MM-dd')); // → 2024-02-02
console.log(differenceInDays(new Date(2024, 2, 1), d)); // → 31`,
          note: 'Functions never mutate their input. Format tokens are Unicode: yyyy and dd, not YYYY and DD.',
          run: false,
        },
      ],
      modules: [
        {
          heading: 'Built-in globals (no import)',
          names: [
            'Math',
            'JSON',
            'Array',
            'Object',
            'String',
            'Number',
            'BigInt',
            'Boolean',
            'Symbol',
            'Map',
            'Set',
            'WeakMap',
            'WeakSet',
            'Date',
            'Intl',
            'RegExp',
            'Promise',
            'Error',
            'AggregateError',
            'structuredClone',
            'TextEncoder',
            'TextDecoder',
            'URL',
            'URLSearchParams',
            'crypto.randomUUID',
            'crypto.getRandomValues',
            'setTimeout',
            'setInterval',
            'queueMicrotask',
            'AbortController',
            'performance.now',
            'ArrayBuffer',
            'Uint8Array',
            'DataView',
            'atob',
            'btoa',
            'console',
          ],
        },
      ],
    },
    {
      id: 'gotchas',
      label: 'Gotchas',
      intro:
        'The bugs that cost the most time in a timed round. Most of them give a wrong answer instead of an error.',
      entries: [
        {
          title: 'Default sort is lexicographic',
          code: String.raw`console.log([10, 9, 1].sort()); // → [1, 10, 9]
console.log([10, 9, 1].sort((a, b) => a - b)); // → [1, 9, 10]
console.log([3, 1, 2].sort((a, b) => b - a)); // → [3, 2, 1]`,
          note: 'sort() converts elements to strings first. Always pass a comparator for numbers.',
        },
        {
          title: '== vs === and typeof',
          code: String.raw`const zero: unknown = 0;
const one: unknown = '1';
console.log(zero == '', one == 1, null == undefined); // → true true true
console.log(zero === '', one === 1, null === undefined); // → false false false
console.log(typeof null, typeof [], Array.isArray([])); // → object object true`,
          note: 'Always use ===. The one useful == is x == null, which matches null and undefined. typeof null is "object", so check null explicitly.',
        },
        {
          title: 'Floating point: NaN and 0.1 + 0.2',
          code: String.raw`console.log(0.1 + 0.2, 0.1 + 0.2 === 0.3); // → 0.30000000000000004 false
console.log(Math.abs(0.1 + 0.2 - 0.3) < 1e-9); // → true
console.log(NaN === NaN, Number.isNaN(NaN), Object.is(NaN, NaN)); // → false true true
console.log(10 + 20 === 30); // → true`,
          note: 'Keep money and credits as integer cents (or BigInt) so sums are exact. NaN never equals itself; test with Number.isNaN.',
        },
        {
          title: 'Objects and arrays compare by reference',
          code: String.raw`console.log([1] === [1], { a: 1 } === { a: 1 }); // → false false
console.log(new Set([[1], [1]]).size); // → 2
const m = new Map<string, number>([[JSON.stringify([1, 2]), 5]]);
console.log(m.get(JSON.stringify([1, 2]))); // → 5`,
          note: 'Set and Map compare keys by identity, so arrays never dedupe. Convert to a string key, or compare contents by hand.',
        },
        {
          title: 'Mutating while iterating',
          code: String.raw`const xs = [1, 2, 2, 3];
for (let i = 0; i < xs.length; i++) if (xs[i] === 2) xs.splice(i, 1);
console.log(xs); // → [1, 2, 3]
console.log([1, 2, 2, 3].filter((x) => x !== 2)); // → [1, 3]
const m = new Map([['a', 1], ['b', 2]]);
for (const k of m.keys()) if (k === 'a') m.delete(k);
console.log([...m.keys()]); // → ["b"]`,
          note: 'Splicing during a forward loop skips the next element: filter into a new array or loop backwards. Deleting from a Map or Set while iterating it is safe, but adding keeps the loop going.',
        },
        {
          title: 'this in callbacks',
          code: String.raw`class Ledger {
  total = 0;
  addAll(xs: number[]): number {
    xs.forEach((x) => (this.total += x)); // arrow keeps the class's this
    return this.total;
  }
}
const l = new Ledger();
console.log(l.addAll([1, 2, 3])); // → 6
const detached = l.addAll;
try {
  detached([1]);
} catch (e) {
  console.log((e as Error).name); // → TypeError
}
console.log(l.addAll.bind(l)([4])); // → 10`,
          note: 'Passing obj.method as a callback loses this. Use arrow callbacks inside methods, or wrap: (x) => obj.method(x).',
        },
        {
          title: 'Missing await',
          code: String.raw`async function save(db: Map<string, number>): Promise<void> {
  await null;
  db.set('k', 1);
}
const db = new Map<string, number>();
save(db); // forgot await
console.log(db.size); // → 0
await save(db);
console.log(db.size); // → 1
async function isAllowed(): Promise<boolean> { return false; }
console.log(isAllowed() ? 'yes' : 'no', (await isAllowed()) ? 'yes' : 'no'); // → yes no`,
          note: 'A promise is always truthy, so "if (isAllowed())" passes. Without await the work has not happened yet when the next line runs.',
        },
        {
          title: 'Floating promises',
          code: String.raw`async function charge(amount: number): Promise<void> {
  if (amount < 0) throw new Error('negative');
}
// charge(-1);  floating: the rejection is unhandled and the error is lost
const errors: string[] = [];
charge(-1).catch((e: Error) => errors.push(e.message)); // fire and forget, safely
await charge(1); // or simply await it
console.log(errors); // → ["negative"]`,
          note: 'Every promise should be awaited, returned, or given a .catch. An unhandled rejection can crash a Node process and hides the real failure.',
        },
        {
          title: 'Array holes',
          code: String.raw`const a = new Array<number>(3);
let visits = 0;
a.forEach(() => visits++);
console.log(a.length, visits, a.map(() => 0)[0]); // → 3 0 undefined
console.log(new Array<number>(3).fill(0)); // → [0, 0, 0]
const b = [1, 2, 3];
delete b[1];
console.log(b.length, 1 in b); // → 3 false`,
          note: 'new Array(n) has length n but no elements, and map, forEach and filter skip holes. fill or Array.from before using it; remove items with splice, never delete.',
        },
        {
          title: 'in vs Object.hasOwn',
          code: String.raw`const counts: Record<string, number> = { a: 1 };
console.log('toString' in counts, Object.hasOwn(counts, 'toString')); // → true false
const freq: Record<string, number> = {};
for (const w of ['constructor']) freq[w] = (freq[w] || 0) + 1;
console.log(typeof freq.constructor); // → string`,
          note: 'in also sees inherited keys, and a plain object already "has" constructor and toString, so word counts break. Use Object.hasOwn, Object.create(null), or a Map.',
        },
        {
          title: 'Integers beyond 2^53',
          code: String.raw`console.log(2 ** 53 + 1); // → 9007199254740992
console.log(Number.isSafeInteger(2 ** 53)); // → false
console.log(9007199254740993n + 1n); // → 9007199254740994n
console.log(JSON.parse('{"id": 12345678901234567890}').id); // → 12345678901234567000
console.log((2 ** 31) | 0); // → -2147483648`,
          note: 'Large ids and running totals lose precision silently. Keep big ids as strings and use BigInt for exact large arithmetic; bitwise operators work on 32 bits.',
        },
        {
          title: 'Recursion depth: use an explicit stack',
          code: String.raw`const n = 100000;
const next = Array.from({ length: n }, (_, i) => (i + 1 < n ? [i + 1] : []));
function depth(i: number): number {
  return i === n - 1 ? 1 : 1 + depth(i + 1);
}
try {
  depth(0);
} catch (e) {
  console.log(e instanceof RangeError); // → true
}
const seen = new Set<number>([0]);
const stack = [0];
while (stack.length > 0) {
  const u = stack.pop()!;
  for (const v of next[u]!) if (!seen.has(v)) { seen.add(v); stack.push(v); }
}
console.log(seen.size); // → 100000`,
          note: 'The call stack holds roughly 10k frames, so recursive DFS on a long chain throws "Maximum call stack size exceeded". Push nodes onto an array and loop instead.',
        },
      ],
    },
    {
      id: 'sandbox',
      label: 'Sandbox',
      intro:
        'How your code runs in this app. It is plain TypeScript in a browser worker, with a few rules worth knowing before you hit Run.',
      entries: [
        {
          title: 'Tests call your top-level functions and classes',
          code: String.raw`// Your code: declare what the question asks for at the top level.
class KVStore {
  private data = new Map<string, string>();
  set(k: string, v: string): void { this.data.set(k, v); }
  get(k: string): string | undefined { return this.data.get(k); }
}
// A test then does something like this:
const kv = new KVStore();
kv.set('a', '1');
console.log(kv.get('a'), kv.get('b')); // → 1 undefined`,
          note: 'Keep the exact names and signatures from the question. Tests run in order, each in a fresh scope, but they share your top-level code.',
        },
        {
          title: 'Types are stripped, not checked',
          code: String.raw`const add = (a: number, b: number) => a + b;
const fromInput = '1' as unknown as number;
console.log(add(fromInput, 2)); // → 12`,
          note: 'Type annotations are removed before running, so a type error never stops a run and wrong types misbehave at run time. Enums and parameter properties still work.',
        },
        {
          title: 'console.log goes to the Console tab',
          code: String.raw`console.log('state', { size: 2 }, [1, 2], new Map([['k', 1]])); // → state {"size": 2} [1, 2] Map{"k" => 1}
console.warn('warnings show too'); // → warnings show too`,
          note: 'Strings print as-is and everything else is formatted, Maps and Sets included. Logs are capped, so do not print inside a hot loop.',
        },
        {
          title: 'Cmd/Ctrl+Enter runs the tests',
          code: String.raw`// Press Cmd+Enter (Mac) or Ctrl+Enter to run every test.
// Print intermediate state to see why one fails:
function lowestFreeSlot(used: Set<number>): number {
  let i = 0;
  while (used.has(i)) i++;
  console.log('checked up to', i);
  return i;
}
console.log(lowestFreeSlot(new Set([0, 1, 3])));
// → checked up to 2
// → 2`,
          note: 'Run early and often: a passing first test confirms your names and signatures before you build the rest.',
        },
        {
          title: 'Infinite loops are stopped after 5 s',
          code: String.raw`let steps = 0;
while (true) {
  steps++;
  if (steps > 1000) break; // without an exit, the run is stopped after 5 s
}
console.log(steps); // → 1001`,
          note: 'A synchronous hang is killed after 5 s with no progress and the remaining tests are not run. An async test whose promise never settles times out on its own after a few seconds.',
        },
        {
          title: 'Imports load from esm.sh',
          code: String.raw`import { sortBy } from 'lodash-es';
import { MinPriorityQueue } from '@datastructures-js/priority-queue';
// Imports go at the top; packages are fetched before the tests start.
const pq = new MinPriorityQueue<number>();
pq.enqueue(3);
pq.enqueue(1);
console.log(sortBy([3, 1, 2]), pq.dequeue()); // → [1, 2, 3] 1`,
          note: 'Import any npm package by name, optionally pinned (lodash-es@4.17.21). There are no local files, node: built-ins, or dynamic import().',
          run: false,
        },
        {
          title: 'export is optional',
          code: String.raw`export function solve(n: number): number {
  return n + 1;
}
// The same function without export works exactly the same here.`,
          note: 'Paste code with or without export; tests see your top-level declarations either way.',
          run: false,
        },
      ],
    },
  ],
};
