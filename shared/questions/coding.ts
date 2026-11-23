import type { CodingQuestion } from './types';

// Test bodies and solutions are String.raw so escapes like "\n" reach the
// evaluated JavaScript unchanged. They must not contain backticks or "${".

const kvSerialize: CodingQuestion = {
  kind: 'coding',
  id: 'kv-serialize',
  title: 'KV Store Serialize / Deserialize',
  difficulty: 'medium',
  tags: ['strings', 'encoding'],
  summary:
    'Encode a string-to-string map into one string and back, for any characters.',
  sourceUrl:
    'https://www.hellointerview.com/community/questions/kv-serialize-deserialize/cm6xw6unw00003b6qz67bpfaj',
  prompt: `You are building persistence for an in-memory key-value store whose keys and values are both strings.

Write \`serialize(data)\`, which turns a \`Record<string, string>\` into a single string, and \`deserialize(s)\`, which turns that string back into the original map.

- Keys and values may contain **any** character: delimiters like \`:\` \`,\` \`=\`, quotes, newlines, digits, emoji.
- The round trip must be exact: \`deserialize(serialize(data))\` deep-equals \`data\`.
- Empty strings and an empty map must work.
- Do not use \`JSON.stringify\` / \`JSON.parse\`; the point is to design the format.`,
  starter: `function serialize(data: Record<string, string>): string {
  // TODO
  return '';
}

function deserialize(s: string): Record<string, string> {
  // TODO
  return {};
}
`,
  parts: [
    {
      title: 'Part 1: Round trip',
      prompt:
        'Implement `serialize` and `deserialize`. Think about why a plain delimiter breaks, and what format survives arbitrary content.',
      tests: [
        {
          name: 'simple map round-trips',
          code: String.raw`const d = { name: 'John', city: 'Paris' };
assertEqual(deserialize(serialize(d)), d);`,
        },
        {
          name: 'serialize returns a string',
          code: String.raw`assertEqual(typeof serialize({ a: 'b' }), 'string');`,
        },
        {
          name: 'keys and values containing delimiters',
          code: String.raw`const d = { 'name:first': 'John:Doe', 'x,y': 'New,York', 'a=b': 'c=d;e', 'q"': "it's" };
assertEqual(deserialize(serialize(d)), d);`,
        },
        {
          name: 'newlines, tabs and unicode',
          code: String.raw`const d = { 'line\n1': 'v\r\n2', 'tab\t': '\u0000nul', 'emoji🙂': '日本語' };
assertEqual(deserialize(serialize(d)), d);`,
        },
        {
          name: 'values that look like your length prefixes',
          code: String.raw`const d = { '12': '3:4', '0:': '5:', '2:ab': '3:xyz' };
assertEqual(deserialize(serialize(d)), d);`,
        },
        {
          name: 'empty strings',
          code: String.raw`const d = { '': 'x', a: '' };
assertEqual(deserialize(serialize(d)), d);
assertEqual(deserialize(serialize({ k: '' })), { k: '' });`,
        },
        {
          name: 'empty map',
          code: String.raw`assertEqual(deserialize(serialize({})), {});`,
        },
        {
          name: 'fuzz: 300 random entries',
          code: String.raw`const alphabet = 'ab:,=;"\'\n\\0123456789 🙂';
let seed = 7;
const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
const word = () => { let s = ''; const len = rand(12); for (let i = 0; i < len; i++) s += alphabet[rand(alphabet.length)]; return s; };
const d = {};
for (let i = 0; i < 300; i++) d[word() + i] = word();
assertEqual(deserialize(serialize(d)), d);`,
        },
      ],
    },
    {
      title: 'Part 2: Chunked persistence',
      prompt: `The store is now too big to write as one blob. Implement:

\`\`\`ts
function saveChunked(data: Record<string, string>, chunkSize: number, store: Map<string, string>): void
function loadChunked(store: Map<string, string>): Record<string, string>
\`\`\`

- Split the serialized data into chunks of **at most** \`chunkSize\` characters, stored under keys \`chunk_0\`, \`chunk_1\`, ...
- Write a metadata entry under the key \`meta\` that tells \`loadChunked\` how many chunks to read (its format is up to you).
- \`meta\` must be written **last**: it acts as a commit marker, so a crash mid-save never leaves metadata pointing at chunks that do not exist.
- \`loadChunked\` on a store with no \`meta\` returns \`{}\`.`,
      tests: [
        {
          name: 'round-trips through chunks',
          code: String.raw`const store = new Map();
const d = { alpha: 'x'.repeat(50), 'b:c': 'line\nbreak', '': '' };
saveChunked(d, 16, store);
assertEqual(loadChunked(store), d);`,
        },
        {
          name: 'every chunk respects chunkSize',
          code: String.raw`const store = new Map();
const d = {};
for (let i = 0; i < 40; i++) d['key' + i] = 'value:' + i;
saveChunked(d, 10, store);
let count = 0;
for (const [k, v] of store) {
  if (k === 'meta') continue;
  assert(/^chunk_\d+$/.test(k), 'unexpected key ' + k);
  assert(v.length <= 10, k + ' has length ' + v.length);
  count++;
}
assert(count > 1, 'expected several chunks, got ' + count);
assertEqual(loadChunked(store), d);`,
        },
        {
          name: 'meta is written last',
          code: String.raw`const order = [];
const store = new Map();
const origSet = store.set.bind(store);
store.set = (k, v) => { order.push(k); return origSet(k, v); };
saveChunked({ a: 'b'.repeat(30) }, 8, store);
assert(order.length > 1, 'expected chunk writes before meta');
assertEqual(order[order.length - 1], 'meta', 'last write');`,
        },
        {
          name: 'no meta means empty',
          code: String.raw`const store = new Map([['chunk_0', 'garbage']]);
assertEqual(loadChunked(store), {});`,
        },
        {
          name: 'empty map round-trips',
          code: String.raw`const store = new Map();
saveChunked({}, 4, store);
assertEqual(loadChunked(store), {});`,
        },
      ],
    },
  ],
  solution: String.raw`// Length-prefixed encoding: <len>:<chars> for every key and value.
function serialize(data: Record<string, string>): string {
  let out = '';
  for (const [k, v] of Object.entries(data)) {
    out += k.length + ':' + k + v.length + ':' + v;
  }
  return out;
}

function deserialize(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  let pos = 0;
  const read = (): string => {
    const colon = s.indexOf(':', pos);
    if (colon === -1) throw new Error('malformed input at ' + pos);
    const len = Number(s.slice(pos, colon));
    if (!Number.isInteger(len) || len < 0) throw new Error('bad length at ' + pos);
    const start = colon + 1;
    if (start + len > s.length) throw new Error('truncated input');
    pos = start + len;
    return s.slice(start, pos);
  };
  while (pos < s.length) {
    const key = read();
    out[key] = read();
  }
  return out;
}

function saveChunked(data: Record<string, string>, chunkSize: number, store: Map<string, string>): void {
  const s = serialize(data);
  let n = 0;
  for (let i = 0; i < s.length; i += chunkSize) {
    store.set('chunk_' + n, s.slice(i, i + chunkSize));
    n++;
  }
  store.set('meta', String(n)); // commit marker goes last
}

function loadChunked(store: Map<string, string>): Record<string, string> {
  const meta = store.get('meta');
  if (meta === undefined) return {};
  let s = '';
  for (let i = 0; i < Number(meta); i++) {
    const chunk = store.get('chunk_' + i);
    if (chunk === undefined) throw new Error('missing chunk ' + i);
    s += chunk;
  }
  return deserialize(s);
}
`,
};

