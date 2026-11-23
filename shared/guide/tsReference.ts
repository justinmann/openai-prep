import type { GuideTab } from './types';

// The "Built-ins" tab: the standard functions candidates reach for, each with
// its signature and what it does with bad input. Every `// →` result here is
// checked against real output by tests/unit/guide.test.ts, so it cannot drift.

export const tsReference: GuideTab = {
  id: 'reference',
  label: 'Built-ins',
  intro:
    'Signatures and edge cases for the standard functions you use most: what each returns for empty, invalid or out-of-range input. Every result shown is checked by running it.',
  entries: [
    // ── Numbers ──────────────────────────────────────────────────────────
    {
      title: 'parseInt(string, radix?)',
      code: String.raw`// parseInt(string: string, radix?: number): number
// Skips leading whitespace, reads digits until the first invalid character.
// Returns NaN only when there is no leading number at all.
console.log(parseInt('42', 10)); // → 42
console.log(parseInt('  42px', 10)); // → 42
console.log(parseInt('3.99', 10)); // → 3
console.log(parseInt('-0x1A')); // → -26
console.log(parseInt('px42', 10)); // → NaN
console.log(parseInt('', 10)); // → NaN
console.log(parseInt('ff', 16), parseInt('101', 2)); // → 255 5
console.log(parseInt('1e3', 10)); // → 1`,
      note: 'parseInt accepts trailing junk, so it is not a validator. Always pass a radix. Check the result with Number.isNaN.',
    },
    {
      title: 'Number(value) and unary +',
      code: String.raw`// Number(value: unknown): number   (same as +value)
// Converts the WHOLE string; any junk gives NaN. Empty or blank gives 0.
console.log(Number('42'), Number(' 42 '), +'3.5'); // → 42 42 3.5
console.log(Number('42px'), Number('abc')); // → NaN NaN
console.log(Number(''), Number('   '), Number(null)); // → 0 0 0
console.log(Number(undefined), Number('1e3'), Number('0x1A')); // → NaN 1000 26
console.log(Number(true), Number([]), Number([7])); // → 1 0 7`,
      note: 'Strict parsing: reject s.trim() === "" first, then use Number(s) and check Number.isNaN.',
    },
    {
      title: 'Strict integer parsing',
      code: String.raw`function toInt(s: string): number | null {
  if (!/^[+-]?\d+$/.test(s.trim())) return null;
  return Number(s);
}
console.log(toInt('42'), toInt(' -7 '), toInt('42px'), toInt(''), toInt('3.5')); // → 42 -7 null null null`,
      note: 'A regex plus Number is the clearest way to accept only whole integers.',
    },
    {
      title: 'parseFloat(string)',
      code: String.raw`// parseFloat(string: string): number
// Like parseInt but reads a decimal (and exponent); no radix.
console.log(parseFloat('3.14abc'), parseFloat('.5'), parseFloat('1e-3')); // → 3.14 0.5 0.001
console.log(parseFloat('abc'), parseFloat('')); // → NaN NaN`,
    },
    {
      title: 'Number.isNaN vs isNaN',
      code: String.raw`// Number.isNaN(v: unknown): boolean   true only for the NaN value itself
// isNaN(v): boolean                    converts first, so strings count
console.log(Number.isNaN(NaN), Number.isNaN('abc')); // → true false
console.log(isNaN('abc'), isNaN('')); // → true false
console.log(NaN === NaN, Object.is(NaN, NaN)); // → false true`,
      note: 'Use Number.isNaN. NaN is never equal to itself, so x === NaN is always false.',
    },
    {
      title: 'Number.isInteger / isFinite / isSafeInteger',
      code: String.raw`console.log(Number.isInteger(5), Number.isInteger(5.0), Number.isInteger(5.5)); // → true true false
console.log(Number.isInteger('5')); // → false
console.log(Number.isFinite(1 / 0), Number.isFinite('5'), isFinite('5')); // → false false true
console.log(Number.isSafeInteger(2 ** 53), Number.MAX_SAFE_INTEGER); // → false 9007199254740991`,
      note: 'The Number.* versions never convert strings. Integers above 2^53 lose precision; use BigInt.',
    },
    {
      title: 'Division, remainder and Infinity',
      code: String.raw`console.log(7 / 2, Math.trunc(7 / 2), 1 / 0, -1 / 0, 0 / 0); // → 3.5 3 Infinity -Infinity NaN
console.log(7 % 3, -7 % 3, ((-7 % 3) + 3) % 3); // → 1 -1 2
console.log(0.1 + 0.2, 0.1 + 0.2 === 0.3); // → 0.30000000000000004 false
console.log(Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON); // → true`,
      note: 'Dividing by zero never throws. % keeps the sign of the left side, so wrap negative indexes with ((i % n) + n) % n.',
    },
    {
      title: 'Rounding: Math.round / floor / ceil / trunc',
      code: String.raw`console.log(Math.round(2.5), Math.round(-2.5), Math.round(2.4)); // → 3 -2 2
console.log(Math.floor(-1.5), Math.ceil(-1.5), Math.trunc(-1.5)); // → -2 -1 -1
console.log((1.005).toFixed(2), (2.5).toFixed(0), (1234.5).toFixed(1)); // → 1.00 3 1234.5
console.log(typeof (1.5).toFixed(1)); // → string`,
      note: 'Math.round rounds halves toward +Infinity. toFixed returns a string and suffers binary rounding (1.005 → "1.00").',
    },
    {
      title: 'Math.max / min, abs, sign, random',
      code: String.raw`// Math.max(...values: number[]): number
console.log(Math.max(3, 9, 1), Math.min(3, 9, 1)); // → 9 1
console.log(Math.max(), Math.min()); // → -Infinity Infinity
console.log(Math.max(1, NaN), Math.max(...[4, 2, 8])); // → NaN 8
console.log(Math.abs(-3), Math.sign(-3), Math.sign(0), 2 ** 10); // → 3 -1 0 1024
const r = Math.floor(Math.random() * 6) + 1; // integer 1..6
console.log(r >= 1 && r <= 6); // → true`,
      note: 'With no arguments Math.max is -Infinity, a trap for empty arrays. Spreading very large arrays (100k+) can overflow the stack; use reduce.',
    },
    {
      title: 'Number to string',
      code: String.raw`console.log(String(255), (255).toString(16), (5).toString(2)); // → 255 ff 101
console.log((7).toString().padStart(3, '0'), (1234567.891).toLocaleString('en-US')); // → 007 1,234,567.891
console.log(String(1e21), String(-0), (0.000001).toString()); // → 1e+21 0 0.000001`,
    },
    // ── Strings ──────────────────────────────────────────────────────────
    {
      title: 'split(separator, limit?)',
      code: String.raw`// split(separator: string | RegExp, limit?: number): string[]
console.log('a,b,,c'.split(',')); // → ["a", "b", "", "c"]
console.log(''.split(','), ''.split('')); // → [""] []
console.log('abc'.split(''), 'a b  c'.split(/\s+/)); // → ["a", "b", "c"] ["a", "b", "c"]
console.log('a=b=c'.split('=', 2)); // → ["a", "b"]`,
      note: 'Splitting an empty string gives [""], not []. Filter out empty parts when the input may have doubled separators.',
    },
    {
      title: 'indexOf / includes / startsWith',
      code: String.raw`// indexOf(search: string, from?: number): number   -1 when missing
console.log('banana'.indexOf('an'), 'banana'.indexOf('an', 2), 'banana'.indexOf('x')); // → 1 3 -1
console.log('banana'.lastIndexOf('a'), 'banana'.includes('nan')); // → 5 true
console.log('banana'.startsWith('ba'), 'banana'.endsWith('na'), 'banana'.startsWith('na', 2)); // → true true true
console.log('abc'.indexOf('')); // → 0`,
    },
    {
      title: 'replace / replaceAll',
      code: String.raw`// replace(pattern, replacement): string   a string pattern replaces only the first match
console.log('a-b-c'.replace('-', '+'), 'a-b-c'.replaceAll('-', '+')); // → a+b-c a+b+c
console.log('a-b-c'.replace(/-/g, '+')); // → a+b+c
console.log('2026-11-23'.replace(/(\d+)-(\d+)-(\d+)/, '$3/$2/$1')); // → 23/11/2026
console.log('x'.replace('x', '$&$&')); // → xx`,
      note: 'In replacement strings $& means "the match" and $1 a group. Pass a function to insert text literally.',
    },
    {
      title: 'trim, pad, repeat, case',
      code: String.raw`console.log(JSON.stringify('  hi  '.trim()), JSON.stringify('  hi'.trimStart())); // → "hi" "hi"
console.log('5'.padStart(3, '0'), 'ab'.padEnd(5, '.'), 'abc'.padStart(2)); // → 005 ab... abc
console.log('ab'.repeat(3), JSON.stringify('x'.repeat(0))); // → ababab ""
console.log('Straße'.toUpperCase(), 'ÀB'.toLowerCase()); // → STRASSE àb`,
    },
    {
      title: 'Characters and char codes',
      code: String.raw`console.log('A'.charCodeAt(0), String.fromCharCode(97), 'abc'.charCodeAt(9)); // → 65 a NaN
console.log('z'.charCodeAt(0) - 'a'.charCodeAt(0)); // → 25
console.log('😀'.length, [...'😀'].length, '😀'.codePointAt(0)); // → 2 1 128512
console.log('abc'.charAt(9) === '', 'abc'[9]); // → true undefined`,
      note: 'length counts UTF-16 units, so emoji count as 2. Use [...s] to iterate real characters.',
    },
    {
      title: 'Comparing and sorting strings',
      code: String.raw`console.log('a' < 'b', 'B' < 'a', '10' < '9'); // → true true true
console.log(['b', 'a', 'C'].sort(), ['b', 'a', 'C'].sort((x, y) => x.localeCompare(y))); // → ["C", "a", "b"] ["a", "b", "C"]
console.log('a'.localeCompare('b'), 'b'.localeCompare('a'), 'a'.localeCompare('a')); // → -1 1 0`,
      note: '< compares UTF-16 code units: uppercase sorts before lowercase and "10" before "9".',
    },
    // ── Arrays ───────────────────────────────────────────────────────────
    {
      title: 'push / pop / shift / unshift return values',
      code: String.raw`const a = [1, 2];
console.log(a.push(3), a.unshift(0), a); // → 3 4 [0, 1, 2, 3]
console.log(a.pop(), a.shift(), a); // → 3 0 [1, 2]
console.log([].pop(), [].shift()); // → undefined undefined`,
      note: 'push and unshift return the new length, not the array. Popping an empty array gives undefined, no error. shift is O(n); use an index for queues.',
    },
    {
      title: 'slice vs splice',
      code: String.raw`// slice(start?, end?): T[]                      copy, no mutation
// splice(start, deleteCount?, ...items): T[]      mutates, returns removed
const a = [1, 2, 3, 4, 5];
console.log(a.slice(1, 3), a.slice(-2), a.slice(9)); // → [2, 3] [4, 5] []
console.log(a.splice(1, 2), a); // → [2, 3] [1, 4, 5]
a.splice(1, 0, 9);
console.log(a); // → [1, 9, 4, 5]`,
    },
    {
      title: 'sort / toSorted',
      code: String.raw`// sort(compare?): this   MUTATES and sorts as strings by default
console.log([10, 9, 1, 100].sort()); // → [1, 10, 100, 9]
console.log([10, 9, 1, 100].sort((a, b) => a - b)); // → [1, 9, 10, 100]
const a = [3, 1, 2];
const b = a.toSorted((x, y) => y - x);
console.log(a, b); // → [3, 1, 2] [3, 2, 1]
const people = [{ n: 'b', age: 30 }, { n: 'a', age: 30 }, { n: 'c', age: 25 }];
people.sort((x, y) => x.age - y.age || x.n.localeCompare(y.n));
console.log(people.map((p) => p.n)); // → ["c", "a", "b"]`,
      note: 'Always pass a comparator for numbers. Sort is stable; chain tie-breakers with ||.',
    },
    {
      title: 'indexOf / includes / find / findIndex',
      code: String.raw`const a = [5, 12, 8, NaN];
console.log(a.indexOf(8), a.indexOf(99), a.indexOf(NaN), a.includes(NaN)); // → 2 -1 -1 true
console.log(a.find((x) => x > 10), a.find((x) => x > 100)); // → 12 undefined
console.log(a.findIndex((x) => x > 100), a.findLast((x) => x < 10)); // → -1 8
console.log([{ id: 1 }].includes({ id: 1 })); // → false`,
      note: 'find returns undefined and findIndex -1 when nothing matches. includes compares objects by reference.',
    },
    {
      title: 'map / filter / reduce',
      code: String.raw`console.log([1, 2, 3].map((x) => x * 2), [1, 2, 3, 4].filter((x) => x % 2 === 0)); // → [2, 4, 6] [2, 4]
console.log([1, 2, 3].reduce((sum, x) => sum + x, 0), [].reduce((s: number, x: number) => s + x, 0)); // → 6 0
try {
  [].reduce((s: number, x: number) => s + x);
} catch (e) {
  console.log((e as Error).name); // → TypeError
}`,
      note: 'reduce on an empty array throws unless you give an initial value. Always pass one.',
    },
    {
      title: 'every / some on empty arrays',
      code: String.raw`console.log([2, 4].every((x) => x % 2 === 0), [1, 2].some((x) => x > 1)); // → true true
console.log([].every(() => false), [].some(() => true)); // → true false`,
      note: 'every is true for an empty array (vacuous truth).',
    },
    {
      title: 'Creating arrays: Array.from, fill',
      code: String.raw`console.log(Array.from({ length: 3 }, (_, i) => i * i)); // → [0, 1, 4]
console.log(new Array(3).fill(0), Array.from('abc')); // → [0, 0, 0] ["a", "b", "c"]
const shared = new Array(2).fill([]);
shared[0]!.push(1);
console.log(shared); // → [[1], [1]]
const grid = Array.from({ length: 2 }, () => new Array(2).fill(0));
grid[0]![0] = 1;
console.log(grid); // → [[1, 0], [0, 0]]`,
      note: 'fill puts the SAME object in every slot. Build 2D grids with Array.from and a function.',
    },
    {
      title: 'flat / flatMap / concat / join',
      code: String.raw`console.log([1, [2, [3]]].flat(), [1, [2, [3]]].flat(Infinity)); // → [1, 2, [3]] [1, 2, 3]
console.log(['a b', 'c'].flatMap((s) => s.split(' '))); // → ["a", "b", "c"]
console.log([1].concat(2, [3, 4]), [1, null, 2].join('-'), [].join(',') === ''); // → [1, 2, 3, 4] 1--2 true`,
    },
    {
      title: 'reverse / at / out of range',
      code: String.raw`const a = [1, 2, 3];
console.log(a.toReversed(), a); // → [3, 2, 1] [1, 2, 3]
console.log(a.at(-1), a.at(9), a[9], a[-1]); // → 3 undefined undefined undefined
a.reverse();
console.log(a); // → [3, 2, 1]`,
      note: 'reverse mutates; toReversed copies. Negative indexes only work with at().',
    },
    // ── Objects and collections ──────────────────────────────────────────
    {
      title: 'Object.keys / values / entries order',
      code: String.raw`const o = { b: 1, 2: 'x', a: 2, 1: 'y' };
console.log(Object.keys(o)); // → ["1", "2", "b", "a"]
console.log(Object.entries({ x: 1, y: 2 })); // → [["x", 1], ["y", 2]]
console.log(Object.fromEntries([['k', 1]]), 'b' in o, o.hasOwnProperty('z')); // → {"k": 1} true false`,
      note: 'Integer-like keys come first in numeric order, then the rest in insertion order. Keys are always strings; use a Map for number keys.',
    },
    {
      title: 'Copying: spread, structuredClone',
      code: String.raw`const a = { n: 1, inner: { x: 1 } };
const shallow = { ...a };
const deep = structuredClone(a);
a.inner.x = 99;
console.log(shallow.inner.x, deep.inner.x); // → 99 1
console.log({ ...{ a: 1, b: 2 }, ...{ b: 3 } }); // → {"a": 1, "b": 3}`,
      note: 'Spread and Object.assign are shallow. structuredClone deep-copies (not functions or class methods).',
    },
    {
      title: 'Map: get on a missing key',
      code: String.raw`// get(key): V | undefined   set returns the map; delete and has return booleans
const m = new Map<string, number>([['a', 1]]);
console.log(m.get('zzz'), m.get('a') ?? 0, m.has('a'), m.size); // → undefined 1 true 1
console.log(m.set('b', 2) === m, m.delete('zzz'), m.delete('a')); // → true false true
m.set('c', (m.get('c') ?? 0) + 1);
console.log([...m.keys()], [...m]); // → ["b", "c"] [["b", 2], ["c", 1]]
const byKey = new Map<string, number>();
byKey.set([1, 2].join(','), 1);
console.log(byKey.get('1,2'), new Map([[[1, 2], 1]]).get([1, 2])); // → 1 undefined`,
      note: 'Maps keep insertion order. Object keys (like arrays) compare by reference, so join tuples into a string key.',
    },
    {
      title: 'Set operations',
      code: String.raw`const s = new Set([3, 1, 3, 2]);
console.log(s.size, s.has(3), s.add(4) === s, s.delete(9)); // → 3 true true false
console.log([...s], [...new Set('hello')].join('')); // → [3, 1, 2, 4] helo
const a = new Set([1, 2, 3]), b = new Set([2, 3, 4]);
console.log([...a].filter((x) => b.has(x)), [...new Set([...a, ...b])]); // → [2, 3] [1, 2, 3, 4]`,
    },
    {
      title: 'JSON.parse / JSON.stringify',
      code: String.raw`// JSON.parse(text: string): any        throws SyntaxError on invalid input
// JSON.stringify(value, replacer?, indent?): string | undefined
console.log(JSON.parse('{"a":[1,2]}').a, JSON.parse('42'), JSON.parse('null')); // → [1, 2] 42 null
const tryParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (e) {
    return (e as Error).name;
  }
};
console.log(tryParse('{a:1}'), tryParse(''), tryParse("{'a':1}"), tryParse('[1,]')); // → SyntaxError SyntaxError SyntaxError SyntaxError
console.log(JSON.stringify({ a: undefined, b: 1, d: new Date(0) })); // → {"b":1,"d":"1970-01-01T00:00:00.000Z"}
console.log(JSON.stringify(new Map([['a', 1]])), JSON.stringify([undefined]), JSON.stringify(undefined)); // → {} [null] undefined`,
      note: 'Wrap JSON.parse in try/catch for untrusted text. stringify drops undefined fields, turns Maps and Sets into {}, and returns undefined (not a string) for undefined.',
    },
    // ── Errors and types ─────────────────────────────────────────────────
    {
      title: 'Throwing and catching',
      code: String.raw`function parsePositive(s: string): number {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) throw new RangeError('not a positive number: ' + s);
  return n;
}
try {
  parsePositive('-3');
} catch (e) {
  console.log(e instanceof RangeError, (e as Error).message); // → true not a positive number: -3
}
try {
  (null as unknown as { x: number }).x;
} catch (e) {
  console.log((e as Error).name); // → TypeError
}`,
      note: 'In a catch block the error is typed unknown; narrow it with instanceof before reading .message.',
    },
    {
      title: 'typeof and checks',
      code: String.raw`console.log(typeof 1, typeof 'a', typeof undefined, typeof null, typeof [], typeof {}); // → number string undefined object object object
console.log(Array.isArray([]), [] instanceof Array, null ?? 'default', 0 || 'default', 0 ?? 'default'); // → true true default default 0`,
      note: 'typeof null is "object". Use ?? (not ||) for defaults so 0 and "" are kept.',
    },
  ],
};
