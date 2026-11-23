import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'lru-cache-ttl',
  title: 'LRU Cache with TTL',
  difficulty: 'medium',
  tags: ['design', 'hash map', 'linked list'],
  summary:
    'An O(1) LRU cache, then per-key expiry on an injected clock, then a memoize helper with stats.',
  companies: ['google', 'meta', 'amazon', 'microsoft', 'netflix', 'anthropic'],
  sources: [
    'https://www.finalroundai.com/articles/lru-cache-interview',
    'https://jobsmoi.com/question/netflix/auto-expire-cache',
    'https://leetcode.com/problems/lru-cache/',
  ],
  prompt: `Build an in-memory cache that holds at most \`capacity\` entries and throws out the least recently used one when it runs out of room.

\`\`\`ts
class LRUCache<K, V> {
  constructor(capacity: number)        // capacity >= 1
  get(key: K): V | null                // value, or null on a miss
  put(key: K, value: V): void
}
\`\`\`

- \`get\` and \`put\` must both be **O(1)**.
- A \`get\` hit and any \`put\` make that key the most recently used.
- \`put\` on a key that is already cached replaces its value; it never evicts.

\`\`\`ts
const c = new LRUCache<string, number>(2);
c.put('a', 1); c.put('b', 2);
c.get('a');      // 1, so 'b' is now least recently used
c.put('c', 3);   // evicts 'b'
c.get('b');      // null
\`\`\``,
  starter: `class LRUCache<K, V> {
  constructor(private capacity: number) {}

  get(key: K): V | null {
    // TODO
    return null;
  }

  put(key: K, value: V): void {
    // TODO
  }
}
`,
  parts: [
    {
      title: 'Part 1: Classic LRU',
      prompt:
        'Implement `get` and `put` with O(1) cost. 100k mixed operations should finish well under a second.',
      tests: [
        {
          name: 'miss returns null',
          code: String.raw`const c = new LRUCache(2);
assertEqual(c.get('nope'), null);`,
        },
        {
          name: 'put then get',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1); c.put('b', 2);
assertEqual(c.get('a'), 1);
assertEqual(c.get('b'), 2);`,
        },
        {
          name: 'evicts least recently used',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1); c.put('b', 2); c.put('c', 3);
assertEqual(c.get('a'), null, 'a evicted');
assertEqual(c.get('b'), 2);
assertEqual(c.get('c'), 3);`,
        },
        {
          name: 'get refreshes recency',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1); c.put('b', 2);
c.get('a');
c.put('c', 3);
assertEqual(c.get('b'), null, 'b evicted');
assertEqual(c.get('a'), 1);`,
        },
        {
          name: 'overwrite updates value and recency without evicting',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1); c.put('b', 2);
c.put('a', 10);
assertEqual(c.get('b'), 2, 'b still there');
c.put('c', 3);
assertEqual(c.get('a'), null, 'a was least recent after get(b)');
assertEqual(c.get('b'), 2);
assertEqual(c.get('c'), 3);`,
        },
        {
          name: 'capacity 1',
          code: String.raw`const c = new LRUCache(1);
c.put('a', 1); c.put('b', 2);
assertEqual(c.get('a'), null);
assertEqual(c.get('b'), 2);`,
        },
        {
          name: '100k operations',
          code: String.raw`const c = new LRUCache(1000);
const t0 = now();
let hits = 0;
for (let i = 0; i < 100000; i++) {
  c.put('k' + i, i);
  if (c.get('k' + (i - 1)) === i - 1) hits++;
}
assertEqual(hits, 100000 - 1, 'recent keys stay cached');
assertEqual(c.get('k0'), null, 'old keys evicted');
const ms = now() - t0;
assert(ms < 1500, 'took ' + Math.round(ms) + ' ms');`,
        },
      ],
    },
    {
      title: 'Part 2: Per-key TTL',
      prompt: `Entries can now expire. Time comes from the caller, in ms, so tests are deterministic:

\`\`\`ts
put(key: K, value: V, now?: number, ttl?: number): void   // now defaults to 0
get(key: K, now?: number): V | null
size(now?: number): number                                // live entries only
\`\`\`

- An entry put at \`now\` with \`ttl\` is expired once the clock reaches \`now + ttl\`. With no \`ttl\` it never expires.
- Reading an expired entry is a miss (and it can be dropped).
- \`put\` on an existing key resets both its value and its TTL.
- Expired entries do not count toward capacity: when a new key needs room, drop expired entries first and only evict the LRU live entry if the cache is still full.`,
      tests: [
        {
          name: 'entry expires at now + ttl',
          code: String.raw`const c = new LRUCache(5);
c.put('a', 1, 100, 50);
assertEqual(c.get('a', 149), 1, 'just before');
assertEqual(c.get('a', 150), null, 'at expiry');
assertEqual(c.get('a', 151), null, 'after');`,
        },
        {
          name: 'no ttl never expires',
          code: String.raw`const c = new LRUCache(5);
c.put('a', 1, 0);
assertEqual(c.get('a', 1e12), 1);`,
        },
        {
          name: 'put resets ttl',
          code: String.raw`const c = new LRUCache(5);
c.put('a', 1, 0, 10);
c.put('a', 2, 5, 10);
assertEqual(c.get('a', 12), 2, 'new ttl counts from 5');
assertEqual(c.get('a', 15), null);
c.put('b', 1, 0, 10);
c.put('b', 2, 5);
assertEqual(c.get('b', 1000), 2, 'put without ttl clears it');`,
        },
        {
          name: 'size counts live entries',
          code: String.raw`const c = new LRUCache(5);
c.put('a', 1, 0, 10); c.put('b', 2, 0, 20); c.put('c', 3, 0);
assertEqual(c.size(0), 3);
assertEqual(c.size(10), 2);
assertEqual(c.size(20), 1);`,
        },
        {
          name: 'expired evicted before live LRU',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1, 0);          // least recently used, but never expires
c.put('b', 2, 1, 5);       // expires at 6
c.put('c', 3, 10);
assertEqual(c.get('a', 10), 1, 'live a kept');
assertEqual(c.get('c', 10), 3);
assertEqual(c.get('b', 10), null);`,
        },
        {
          name: 'falls back to LRU when nothing expired',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1, 0, 100); c.put('b', 2, 1, 100);
c.get('a', 2);
c.put('c', 3, 3, 100);
assertEqual(c.get('b', 4), null, 'b was LRU');
assertEqual(c.get('a', 4), 1);
assertEqual(c.get('c', 4), 3);`,
        },
        {
          name: 'expired read does not refresh or count',
          code: String.raw`const c = new LRUCache(2);
c.put('a', 1, 0, 5);
assertEqual(c.get('a', 5), null);
c.put('b', 2, 6); c.put('c', 3, 7);
assertEqual(c.size(7), 2);
assertEqual(c.get('b', 8), 2);
assertEqual(c.get('c', 8), 3);`,
        },
      ],
    },
    {
      title: 'Part 3: Memoize',
      prompt: `Build a memoizer on top of your cache:

\`\`\`ts
function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  opts: { capacity: number; ttl?: number; clock?: () => number },  // clock defaults to Date.now
): ((...args: A) => R) & { stats(): { hits: number; misses: number } }
\`\`\`

- The cache key covers **all** arguments by value: \`f(1, 2)\`, \`f(12)\` and \`f('1', 2)\` are three different calls.
- Plain object and array arguments compare by JSON value, and object key order does not matter (\`{a: 1, b: 2}\` equals \`{b: 2, a: 1}\`).
- Results like \`null\`, \`0\` and \`false\` are cached like any other.
- If \`fn\` throws, nothing is cached (the call still counts as a miss).
- \`stats()\` reports cache hits and misses so far.`,
      tests: [
        {
          name: 'caches repeated calls',
          code: String.raw`let calls = 0;
const sq = memoize((n) => { calls++; return n * n; }, { capacity: 10 });
assertEqual(sq(3), 9); assertEqual(sq(3), 9); assertEqual(sq(4), 16);
assertEqual(calls, 2);
assertEqual(sq.stats(), { hits: 1, misses: 2 });`,
        },
        {
          name: 'argument boundaries and types do not collide',
          code: String.raw`const f = memoize((...args) => args.length + ':' + args.map((a) => typeof a).join(','), { capacity: 10 });
assertEqual(f(1, 2), '2:number,number');
assertEqual(f(12), '1:number');
assertEqual(f('1', 2), '2:string,number');
assertEqual(f('1,2'), '1:string');
assertEqual(f.stats(), { hits: 0, misses: 4 });`,
        },
        {
          name: 'objects compare by value, key order ignored',
          code: String.raw`let calls = 0;
const f = memoize((o) => { calls++; return o.a + o.b; }, { capacity: 10 });
assertEqual(f({ a: 1, b: 2 }), 3);
assertEqual(f({ b: 2, a: 1 }), 3);
assertEqual(f({ a: 1, b: 3 }), 4);
assertEqual(calls, 2);`,
        },
        {
          name: 'falsy results are cached',
          code: String.raw`let calls = 0;
const f = memoize((x) => { calls++; return x === 0 ? null : false; }, { capacity: 10 });
assertEqual(f(0), null); assertEqual(f(0), null);
assertEqual(f(1), false); assertEqual(f(1), false);
assertEqual(calls, 2);
assertEqual(f.stats(), { hits: 2, misses: 2 });`,
        },
        {
          name: 'ttl uses the injected clock',
          code: String.raw`let t = 0, calls = 0;
const f = memoize((x) => { calls++; return x + calls; }, { capacity: 10, ttl: 100, clock: () => t });
assertEqual(f(1), 2);
t = 99; assertEqual(f(1), 2, 'still cached');
t = 100; assertEqual(f(1), 3, 'expired, recomputed');
assertEqual(f.stats(), { hits: 1, misses: 2 });`,
        },
        {
          name: 'capacity evicts least recently used',
          code: String.raw`let calls = 0;
const f = memoize((x) => { calls++; return x; }, { capacity: 2 });
f(1); f(2); f(1); f(3);
f(1);
assertEqual(calls, 3, '1 kept');
f(2);
assertEqual(calls, 4, '2 was evicted');`,
        },
        {
          name: 'throws are not cached',
          code: String.raw`let calls = 0;
const f = memoize((x) => { calls++; if (calls === 1) throw new Error('flaky'); return x; }, { capacity: 10 });
assertThrows(() => f(5));
assertEqual(f(5), 5);
assertEqual(f(5), 5);
assertEqual(calls, 2);
assertEqual(f.stats(), { hits: 1, misses: 2 });`,
        },
      ],
    },
  ],
  solution: String.raw`class LRUCache<K, V> {
  // Map iterates in insertion order: delete + set moves a key to the end,
  // so the first key is always the least recently used. Both are O(1).
  private items = new Map<K, { value: V; expiresAt: number }>();
  // Lower bound on the earliest expiry, so purging is skipped until
  // something can actually have expired.
  private nextExpiry = Infinity;

  constructor(private capacity: number) {}

  get(key: K, now = 0): V | null {
    const entry = this.items.get(key);
    if (!entry) return null;
    this.items.delete(key);
    if (entry.expiresAt <= now) return null;
    this.items.set(key, entry);
    return entry.value;
  }

  put(key: K, value: V, now = 0, ttl?: number): void {
    const expiresAt = ttl === undefined ? Infinity : now + ttl;
    if (this.items.has(key)) {
      this.items.delete(key);
    } else if (this.items.size >= this.capacity) {
      this.purgeExpired(now);
      if (this.items.size >= this.capacity) {
        const lru = this.items.keys().next().value as K;
        this.items.delete(lru);
      }
    }
    this.items.set(key, { value, expiresAt });
    this.nextExpiry = Math.min(this.nextExpiry, expiresAt);
  }

  size(now = 0): number {
    this.purgeExpired(now);
    return this.items.size;
  }

  // A full sweep, but only when the cache is full (or size() is asked) and
  // some entry may have expired. A min-heap keyed by expiresAt with lazy
  // deletion makes this O(log n) per expired entry.
  private purgeExpired(now: number): void {
    if (this.nextExpiry > now) return;
    this.nextExpiry = Infinity;
    for (const [key, entry] of this.items) {
      if (entry.expiresAt <= now) this.items.delete(key);
      else this.nextExpiry = Math.min(this.nextExpiry, entry.expiresAt);
    }
  }
}

// JSON with object keys sorted, so {a, b} and {b, a} produce the same key.
function stableKey(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stableKey).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return '{' + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ':' + stableKey(obj[k])).join(',') + '}';
  }
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  opts: { capacity: number; ttl?: number; clock?: () => number },
): ((...args: A) => R) & { stats(): { hits: number; misses: number } } {
  // Values are boxed so a cached null is distinguishable from a miss.
  const cache = new LRUCache<string, { result: R }>(opts.capacity);
  const clock = opts.clock ?? (() => Date.now());
  let hits = 0;
  let misses = 0;
  const wrapped = (...args: A): R => {
    const key = stableKey(args);
    const t = clock();
    const box = cache.get(key, t);
    if (box) {
      hits++;
      return box.result;
    }
    misses++;
    const result = fn(...args);
    cache.put(key, { result }, t, opts.ttl);
    return result;
  };
  return Object.assign(wrapped, { stats: () => ({ hits, misses }) });
}
`,
};