const versionedKv: CodingQuestion = {
  kind: 'coding',
  id: 'versioned-kv',
  title: 'Time-Versioned KV Store',
  difficulty: 'medium',
  tags: ['binary search', 'design'],
  summary:
    'A key-value store that can answer "what was this value at time t?".',
  prompt: `Implement a key-value store that keeps every version of a value.

\`\`\`ts
class VersionedKV {
  set(key: string, value: string, timestamp: number): void
  get(key: string, timestamp?: number): string | null
}
\`\`\`

- \`get(key, t)\` returns the value set at the largest timestamp **<= t**, or \`null\` if there is none.
- \`get(key)\` with no timestamp returns the latest value.
- Setting the same key at the same timestamp overwrites that version.`,
  starter: `class VersionedKV {
  set(key: string, value: string, timestamp: number): void {
    // TODO
  }

  get(key: string, timestamp?: number): string | null {
    // TODO
    return null;
  }
}
`,
  parts: [
    {
      title: 'Part 1: In-order writes',
      prompt: 'Timestamps for a key arrive in increasing order.',
      tests: [
        {
          name: 'latest value without timestamp',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', '1', 10); kv.set('a', '2', 20);
assertEqual(kv.get('a'), '2');`,
        },
        {
          name: 'point-in-time reads',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', '1', 10); kv.set('a', '2', 20); kv.set('a', '3', 30);
assertEqual(kv.get('a', 5), null, 'before first write');
assertEqual(kv.get('a', 10), '1', 'exact');
assertEqual(kv.get('a', 25), '2', 'between');
assertEqual(kv.get('a', 1000), '3', 'after last');`,
        },
        {
          name: 'missing key',
          code: String.raw`const kv = new VersionedKV();
assertEqual(kv.get('nope'), null);
assertEqual(kv.get('nope', 5), null);`,
        },
        {
          name: 'keys are independent',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', 'x', 1); kv.set('b', 'y', 2);
assertEqual(kv.get('a', 2), 'x');
assertEqual(kv.get('b', 1), null);`,
        },
        {
          name: 'same timestamp overwrites',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', 'old', 5); kv.set('a', 'new', 5);
assertEqual(kv.get('a', 5), 'new');`,
        },
      ],
    },
    {
      title: 'Part 2: Out-of-order writes and deletes',
      prompt: `Writes can now arrive with **any** timestamp order (replication lag). Also add:

\`\`\`ts
delete(key: string, timestamp: number): void
\`\`\`

A delete is a tombstone: reads at or after it return \`null\` until a later \`set\`.`,
      tests: [
        {
          name: 'out-of-order sets',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', '3', 30); kv.set('a', '1', 10); kv.set('a', '2', 20);
assertEqual(kv.get('a', 15), '1');
assertEqual(kv.get('a', 25), '2');
assertEqual(kv.get('a'), '3');`,
        },
        {
          name: 'delete hides older versions',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', '1', 10); kv.delete('a', 20); kv.set('a', '3', 30);
assertEqual(kv.get('a', 15), '1');
assertEqual(kv.get('a', 20), null);
assertEqual(kv.get('a', 25), null);
assertEqual(kv.get('a', 30), '3');`,
        },
        {
          name: 'latest read after delete',
          code: String.raw`const kv = new VersionedKV();
kv.set('a', '1', 10); kv.delete('a', 20);
assertEqual(kv.get('a'), null);`,
        },
      ],
    },
    {
      title: 'Part 3: Scale',
      prompt:
        'Reads must be `O(log n)` per key. 100k writes and 100k reads should finish well under a second.',
      tests: [
        {
          name: '100k writes + 100k reads',
          code: String.raw`const kv = new VersionedKV();
const t0 = now();
for (let i = 0; i < 100000; i++) kv.set('hot', 'v' + i, i * 2);
for (let i = 0; i < 100000; i++) {
  const got = kv.get('hot', i * 2 + 1);
  if (got !== 'v' + i) throw new Error('at ' + i + ' got ' + got);
}
const ms = now() - t0;
assert(ms < 1500, 'took ' + Math.round(ms) + ' ms');`,
        },
      ],
    },
  ],
  solution: String.raw`type Version = { ts: number; value: string | null };

class VersionedKV {
  private versions = new Map<string, Version[]>();

  set(key: string, value: string, timestamp: number): void {
    this.put(key, value, timestamp);
  }

  delete(key: string, timestamp: number): void {
    this.put(key, null, timestamp);
  }

  get(key: string, timestamp?: number): string | null {
    const list = this.versions.get(key);
    if (!list || list.length === 0) return null;
    if (timestamp === undefined) return list[list.length - 1]!.value;
    const i = this.lastAtOrBefore(list, timestamp);
    return i === -1 ? null : list[i]!.value;
  }

  private put(key: string, value: string | null, ts: number): void {
    let list = this.versions.get(key);
    if (!list) this.versions.set(key, (list = []));
    // Fast path for in-order writes.
    if (list.length === 0 || list[list.length - 1]!.ts < ts) {
      list.push({ ts, value });
      return;
    }
    const i = this.lastAtOrBefore(list, ts);
    if (i !== -1 && list[i]!.ts === ts) list[i]!.value = value;
    else list.splice(i + 1, 0, { ts, value });
  }

  // Index of the last version with ts <= t, or -1.
  private lastAtOrBefore(list: Version[], t: number): number {
    let lo = 0, hi = list.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid]!.ts <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  }
}
`,
};

const resumableIterator: CodingQuestion = {
  kind: 'coding',
  id: 'resumable-iterator',
  title: 'Resumable Iterator',
  difficulty: 'medium',
  tags: ['iterators', 'state', 'async'],
  summary:
    'Iterators whose position can be saved and restored, from lists up to paged async sources.',
  prompt: `Long-running jobs get preempted. Build iterators that can checkpoint their position and resume from it.

Every iterator exposes \`getState()\`, returning a **JSON-serializable** snapshot, and \`setState(state)\`, which restores a snapshot taken from an iterator over the same data. Tests round-trip state through \`JSON.stringify\` / \`JSON.parse\`.`,
  starter: `class ListIterator<T> {
  constructor(private items: T[]) {}

  hasNext(): boolean {
    // TODO
    return false;
  }

  next(): T {
    // TODO: throw when exhausted
    throw new Error('not implemented');
  }

  getState(): unknown {
    // TODO
    return null;
  }

  setState(state: unknown): void {
    // TODO
  }
}
`,
  parts: [
    {
      title: 'Part 1: ListIterator',
      prompt:
        'Implement `ListIterator<T>` over an array. `next()` throws when exhausted.',
      tests: [
        {
          name: 'iterates in order',
          code: String.raw`const it = new ListIterator([1, 2, 3]);
const out = [];
while (it.hasNext()) out.push(it.next());
assertEqual(out, [1, 2, 3]);`,
        },
        {
          name: 'next() throws when exhausted',
          code: String.raw`const it = new ListIterator([]);
assertEqual(it.hasNext(), false);
assertThrows(() => it.next());`,
        },
        {
          name: 'resume from a checkpoint',
          code: String.raw`const it = new ListIterator(['a', 'b', 'c', 'd']);
it.next(); it.next();
const saved = JSON.parse(JSON.stringify(it.getState()));
const fresh = new ListIterator(['a', 'b', 'c', 'd']);
fresh.setState(saved);
assertEqual(fresh.next(), 'c');
assertEqual(fresh.next(), 'd');
assertEqual(fresh.hasNext(), false);`,
        },
        {
          name: 'rewind to an earlier state',
          code: String.raw`const it = new ListIterator([1, 2, 3]);
const start = JSON.parse(JSON.stringify(it.getState()));
it.next(); it.next();
it.setState(start);
assertEqual(it.next(), 1);`,
        },
      ],
    },
    {
      title: 'Part 2: MultiListIterator',
      prompt: `Implement \`MultiListIterator<T>\`, constructed with \`T[][]\`, that yields every element of every list in order, skipping empty lists, with the same four methods.`,
      tests: [
        {
          name: 'flattens and skips empties',
          code: String.raw`const it = new MultiListIterator([[], [1, 2], [], [], [3], []]);
const out = [];
while (it.hasNext()) out.push(it.next());
assertEqual(out, [1, 2, 3]);`,
        },
        {
          name: 'all empty',
          code: String.raw`const it = new MultiListIterator([[], []]);
assertEqual(it.hasNext(), false);
assertThrows(() => it.next());`,
        },
        {
          name: 'checkpoint across list boundaries',
          code: String.raw`const data = [[1], [], [2, 3], [4]];
const it = new MultiListIterator(data);
const seen = [];
const states = [];
while (it.hasNext()) { states.push(JSON.parse(JSON.stringify(it.getState()))); seen.push(it.next()); }
for (let i = 0; i < states.length; i++) {
  const r = new MultiListIterator(data);
  r.setState(states[i]);
  const rest = [];
  while (r.hasNext()) rest.push(r.next());
  assertEqual(rest, seen.slice(i), 'resume at ' + i);
}`,
        },
      ],
    },
    {
      title: 'Part 3: Async paged source',
      prompt: `Data now comes from a paged API:

\`\`\`ts
type Page<T> = { items: T[]; nextToken: string | null };
type FetchPage<T> = (token: string | null) => Promise<Page<T>>;
\`\`\`

Implement \`PagedIterator<T>\` with \`constructor(fetchPage)\`, \`next(): Promise<{ done: boolean; value?: T }>\`, \`getState()\` and \`setState(state)\`.

- The first call fetches page \`null\`. Pages may be empty but still have a \`nextToken\`.
- Do not refetch a page you are partway through unless you were restored from state.
- Resuming from state must not re-fetch earlier pages: only the page you were on and the ones after it.`,
      tests: [
        {
          name: 'iterates all pages, skipping empty ones',
          code: String.raw`const pages = { start: { items: [1, 2], nextToken: 'p2' }, p2: { items: [], nextToken: 'p3' }, p3: { items: [3], nextToken: null } };
const fetchPage = async (t) => { await sleep(1); return pages[t === null ? 'start' : t]; };
const it = new PagedIterator(fetchPage);
const out = [];
for (;;) { const r = await it.next(); if (r.done) break; out.push(r.value); }
assertEqual(out, [1, 2, 3]);`,
        },
        {
          name: 'fetches each page once',
          code: String.raw`const pages = { start: { items: [1, 2, 3], nextToken: 'b' }, b: { items: [4], nextToken: null } };
const calls = [];
const fetchPage = async (t) => { calls.push(t); return pages[t === null ? 'start' : t]; };
const it = new PagedIterator(fetchPage);
for (;;) { const r = await it.next(); if (r.done) break; }
assertEqual(calls, [null, 'b']);`,
        },
        {
          name: 'resume mid-page without refetching earlier pages',
          code: String.raw`const pages = { start: { items: ['a', 'b'], nextToken: 'p2' }, p2: { items: ['c', 'd', 'e'], nextToken: null } };
const it = new PagedIterator(async (t) => pages[t === null ? 'start' : t]);
await it.next(); await it.next(); await it.next(); // a b c
const saved = JSON.parse(JSON.stringify(it.getState()));
const calls = [];
const resumed = new PagedIterator(async (t) => { calls.push(t); return pages[t === null ? 'start' : t]; });
resumed.setState(saved);
const out = [];
for (;;) { const r = await resumed.next(); if (r.done) break; out.push(r.value); }
assertEqual(out, ['d', 'e']);
assert(!calls.includes(null), 'refetched the first page: ' + JSON.stringify(calls));`,
        },
      ],
    },
  ],
  solution: String.raw`class ListIterator<T> {
  private i = 0;
  constructor(private items: T[]) {}
  hasNext(): boolean { return this.i < this.items.length; }
  next(): T {
    if (!this.hasNext()) throw new Error('exhausted');
    return this.items[this.i++]!;
  }
  getState(): { i: number } { return { i: this.i }; }
  setState(state: unknown): void { this.i = (state as { i: number }).i; }
}

class MultiListIterator<T> {
  private list = 0;
  private idx = 0;
  constructor(private lists: T[][]) { this.skip(); }
  private skip(): void {
    while (this.list < this.lists.length && this.idx >= this.lists[this.list]!.length) {
      this.list++;
      this.idx = 0;
    }
  }
  hasNext(): boolean { return this.list < this.lists.length; }
  next(): T {
    if (!this.hasNext()) throw new Error('exhausted');
    const v = this.lists[this.list]![this.idx++]!;
    this.skip();
    return v;
  }
  getState(): { list: number; idx: number } { return { list: this.list, idx: this.idx }; }
  setState(state: unknown): void {
    const s = state as { list: number; idx: number };
    this.list = s.list;
    this.idx = s.idx;
    this.skip();
  }
}

type Page<T> = { items: T[]; nextToken: string | null };

class PagedIterator<T> {
  // token of the page we are on, the page if loaded, and our offset in it
  private token: string | null = null;
  private page: Page<T> | null = null;
  private offset = 0;
  constructor(private fetchPage: (token: string | null) => Promise<Page<T>>) {}

  async next(): Promise<{ done: boolean; value?: T }> {
    for (;;) {
      if (!this.page) this.page = await this.fetchPage(this.token);
      if (this.offset < this.page.items.length) {
        return { done: false, value: this.page.items[this.offset++]! };
      }
      if (this.page.nextToken === null) return { done: true };
      this.token = this.page.nextToken;
      this.page = null;
      this.offset = 0;
    }
  }

  getState(): { token: string | null; offset: number } {
    return { token: this.token, offset: this.offset };
  }

  setState(state: unknown): void {
    const s = state as { token: string | null; offset: number };
    this.token = s.token;
    this.offset = s.offset;
    this.page = null;
  }
}
`,
};

const inMemoryDb: CodingQuestion = {
  kind: 'coding',
  id: 'in-memory-db',
  title: 'In-Memory Database',
  difficulty: 'medium',
  tags: ['design', 'sorting'],
  summary:
    'Tables, inserts and a small query API with filters, multi-column ordering and projection.',
  prompt: `Build a tiny in-memory database.

\`\`\`ts
type Value = string | number;
type Row = Record<string, Value>;

class Database {
  createTable(name: string, columns: string[]): void
  insert(table: string, row: Row): void
  select(table: string, query?: Query): Row[]
}
\`\`\`

Return copies of rows, so callers cannot mutate stored data.`,
  starter: `type Value = string | number;
type Row = Record<string, Value>;

type Query = {
  where?: { column: string; op: '=' | '<' | '>'; value: Value }[];
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
  columns?: string[];
};

class Database {
  createTable(name: string, columns: string[]): void {
    // TODO
  }

  insert(table: string, row: Row): void {
    // TODO
  }

  select(table: string, query: Query = {}): Row[] {
    // TODO
    return [];
  }
}
`,
  parts: [
    {
      title: 'Part 1: Tables and inserts',
      prompt: `- \`select(table)\` returns every row in insertion order.
- Throw on: an unknown table, creating a table that exists, or inserting a column the table does not have. A row may omit columns.`,
      tests: [
        {
          name: 'insert then select all',
          code: String.raw`const db = new Database();
db.createTable('users', ['id', 'name']);
db.insert('users', { id: 1, name: 'ada' });
db.insert('users', { id: 2, name: 'bob' });
assertEqual(db.select('users'), [{ id: 1, name: 'ada' }, { id: 2, name: 'bob' }]);`,
        },
        {
          name: 'validation errors',
          code: String.raw`const db = new Database();
db.createTable('t', ['a']);
assertThrows(() => db.createTable('t', ['a']), 'duplicate table');
assertThrows(() => db.insert('missing', { a: 1 }), 'unknown table');
assertThrows(() => db.insert('t', { b: 1 }), 'unknown column');
assertThrows(() => db.select('missing'), 'select unknown table');`,
        },
        {
          name: 'returned rows are copies',
          code: String.raw`const db = new Database();
db.createTable('t', ['a']);
db.insert('t', { a: 1 });
db.select('t')[0].a = 99;
assertEqual(db.select('t'), [{ a: 1 }]);`,
        },
      ],
    },
    {
      title: 'Part 2: WHERE',
      prompt:
        '`where` is a list of conditions that must **all** hold. A row missing the column never matches. Filtering on an unknown column throws.',
      tests: [
        {
          name: 'single and combined conditions',
          code: String.raw`const db = new Database();
db.createTable('p', ['name', 'age', 'city']);
db.insert('p', { name: 'a', age: 30, city: 'sf' });
db.insert('p', { name: 'b', age: 25, city: 'ny' });
db.insert('p', { name: 'c', age: 35, city: 'sf' });
db.insert('p', { name: 'd', city: 'sf' });
assertEqual(db.select('p', { where: [{ column: 'city', op: '=', value: 'sf' }] }).map(r => r.name), ['a', 'c', 'd']);
assertEqual(db.select('p', { where: [{ column: 'city', op: '=', value: 'sf' }, { column: 'age', op: '>', value: 30 }] }).map(r => r.name), ['c']);
assertEqual(db.select('p', { where: [{ column: 'age', op: '<', value: 31 }] }).map(r => r.name), ['a', 'b']);`,
        },
        {
          name: 'unknown column in where throws',
          code: String.raw`const db = new Database();
db.createTable('t', ['a']);
assertThrows(() => db.select('t', { where: [{ column: 'zz', op: '=', value: 1 }] }));`,
        },
      ],
    },
    {
      title: 'Part 3: ORDER BY and projection',
      prompt: `- \`orderBy\` sorts by the first column, breaking ties with the next, and so on. Ties after all columns keep insertion order. Missing values sort first ascending.
- \`columns\` returns only those columns (unknown column throws).`,
      tests: [
        {
          name: 'multi-column order',
          code: String.raw`const db = new Database();
db.createTable('p', ['name', 'team', 'score']);
db.insert('p', { name: 'a', team: 'x', score: 3 });
db.insert('p', { name: 'b', team: 'y', score: 5 });
db.insert('p', { name: 'c', team: 'x', score: 9 });
db.insert('p', { name: 'd', team: 'y', score: 5 });
const rows = db.select('p', { orderBy: [{ column: 'team', direction: 'asc' }, { column: 'score', direction: 'desc' }] });
assertEqual(rows.map(r => r.name), ['c', 'a', 'b', 'd']);`,
        },
        {
          name: 'numbers sort numerically',
          code: String.raw`const db = new Database();
db.createTable('t', ['n']);
for (const n of [10, 9, 100, 1]) db.insert('t', { n });
assertEqual(db.select('t', { orderBy: [{ column: 'n', direction: 'asc' }] }).map(r => r.n), [1, 9, 10, 100]);`,
        },
        {
          name: 'where + order + projection together',
          code: String.raw`const db = new Database();
db.createTable('p', ['name', 'age']);
db.insert('p', { name: 'a', age: 40 });
db.insert('p', { name: 'b', age: 20 });
db.insert('p', { name: 'c', age: 30 });
const rows = db.select('p', { where: [{ column: 'age', op: '>', value: 25 }], orderBy: [{ column: 'age', direction: 'asc' }], columns: ['name'] });
assertEqual(rows, [{ name: 'c' }, { name: 'a' }]);
assertThrows(() => db.select('p', { columns: ['nope'] }));`,
        },
      ],
    },
  ],
  solution: String.raw`type Value = string | number;
type Row = Record<string, Value>;
type Query = {
  where?: { column: string; op: '=' | '<' | '>'; value: Value }[];
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
  columns?: string[];
};

class Database {
  private tables = new Map<string, { columns: Set<string>; rows: Row[] }>();

  createTable(name: string, columns: string[]): void {
    if (this.tables.has(name)) throw new Error('table exists: ' + name);
    this.tables.set(name, { columns: new Set(columns), rows: [] });
  }

  insert(table: string, row: Row): void {
    const t = this.table(table);
    for (const c of Object.keys(row)) this.check(t.columns, c);
    t.rows.push({ ...row });
  }

  select(table: string, query: Query = {}): Row[] {
    const t = this.table(table);
    let rows = t.rows;
    for (const w of query.where ?? []) {
      this.check(t.columns, w.column);
      rows = rows.filter((r) => {
        const v = r[w.column];
        if (v === undefined) return false;
        return w.op === '=' ? v === w.value : w.op === '<' ? v < w.value : v > w.value;
      });
    }
    const order = query.orderBy ?? [];
    for (const o of order) this.check(t.columns, o.column);
    if (order.length) {
      rows = rows
        .map((r, i) => ({ r, i }))
        .sort((a, b) => {
          for (const o of order) {
            const c = compare(a.r[o.column], b.r[o.column]);
            if (c !== 0) return o.direction === 'asc' ? c : -c;
          }
          return a.i - b.i;
        })
        .map((x) => x.r);
    }
    const cols = query.columns;
    if (cols) for (const c of cols) this.check(t.columns, c);
    return rows.map((r) => {
      if (!cols) return { ...r };
      const out: Row = {};
      for (const c of cols) if (r[c] !== undefined) out[c] = r[c]!;
      return out;
    });
  }

  private table(name: string) {
    const t = this.tables.get(name);
    if (!t) throw new Error('unknown table: ' + name);
    return t;
  }

  private check(columns: Set<string>, c: string): void {
    if (!columns.has(c)) throw new Error('unknown column: ' + c);
  }
}

function compare(a: Value | undefined, b: Value | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  return a < b ? -1 : 1;
}
`,
};

const spreadsheet: CodingQuestion = {
  kind: 'coding',
  id: 'spreadsheet',
  title: 'Spreadsheet with Formulas',
  difficulty: 'hard',
  tags: ['graphs', 'parsing'],
  summary:
    'Cells that hold numbers or formulas referencing other cells, with cycle detection and ranges.',
  prompt: `Implement a spreadsheet.

\`\`\`ts
class Spreadsheet {
  setCell(cell: string, value: string): void
  getCell(cell: string): number
}
\`\`\`

Cells are named like \`A1\`, \`B12\`, \`AA3\`. A value is either an integer literal (\`"42"\`, \`"-3"\`) or a formula starting with \`=\` that adds integers and cell references: \`"=A1+B2+10"\`. An empty cell is \`0\`.`,
  starter: `class Spreadsheet {
  setCell(cell: string, value: string): void {
    // TODO
  }

  getCell(cell: string): number {
    // TODO
    return 0;
  }
}
`,
  parts: [
    {
      title: 'Part 1: Values and formulas',
      prompt: 'Support literals and `+` formulas. Updates must flow through.',
      tests: [
        {
          name: 'literals and empty cells',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '5');
assertEqual(s.getCell('A1'), 5);
assertEqual(s.getCell('Z99'), 0);`,
        },
        {
          name: 'formula with refs and constants',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '5'); s.setCell('B1', '7');
s.setCell('C1', '=A1+B1+10');
assertEqual(s.getCell('C1'), 22);`,
        },
        {
          name: 'changes propagate through chains',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '1');
s.setCell('B1', '=A1+1');
s.setCell('C1', '=B1+B1');
assertEqual(s.getCell('C1'), 4);
s.setCell('A1', '10');
assertEqual(s.getCell('C1'), 22);`,
        },
        {
          name: 'negative literals and multi-letter columns',
          code: String.raw`const s = new Spreadsheet();
s.setCell('AA10', '-4');
s.setCell('B2', '=AA10+-6');
assertEqual(s.getCell('B2'), -10);`,
        },
      ],
    },
    {
      title: 'Part 2: Cycles',
      prompt:
        'A `setCell` that would create a reference cycle (including a cell referencing itself) must throw and leave the sheet unchanged.',
      tests: [
        {
          name: 'self reference',
          code: String.raw`const s = new Spreadsheet();
assertThrows(() => s.setCell('A1', '=A1+1'));
assertEqual(s.getCell('A1'), 0);`,
        },
        {
          name: 'indirect cycle is rejected, old value kept',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '3');
s.setCell('B1', '=A1');
s.setCell('C1', '=B1+1');
assertThrows(() => s.setCell('A1', '=C1'));
assertEqual(s.getCell('A1'), 3);
assertEqual(s.getCell('C1'), 4);`,
        },
        {
          name: 'diamond is not a cycle',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '2');
s.setCell('B1', '=A1'); s.setCell('C1', '=A1');
s.setCell('D1', '=B1+C1');
assertEqual(s.getCell('D1'), 4);`,
        },
      ],
    },
    {
      title: 'Part 3: Ranges and speed',
      prompt: `Support \`SUM(A1:B3)\` as a term inside formulas (rectangular, inclusive): \`"=SUM(A1:A3)+B1"\`.

Reads must be fast: after building a long chain, 20k \`getCell\` calls should not re-evaluate the whole chain each time.`,
      tests: [
        {
          name: 'SUM over a rectangle',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '1'); s.setCell('A2', '2'); s.setCell('B1', '3'); s.setCell('B2', '4');
s.setCell('C1', '=SUM(A1:B2)+10');
assertEqual(s.getCell('C1'), 20);
s.setCell('B2', '0');
assertEqual(s.getCell('C1'), 16);`,
        },
        {
          name: 'cycle through a range',
          code: String.raw`const s = new Spreadsheet();
assertThrows(() => s.setCell('A2', '=SUM(A1:A3)'));`,
        },
        {
          name: 'cached reads on a 2000-cell chain',
          code: String.raw`const s = new Spreadsheet();
s.setCell('A1', '1');
for (let i = 2; i <= 2000; i++) s.setCell('A' + i, '=A' + (i - 1) + '+1');
const t0 = now();
for (let i = 0; i < 20000; i++) s.getCell('A2000');
assertEqual(s.getCell('A2000'), 2000);
const ms = now() - t0;
assert(ms < 500, '20k reads took ' + Math.round(ms) + ' ms');`,
        },
      ],
    },
  ],
  solution: String.raw`type Term = { kind: 'num'; n: number } | { kind: 'ref'; cells: string[] };

class Spreadsheet {
  private formulas = new Map<string, Term[]>();
  private cache = new Map<string, number>();
  private dependents = new Map<string, Set<string>>();

  setCell(cell: string, value: string): void {
    const terms = parse(value);
    const deps = new Set(terms.flatMap((t) => (t.kind === 'ref' ? t.cells : [])));
    // Cycle: does any dependency (transitively) depend on this cell?
    const seen = new Set<string>();
    const stack = [...deps];
    while (stack.length) {
      const c = stack.pop()!;
      if (c === cell) throw new Error('cycle via ' + cell);
      if (seen.has(c)) continue;
      seen.add(c);
      for (const t of this.formulas.get(c) ?? []) if (t.kind === 'ref') stack.push(...t.cells);
    }
    for (const t of this.formulas.get(cell) ?? [])
      if (t.kind === 'ref') for (const d of t.cells) this.dependents.get(d)?.delete(cell);
    this.formulas.set(cell, terms);
    for (const d of deps) {
      if (!this.dependents.has(d)) this.dependents.set(d, new Set());
      this.dependents.get(d)!.add(cell);
    }
    this.invalidate(cell);
  }

  getCell(cell: string): number {
    const hit = this.cache.get(cell);
    if (hit !== undefined) return hit;
    let sum = 0;
    for (const t of this.formulas.get(cell) ?? []) {
      if (t.kind === 'num') sum += t.n;
      else for (const c of t.cells) sum += this.getCell(c);
    }
    this.cache.set(cell, sum);
    return sum;
  }

  private invalidate(cell: string): void {
    const stack = [cell];
    while (stack.length) {
      const c = stack.pop()!;
      if (!this.cache.delete(c) && c !== cell) continue;
      for (const d of this.dependents.get(c) ?? []) stack.push(d);
    }
  }
}

function parse(value: string): Term[] {
  if (!value.startsWith('=')) return [{ kind: 'num', n: parseInt(value, 10) || 0 }];
  return value.slice(1).split('+').map((raw): Term => {
    const s = raw.trim();
    const range = /^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/.exec(s);
    if (range) return { kind: 'ref', cells: expand(range[1]!, range[2]!) };
    if (/^[A-Z]+\d+$/.test(s)) return { kind: 'ref', cells: [s] };
    if (/^-?\d+$/.test(s)) return { kind: 'num', n: parseInt(s, 10) };
    throw new Error('bad term: ' + s);
  });
}

function split(cell: string): [number, number] {
  const m = /^([A-Z]+)(\d+)$/.exec(cell)!;
  let col = 0;
  for (const ch of m[1]!) col = col * 26 + (ch.charCodeAt(0) - 64);
  return [col, parseInt(m[2]!, 10)];
}

function colName(col: number): string {
  let s = '';
  while (col > 0) { const r = (col - 1) % 26; s = String.fromCharCode(65 + r) + s; col = Math.floor((col - 1) / 26); }
  return s;
}

function expand(a: string, b: string): string[] {
  const [c1, r1] = split(a), [c2, r2] = split(b);
  const out: string[] = [];
  for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) out.push(colName(c) + r);
  return out;
}
`,
};

const gpuCredits: CodingQuestion = {
  kind: 'coding',
  id: 'gpu-credits',
  title: 'GPU Credits with Expiry',
  difficulty: 'hard',
  tags: ['simulation', 'heaps', 'ordering'],
  summary:
    'Grant expiring credits, charge usage soonest-expiring first, answer balances; events arrive out of order.',
  prompt: `Customers get GPU credits that expire. Implement:

\`\`\`ts
class Credits {
  grant(id: string, amount: number, timestamp: number, expiresIn: number): void
  subtract(amount: number, timestamp: number): void
  getBalance(timestamp: number): number
}
\`\`\`

- A grant is usable at times \`t\` with \`timestamp <= t < timestamp + expiresIn\`.
- \`subtract\` consumes from grants valid at that moment, **soonest-expiring first**. If there is not enough, it consumes everything available and the shortfall is dropped (the balance never goes negative).
- At the same timestamp, grants apply before subtractions.`,
  starter: `class Credits {
  grant(id: string, amount: number, timestamp: number, expiresIn: number): void {
    // TODO
  }

  subtract(amount: number, timestamp: number): void {
    // TODO
  }

  getBalance(timestamp: number): number {
    // TODO
    return 0;
  }
}
`,
  parts: [
    {
      title: 'Part 1: In-order events',
      prompt: 'All calls arrive in non-decreasing timestamp order.',
      tests: [
        {
          name: 'grant and expire',
          code: String.raw`const c = new Credits();
c.grant('a', 10, 0, 10);
assertEqual(c.getBalance(0), 10);
assertEqual(c.getBalance(9), 10);
assertEqual(c.getBalance(10), 0, 'expired at 0 + 10');`,
        },
        {
          name: 'subtract uses soonest-expiring first',
          code: String.raw`const c = new Credits();
c.grant('long', 10, 0, 100);
c.grant('short', 5, 0, 10);
c.subtract(7, 1);
assertEqual(c.getBalance(1), 8);
assertEqual(c.getBalance(50), 8, 'the 5 short credits were spent, so nothing extra expires');`,
        },
        {
          name: 'balance never goes negative',
          code: String.raw`const c = new Credits();
c.grant('a', 3, 0, 100);
c.subtract(10, 1);
assertEqual(c.getBalance(2), 0);
c.grant('b', 4, 3, 100);
assertEqual(c.getBalance(3), 4, 'shortfall was dropped, not owed');`,
        },
        {
          name: 'expired grants cannot be spent',
          code: String.raw`const c = new Credits();
c.grant('a', 5, 0, 5);
c.grant('b', 5, 0, 50);
c.subtract(3, 5);
assertEqual(c.getBalance(5), 2);`,
        },
      ],
    },
    {
      title: 'Part 2: Out-of-order events',
      prompt:
        'Calls may now arrive in **any** order. `getBalance(t)` must equal the result of applying every event with timestamp `<= t` in timestamp order (grants before subtractions at a tie).',
      tests: [
        {
          name: 'late grant changes an earlier subtraction',
          code: String.raw`const c = new Credits();
c.subtract(5, 10);
c.grant('a', 8, 0, 100);
assertEqual(c.getBalance(5), 8);
assertEqual(c.getBalance(10), 3);`,
        },
        {
          name: 'late subtraction consumes the right grant',
          code: String.raw`const c = new Credits();
c.grant('long', 10, 0, 100);
c.grant('short', 5, 0, 20);
assertEqual(c.getBalance(30), 10);
c.subtract(5, 1);
assertEqual(c.getBalance(30), 10, 'the subtraction should have taken the short grant');
assertEqual(c.getBalance(5), 10);`,
        },
        {
          name: 'queries in the past are stable',
          code: String.raw`const c = new Credits();
c.grant('a', 10, 0, 1000);
c.subtract(1, 100); c.subtract(1, 200); c.subtract(1, 300);
assertEqual(c.getBalance(250), 8);
assertEqual(c.getBalance(50), 10);
assertEqual(c.getBalance(300), 7);`,
        },
        {
          name: 'tie: grant applies before subtract',
          code: String.raw`const c = new Credits();
c.subtract(4, 5);
c.grant('a', 10, 5, 10);
assertEqual(c.getBalance(5), 6);`,
        },
      ],
    },
  ],
  solution: String.raw`type Event =
  | { kind: 'grant'; t: number; amount: number; expires: number; seq: number }
  | { kind: 'sub'; t: number; amount: number; seq: number };

// Store events; replay on query. Simple, correct for out-of-order input.
// (Follow-up: cache replays or keep snapshots if queries dominate.)
class Credits {
  private events: Event[] = [];
  private seq = 0;

  grant(_id: string, amount: number, timestamp: number, expiresIn: number): void {
    this.events.push({ kind: 'grant', t: timestamp, amount, expires: timestamp + expiresIn, seq: this.seq++ });
  }

  subtract(amount: number, timestamp: number): void {
    this.events.push({ kind: 'sub', t: timestamp, amount, seq: this.seq++ });
  }

  getBalance(timestamp: number): number {
    const evs = this.events
      .filter((e) => e.t <= timestamp)
      .sort((a, b) => a.t - b.t || (a.kind === b.kind ? a.seq - b.seq : a.kind === 'grant' ? -1 : 1));
    const live: { expires: number; left: number }[] = [];
    for (const e of evs) {
      if (e.kind === 'grant') { live.push({ expires: e.expires, left: e.amount }); continue; }
      let need = e.amount;
      const usable = live.filter((g) => g.expires > e.t && g.left > 0).sort((a, b) => a.expires - b.expires);
      for (const g of usable) {
        const take = Math.min(g.left, need);
        g.left -= take;
        need -= take;
        if (need === 0) break;
      }
    }
    return live.filter((g) => g.expires > timestamp).reduce((s, g) => s + g.left, 0);
  }
}
`,
};

const cdSymlinks: CodingQuestion = {
  kind: 'coding',
  id: 'cd-symlinks',
  title: 'Implement cd (with Symlinks)',
  difficulty: 'medium',
  tags: ['strings', 'stacks', 'graphs'],
  summary:
    'Resolve a cd target against a working directory, then follow symlinks and detect loops.',
  prompt: `Implement the path resolution behind a shell's \`cd\`:

\`\`\`ts
function cd(cwd: string, target: string, symlinks?: Record<string, string>): string | null
\`\`\`

\`cwd\` is an absolute, normalized path. Return the absolute, normalized directory you end up in (no trailing slash except for \`/\`).`,
  starter: `function cd(cwd: string, target: string, symlinks: Record<string, string> = {}): string | null {
  // TODO
  return cwd;
}
`,
  parts: [
    {
      title: 'Part 1: Paths',
      prompt:
        'Handle absolute and relative targets, `.`, `..`, repeated and trailing slashes. `..` at the root stays at the root.',
      tests: [
        {
          name: 'relative and absolute',
          code: String.raw`assertEqual(cd('/home/user', 'docs'), '/home/user/docs');
assertEqual(cd('/home/user', '/etc'), '/etc');`,
        },
        {
          name: 'dot and dot-dot',
          code: String.raw`assertEqual(cd('/a/b/c', '../../x/./y'), '/a/x/y');
assertEqual(cd('/a', '.'), '/a');
assertEqual(cd('/a/b', '..'), '/a');`,
        },
        {
          name: 'dot-dot past root',
          code: String.raw`assertEqual(cd('/', '..'), '/');
assertEqual(cd('/a', '../../../b'), '/b');`,
        },
        {
          name: 'messy slashes',
          code: String.raw`assertEqual(cd('/a', 'b//c///'), '/a/b/c');
assertEqual(cd('/a', '///'), '/');
assertEqual(cd('/', ''), '/');`,
        },
      ],
    },
    {
      title: 'Part 2: Symlinks',
      prompt: `\`symlinks\` maps an absolute path to an absolute target. Resolve one component at a time, like a real filesystem: after stepping into a component, if the path so far is a symlink, replace it with its (normalized) target and keep resolving. \`..\` applies to the resolved path. If following links loops forever, return \`null\`.`,
      tests: [
        {
          name: 'link in the middle of a path',
          code: String.raw`assertEqual(cd('/', 'foo/bar', { '/foo': '/real' }), '/real/bar');`,
        },
        {
          name: 'link to a link',
          code: String.raw`assertEqual(cd('/', 'a', { '/a': '/b', '/b': '/c/d' }), '/c/d');`,
        },
        {
          name: 'dot-dot after following a link',
          code: String.raw`assertEqual(cd('/', 'lnk/..', { '/lnk': '/x/y' }), '/x');`,
        },
        {
          name: 'cwd-relative into a link',
          code: String.raw`assertEqual(cd('/home', 'proj/src', { '/home/proj': '/srv/proj' }), '/srv/proj/src');`,
        },
        {
          name: 'loops return null',
          code: String.raw`assertEqual(cd('/', 'a', { '/a': '/b', '/b': '/a' }), null);
assertEqual(cd('/', 'self/x', { '/self': '/self' }), null);`,
        },
        {
          name: 'link target containing another link',
          code: String.raw`assertEqual(cd('/', 'p', { '/p': '/q/r', '/q': '/z' }), '/z/r');`,
        },
      ],
    },
  ],
  solution: String.raw`function cd(cwd: string, target: string, symlinks: Record<string, string> = {}): string | null {
  const start = target.startsWith('/') ? [] : cwd.split('/').filter(Boolean);
  return walk(start, target, symlinks, 0);
}

const MAX_HOPS = 64;

function walk(stack: string[], path: string, links: Record<string, string>, hops: number): string | null {
  const parts = [...stack];
  for (const p of path.split('/')) {
    if (p === '' || p === '.') continue;
    if (p === '..') { parts.pop(); continue; }
    parts.push(p);
    const here = '/' + parts.join('/');
    const link = links[here];
    if (link !== undefined) {
      if (hops >= MAX_HOPS) return null;
      const resolved = walk([], link, links, hops + 1);
      if (resolved === null) return null;
      parts.length = 0;
      parts.push(...resolved.split('/').filter(Boolean));
    }
  }
  return '/' + parts.join('/');
}
`,
};

const webCrawler: CodingQuestion = {
  kind: 'coding',
  id: 'web-crawler',
  title: 'Concurrent Web Crawler',
  difficulty: 'medium',
  tags: ['async', 'concurrency', 'bfs'],
  summary:
    'Crawl one host with bounded concurrency, de-duplicate URLs and survive failures.',
  prompt: `Write an async crawler:

\`\`\`ts
async function crawl(
  startUrl: string,
  fetchLinks: (url: string) => Promise<string[]>,
  maxConcurrency: number,
): Promise<string[]>
\`\`\`

Return every URL reachable from \`startUrl\` that has the **same hostname**, including \`startUrl\`, sorted. Fetch each URL at most once, never run more than \`maxConcurrency\` fetches at a time, and do use the concurrency you are given.`,
  starter: `async function crawl(
  startUrl: string,
  fetchLinks: (url: string) => Promise<string[]>,
  maxConcurrency: number,
): Promise<string[]> {
  // TODO
  return [startUrl];
}
`,
  parts: [
    {
      title: 'Part 1: Crawl with a concurrency limit',
      prompt:
        'Links to other hostnames are not followed or returned. Links may be relative to the page they appear on (resolve them with `new URL(link, page)`).',
      tests: [
        {
          name: 'same-host crawl',
          code: String.raw`const graph = {
  'https://a.com/': ['https://a.com/x', 'https://b.com/', '/y'],
  'https://a.com/x': ['https://a.com/', 'https://a.com/z'],
  'https://a.com/y': [],
  'https://a.com/z': ['https://a.com/x'],
};
const fetched = [];
const result = await crawl('https://a.com/', async (u) => { fetched.push(u); await sleep(2); return graph[u] || []; }, 2);
assertEqual(result, ['https://a.com/', 'https://a.com/x', 'https://a.com/y', 'https://a.com/z']);
assertEqual(fetched.length, 4, 'each URL fetched once');`,
        },
        {
          name: 'respects and uses maxConcurrency',
          code: String.raw`const links = [];
for (let i = 0; i < 20; i++) links.push('https://h.com/p' + i);
let active = 0, peak = 0;
const fetchLinks = async (u) => {
  active++; peak = Math.max(peak, active);
  await sleep(15);
  active--;
  return u === 'https://h.com/' ? links : [];
};
const t0 = now();
const out = await crawl('https://h.com/', fetchLinks, 4);
assertEqual(out.length, 21);
assert(peak <= 4, 'peak concurrency ' + peak);
assert(peak === 4, 'never reached 4 parallel fetches (peak ' + peak + ')');
assert(now() - t0 < 200, 'too slow: looks serial');`,
        },
      ],
    },
    {
      title: 'Part 2: Failures and URL hygiene',
      prompt:
        'If `fetchLinks` rejects, keep the URL in the result but do not follow it, and keep crawling. Strip `#fragments` so `/a#top` and `/a` count as the same URL.',
      tests: [
        {
          name: 'failed fetches do not stop the crawl',
          code: String.raw`const graph = { 'https://s.com/': ['https://s.com/bad', 'https://s.com/ok'], 'https://s.com/ok': ['https://s.com/deep'] };
const out = await crawl('https://s.com/', async (u) => {
  if (u.endsWith('/bad')) throw new Error('500');
  return graph[u] || [];
}, 3);
assertEqual(out, ['https://s.com/', 'https://s.com/bad', 'https://s.com/deep', 'https://s.com/ok']);`,
        },
        {
          name: 'fragments are stripped',
          code: String.raw`const calls = [];
const out = await crawl('https://f.com/', async (u) => { calls.push(u); return u === 'https://f.com/' ? ['/a#top', '/a', '/a#bottom'] : []; }, 2);
assertEqual(out, ['https://f.com/', 'https://f.com/a']);
assertEqual(calls.length, 2);`,
        },
      ],
    },
  ],
  solution: String.raw`async function crawl(
  startUrl: string,
  fetchLinks: (url: string) => Promise<string[]>,
  maxConcurrency: number,
): Promise<string[]> {
  const host = new URL(startUrl).hostname;
  const clean = (u: string) => { const x = new URL(u); x.hash = ''; return x.toString(); };
  const start = clean(startUrl);
  const seen = new Set<string>([start]);
  const queue: string[] = [start];
  let active = 0;

  return new Promise((resolve) => {
    const pump = () => {
      if (queue.length === 0 && active === 0) {
        resolve([...seen].sort());
        return;
      }
      while (active < maxConcurrency && queue.length) {
        const url = queue.shift()!;
        active++;
        fetchLinks(url)
          .then((links) => {
            for (const l of links) {
              let abs: string;
              try { abs = clean(new URL(l, url).toString()); } catch { continue; }
              if (new URL(abs).hostname !== host || seen.has(abs)) continue;
              seen.add(abs);
              queue.push(abs);
            }
          })
          .catch(() => {})
          .finally(() => { active--; pump(); });
      }
    };
    pump();
  });
}
`,
};

const allocator: CodingQuestion = {
  kind: 'coding',
  id: 'memory-allocator',
  title: 'Memory Allocator',
  difficulty: 'medium',
  tags: ['design', 'intervals'],
  summary:
    'First-fit malloc/free over a fixed heap, then coalescing and error handling.',
  prompt: `Simulate a heap of \`size\` bytes, addresses \`0 .. size-1\`.

\`\`\`ts
class Allocator {
  constructor(size: number)
  malloc(n: number): number | null   // address of the block, or null if no room
  free(address: number): void
}
\`\`\`

Use **first fit**: return the lowest address where \`n\` contiguous free bytes start.`,
  starter: `class Allocator {
  constructor(private size: number) {}

  malloc(n: number): number | null {
    // TODO
    return null;
  }

  free(address: number): void {
    // TODO
  }
}
`,
  parts: [
    {
      title: 'Part 1: First fit',
      prompt: '`malloc(0)` or a negative size returns `null`.',
      tests: [
        {
          name: 'sequential allocations',
          code: String.raw`const a = new Allocator(100);
assertEqual(a.malloc(10), 0);
assertEqual(a.malloc(20), 10);
assertEqual(a.malloc(70), 30);
assertEqual(a.malloc(1), null, 'heap is full');`,
        },
        {
          name: 'reuse a freed hole',
          code: String.raw`const a = new Allocator(100);
const x = a.malloc(10), y = a.malloc(10);
a.malloc(10);
a.free(y);
assertEqual(a.malloc(5), 10, 'first fit picks the hole at 10');
assertEqual(a.malloc(5), 15);
assertEqual(x, 0);`,
        },
        {
          name: 'invalid sizes',
          code: String.raw`const a = new Allocator(10);
assertEqual(a.malloc(0), null);
assertEqual(a.malloc(-1), null);
assertEqual(a.malloc(11), null);`,
        },
      ],
    },
    {
      title: 'Part 2: Coalescing and errors',
      prompt:
        'Adjacent free blocks must merge, so freeing everything lets you allocate the whole heap again. `free` of an address that is not the start of a live block throws (this catches double frees).',
      tests: [
        {
          name: 'neighbours merge',
          code: String.raw`const a = new Allocator(30);
const x = a.malloc(10), y = a.malloc(10), z = a.malloc(10);
a.free(x); a.free(z); a.free(y);
assertEqual(a.malloc(30), 0);`,
        },
        {
          name: 'fragmentation without merge would fail',
          code: String.raw`const a = new Allocator(40);
const blocks = [a.malloc(10), a.malloc(10), a.malloc(10), a.malloc(10)];
a.free(blocks[1]); a.free(blocks[2]);
assertEqual(a.malloc(20), 10);`,
        },
        {
          name: 'bad frees throw',
          code: String.raw`const a = new Allocator(20);
const x = a.malloc(10);
a.free(x);
assertThrows(() => a.free(x), 'double free');
const y = a.malloc(10);
assertThrows(() => a.free(y + 1), 'middle of a block');
assertThrows(() => a.free(15), 'never allocated');`,
        },
      ],
    },
  ],
  solution: String.raw`type Block = { start: number; size: number; free: boolean };

class Allocator {
  private blocks: Block[];
  constructor(size: number) { this.blocks = [{ start: 0, size, free: true }]; }

  malloc(n: number): number | null {
    if (n <= 0) return null;
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i]!;
      if (!b.free || b.size < n) continue;
      if (b.size > n) this.blocks.splice(i + 1, 0, { start: b.start + n, size: b.size - n, free: true });
      b.size = n;
      b.free = false;
      return b.start;
    }
    return null;
  }

  free(address: number): void {
    const i = this.blocks.findIndex((b) => b.start === address && !b.free);
    if (i === -1) throw new Error('invalid free at ' + address);
    this.blocks[i]!.free = true;
    const next = this.blocks[i + 1];
    if (next && next.free) { this.blocks[i]!.size += next.size; this.blocks.splice(i + 1, 1); }
    const prev = this.blocks[i - 1];
    if (prev && prev.free) { prev.size += this.blocks[i]!.size; this.blocks.splice(i, 1); }
  }
}
`,
};

export const codingQuestions: CodingQuestion[] = [
  kvSerialize,
  versionedKv,
  resumableIterator,
  inMemoryDb,
  spreadsheet,
  gpuCredits,
  cdSymlinks,
  webCrawler,
  allocator,
];
