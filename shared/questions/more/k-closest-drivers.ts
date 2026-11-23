import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'k-closest-drivers',
  title: 'K Closest Available Drivers',
  difficulty: 'medium',
  tags: ['heap', 'geometry', 'design'],
  summary:
    'Find the k nearest available drivers with a heap, then a live dispatcher and a grid index.',
  companies: ['uber', 'amazon', 'meta'],
  sources: [
    'https://www.glassdoor.com/Interview/Uber-Software-Developer-Interview-Questions-EI_IE575263.0,4_KO5,23.htm',
    'https://prachub.com/companies/uber/categories/coding-and-algorithms',
    'https://leetcode.com/problems/k-closest-points-to-origin/',
  ],
  prompt: `A ride-hailing app needs to match a rider with nearby drivers. Distances are plain Euclidean distance on \`(x, y)\`.

\`\`\`ts
type Driver = { id: string; x: number; y: number; available: boolean };
type Point = { x: number; y: number };

function kClosest(drivers: Driver[], rider: Point, k: number): string[]
\`\`\`

- Return the ids of the \`k\` nearest **available** drivers, nearest first.
- Equal distances are ordered by id (plain string comparison).
- Fewer than \`k\` available drivers returns all of them; \`k <= 0\` returns \`[]\`.

Example: drivers \`a\` at (1, 0), \`b\` at (5, 5) and \`c\` at (0, 2, unavailable); \`kClosest(drivers, {x: 0, y: 0}, 2)\` is \`['a', 'b']\`.`,
  starter: `type Driver = { id: string; x: number; y: number; available: boolean };
type Point = { x: number; y: number };

function kClosest(drivers: Driver[], rider: Point, k: number): string[] {
  // TODO
  return [];
}

class Dispatcher {
  // cellSize is used in Part 3.
  constructor(private cellSize = 10) {}

  updateLocation(id: string, x: number, y: number): void {
    // TODO
  }

  setAvailable(id: string, available: boolean): void {
    // TODO
  }

  nearest(rider: Point, k: number): string[] {
    // TODO
    return [];
  }

  assign(rider: Point): string | null {
    // TODO
    return null;
  }
}
`,
  parts: [
    {
      title: 'Part 1: K closest with a heap',
      prompt:
        'Keep a bounded max-heap of size `k` so the work is `O(n log k)` rather than sorting every driver. Compare squared distances to avoid `sqrt`. One test passes 200k drivers and must finish quickly.',
      tests: [
        {
          name: 'nearest first',
          code: String.raw`const drivers = [
  { id: 'a', x: 1, y: 0, available: true },
  { id: 'b', x: 5, y: 5, available: true },
  { id: 'c', x: 2, y: 2, available: true },
];
assertEqual(kClosest(drivers, { x: 0, y: 0 }, 2), ['a', 'c']);
assertEqual(kClosest(drivers, { x: 5, y: 4 }, 1), ['b']);`,
        },
        {
          name: 'skips unavailable drivers',
          code: String.raw`const drivers = [
  { id: 'a', x: 1, y: 0, available: false },
  { id: 'b', x: 5, y: 5, available: true },
  { id: 'c', x: 0, y: 2, available: false },
];
assertEqual(kClosest(drivers, { x: 0, y: 0 }, 2), ['b']);`,
        },
        {
          name: 'ties broken by id',
          code: String.raw`const drivers = [
  { id: 'd', x: 0, y: 3, available: true },
  { id: 'b', x: 3, y: 0, available: true },
  { id: 'c', x: -3, y: 0, available: true },
  { id: 'a', x: 0, y: 4, available: true },
];
assertEqual(kClosest(drivers, { x: 0, y: 0 }, 2), ['b', 'c']);
assertEqual(kClosest(drivers, { x: 0, y: 0 }, 4), ['b', 'c', 'd', 'a']);`,
        },
        {
          name: 'k larger than available, k of zero',
          code: String.raw`const drivers = [
  { id: 'a', x: 1, y: 1, available: true },
  { id: 'b', x: -2, y: 0, available: true },
];
assertEqual(kClosest(drivers, { x: 0, y: 0 }, 10), ['a', 'b']);
assertEqual(kClosest(drivers, { x: 0, y: 0 }, 0), []);
assertEqual(kClosest([], { x: 0, y: 0 }, 3), []);`,
        },
        {
          name: 'rider away from the origin',
          code: String.raw`const drivers = [
  { id: 'home', x: 0, y: 0, available: true },
  { id: 'near', x: 101, y: 99, available: true },
  { id: 'mid', x: 90, y: 100, available: true },
];
assertEqual(kClosest(drivers, { x: 100, y: 100 }, 3), ['near', 'mid', 'home']);`,
        },
        {
          name: 'large input finishes quickly',
          code: String.raw`let s = 12345;
const rand = () => { s = (s * 48271) % 2147483647; return s; };
const drivers = [];
for (let i = 0; i < 200000; i++) {
  drivers.push({ id: 'd' + i, x: rand() % 100000, y: rand() % 100000, available: i % 3 !== 0 });
}
drivers.push({ id: 'zz1', x: 50000, y: 50001, available: true });
drivers.push({ id: 'zz0', x: 50001, y: 50000, available: true });
drivers.push({ id: 'aa', x: 50000, y: 50000, available: false });
const t0 = now();
const got = kClosest(drivers, { x: 50000, y: 50000 }, 10);
const ms = now() - t0;
assertEqual(got.length, 10);
assertEqual(got.slice(0, 2), ['zz0', 'zz1']);
assert(ms < 1000, 'took ' + Math.round(ms) + ' ms');`,
        },
      ],
    },
    {
      title: 'Part 2: A live dispatcher',
      prompt: `Drivers now move and change status over time. Implement \`Dispatcher\` (the constructor argument is for Part 3; ignore it for now).

\`\`\`ts
class Dispatcher {
  updateLocation(id: string, x: number, y: number): void
  setAvailable(id: string, available: boolean): void
  nearest(rider: Point, k: number): string[]
  assign(rider: Point): string | null
}
\`\`\`

- \`updateLocation\` on an unknown id registers a new driver, **available** by default; on a known id it moves the driver.
- \`setAvailable\` on an unknown id throws.
- \`nearest\` has the same ordering rules as \`kClosest\`.
- \`assign\` returns the nearest available driver's id and marks that driver unavailable, or returns \`null\` when nobody is available.`,
      tests: [
        {
          name: 'new drivers start available',
          code: String.raw`const d = new Dispatcher();
d.updateLocation('a', 1, 0);
d.updateLocation('b', 3, 0);
d.updateLocation('c', 2, 0);
assertEqual(d.nearest({ x: 0, y: 0 }, 2), ['a', 'c']);`,
        },
        {
          name: 'updates move drivers',
          code: String.raw`const d = new Dispatcher();
d.updateLocation('a', 1, 0);
d.updateLocation('b', 3, 0);
d.updateLocation('a', 50, 50);
assertEqual(d.nearest({ x: 0, y: 0 }, 2), ['b', 'a']);`,
        },
        {
          name: 'availability toggles',
          code: String.raw`const d = new Dispatcher();
d.updateLocation('a', 1, 0);
d.updateLocation('b', 3, 0);
d.setAvailable('a', false);
assertEqual(d.nearest({ x: 0, y: 0 }, 2), ['b']);
d.setAvailable('a', true);
assertEqual(d.nearest({ x: 0, y: 0 }, 2), ['a', 'b']);
d.updateLocation('b', 0, 0);
assertEqual(d.nearest({ x: 0, y: 0 }, 1), ['b'], 'a move keeps status');`,
        },
        {
          name: 'assign takes the nearest driver',
          code: String.raw`const d = new Dispatcher();
d.updateLocation('a', 1, 0);
d.updateLocation('b', 3, 0);
assertEqual(d.assign({ x: 0, y: 0 }), 'a');
assertEqual(d.nearest({ x: 0, y: 0 }, 5), ['b'], 'a is now busy');
assertEqual(d.assign({ x: 0, y: 0 }), 'b');
assertEqual(d.assign({ x: 0, y: 0 }), null, 'nobody left');`,
        },
        {
          name: 'assign on an empty dispatcher',
          code: String.raw`const d = new Dispatcher();
assertEqual(d.assign({ x: 0, y: 0 }), null);
assertEqual(d.nearest({ x: 0, y: 0 }, 3), []);`,
        },
        {
          name: 'unknown driver throws',
          code: String.raw`const d = new Dispatcher();
d.updateLocation('a', 0, 0);
assertThrows(() => d.setAvailable('ghost', true));`,
        },
      ],
    },
    {
      title: 'Part 3: Grid bucketing',
      prompt: `Scanning every driver per request is too slow for a city. \`new Dispatcher(cellSize)\` buckets drivers into square cells of side \`cellSize\` (cell \`(floor(x / cellSize), floor(y / cellSize))\`), and \`nearest\` searches **rings** of cells outward from the rider's cell.

- Ring \`r\` is every cell whose column or row offset from the rider's cell is exactly \`r\`.
- A driver in the next ring can still be closer than one you already found. Any driver beyond ring \`r\` is at least \`r * cellSize\` away, so stop only once you hold \`k\` candidates and the kth best is strictly closer than that.
- Stop when the rings have covered every occupied cell, and keep cells up to date when drivers move.
- Results must match Part 2 exactly. One test loads 50k drivers and runs thousands of queries.`,
      tests: [
        {
          name: 'closer driver just across a cell boundary',
          code: String.raw`const d = new Dispatcher(10);
d.updateLocation('same-cell', 0.5, 5);
d.updateLocation('next-cell', 10.1, 5);
assertEqual(d.nearest({ x: 9.9, y: 5 }, 1), ['next-cell']);`,
        },
        {
          name: 'outer ring beats a far corner of the inner ring',
          code: String.raw`const d = new Dispatcher(10);
d.updateLocation('corner', 19, 19);
d.updateLocation('outer', 20, 1);
assertEqual(d.nearest({ x: 1, y: 1 }, 1), ['outer']);
assertEqual(d.nearest({ x: 1, y: 1 }, 2), ['outer', 'corner']);`,
        },
        {
          name: 'negative coordinates',
          code: String.raw`const d = new Dispatcher(5);
d.updateLocation('a', -0.1, -0.1);
d.updateLocation('b', 0.2, 0.2);
d.updateLocation('c', -12, 3);
assertEqual(d.nearest({ x: -0.05, y: -0.05 }, 3), ['a', 'b', 'c']);`,
        },
        {
          name: 'moving between cells',
          code: String.raw`const d = new Dispatcher(10);
d.updateLocation('a', 5, 5);
d.updateLocation('b', 95, 95);
d.updateLocation('a', 200, 200);
assertEqual(d.nearest({ x: 0, y: 0 }, 1), ['b']);
d.updateLocation('a', 1, 1);
assertEqual(d.nearest({ x: 0, y: 0 }, 2), ['a', 'b']);
assertEqual(d.assign({ x: 0, y: 0 }), 'a');
assertEqual(d.assign({ x: 0, y: 0 }), 'b');
assertEqual(d.assign({ x: 0, y: 0 }), null);`,
        },
        {
          name: 'sparse drivers far from the rider',
          code: String.raw`const d = new Dispatcher(1);
d.updateLocation('a', 300, 0);
d.updateLocation('b', 0, -400);
d.updateLocation('c', 1000, 1000);
assertEqual(d.nearest({ x: 0, y: 0 }, 5), ['a', 'b', 'c']);`,
        },
        {
          name: 'matches a brute-force scan',
          code: String.raw`let s = 777;
const rand = () => { s = (s * 48271) % 2147483647; return s; };
const d = new Dispatcher(7);
const all = new Map();
for (let i = 0; i < 2000; i++) {
  const id = 'd' + i;
  const p = { x: (rand() % 2000) / 10, y: (rand() % 2000) / 10, available: rand() % 4 !== 0 };
  all.set(id, p);
  d.updateLocation(id, p.x, p.y);
  if (!p.available) d.setAvailable(id, false);
}
for (let q = 0; q < 200; q++) {
  const rider = { x: (rand() % 2400) / 10 - 20, y: (rand() % 2400) / 10 - 20 };
  const k = 1 + (rand() % 8);
  const want = [...all.entries()]
    .filter(([, p]) => p.available)
    .map(([id, p]) => ({ id, dist: (p.x - rider.x) * (p.x - rider.x) + (p.y - rider.y) * (p.y - rider.y) }))
    .sort((a, b) => a.dist - b.dist || (a.id < b.id ? -1 : 1))
    .slice(0, k)
    .map((c) => c.id);
  assertEqual(d.nearest(rider, k), want, 'query ' + q);
}`,
        },
        {
          name: 'large city, many queries',
          code: String.raw`let s = 4242;
const rand = () => { s = (s * 48271) % 2147483647; return s; };
const d = new Dispatcher(50);
for (let i = 0; i < 50000; i++) d.updateLocation('d' + i, rand() % 10000, rand() % 10000);
const t0 = now();
let assigned = 0;
for (let q = 0; q < 10000; q++) {
  const rider = { x: rand() % 10000, y: rand() % 10000 };
  const got = d.nearest(rider, 5);
  assertEqual(got.length, 5);
  if (q % 10 === 0 && d.assign(rider) !== null) assigned++;
}
const ms = now() - t0;
assertEqual(assigned, 1000);
assert(ms < 1500, 'took ' + Math.round(ms) + ' ms');`,
        },
      ],
    },
  ],
  solution: String.raw`type Driver = { id: string; x: number; y: number; available: boolean };
type Point = { x: number; y: number };
type Cand = { dist: number; id: string };

// a is a worse match than b: farther, or equally far with a larger id.
function worse(a: Cand, b: Cand): boolean {
  return a.dist !== b.dist ? a.dist > b.dist : a.id > b.id;
}

// Keeps the k best candidates in a max-heap whose root is the worst kept.
class TopK {
  private heap: Cand[] = [];
  constructor(private k: number) {}

  offer(c: Cand): void {
    const h = this.heap;
    if (h.length < this.k) {
      h.push(c);
      let i = h.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!worse(h[i]!, h[p]!)) break;
        [h[i], h[p]] = [h[p]!, h[i]!];
        i = p;
      }
    } else if (h.length > 0 && worse(h[0]!, c)) {
      h[0] = c;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && worse(h[l]!, h[m]!)) m = l;
        if (r < h.length && worse(h[r]!, h[m]!)) m = r;
        if (m === i) break;
        [h[i], h[m]] = [h[m]!, h[i]!];
        i = m;
      }
    }
  }

  /** Squared distance of the kth best, once k candidates are held. */
  kth(): number | undefined {
    return this.heap.length === this.k ? this.heap[0]?.dist : undefined;
  }

  ids(): string[] {
    return [...this.heap].sort((a, b) => (worse(a, b) ? 1 : -1)).map((c) => c.id);
  }
}

function dist2(x: number, y: number, p: Point): number {
  const dx = x - p.x, dy = y - p.y;
  return dx * dx + dy * dy;
}

function kClosest(drivers: Driver[], rider: Point, k: number): string[] {
  if (k <= 0) return [];
  const top = new TopK(k);
  for (const d of drivers) {
    if (d.available) top.offer({ dist: dist2(d.x, d.y, rider), id: d.id });
  }
  return top.ids();
}

class Dispatcher {
  private drivers = new Map<string, Driver>();
  private cells = new Map<string, Set<Driver>>();
  private cellOf = new Map<string, string>();
  private minCx = Infinity;
  private maxCx = -Infinity;
  private minCy = Infinity;
  private maxCy = -Infinity;

  constructor(private cellSize = 10) {}

  private cell(v: number): number {
    return Math.floor(v / this.cellSize);
  }

  updateLocation(id: string, x: number, y: number): void {
    let d = this.drivers.get(id);
    if (!d) {
      d = { id, x, y, available: true };
      this.drivers.set(id, d);
    } else {
      d.x = x;
      d.y = y;
    }
    const cx = this.cell(x), cy = this.cell(y);
    const key = cx + ',' + cy;
    const old = this.cellOf.get(id);
    if (old === key) return;
    if (old !== undefined) {
      const set = this.cells.get(old)!;
      set.delete(d);
      if (set.size === 0) this.cells.delete(old);
    }
    let set = this.cells.get(key);
    if (!set) {
      set = new Set();
      this.cells.set(key, set);
    }
    set.add(d);
    this.cellOf.set(id, key);
    this.minCx = Math.min(this.minCx, cx);
    this.maxCx = Math.max(this.maxCx, cx);
    this.minCy = Math.min(this.minCy, cy);
    this.maxCy = Math.max(this.maxCy, cy);
  }

  setAvailable(id: string, available: boolean): void {
    const d = this.drivers.get(id);
    if (!d) throw new Error('unknown driver ' + id);
    d.available = available;
  }

  nearest(rider: Point, k: number): string[] {
    if (k <= 0 || this.drivers.size === 0) return [];
    const top = new TopK(k);
    const cx0 = this.cell(rider.x), cy0 = this.cell(rider.y);
    const visit = (cx: number, cy: number) => {
      const set = this.cells.get(cx + ',' + cy);
      if (!set) return;
      for (const d of set) {
        if (d.available) top.offer({ dist: dist2(d.x, d.y, rider), id: d.id });
      }
    };
    // The bounding box only grows, so it always covers every occupied cell.
    const maxR = Math.max(cx0 - this.minCx, this.maxCx - cx0, cy0 - this.minCy, this.maxCy - cy0);
    for (let r = 0; r <= maxR; r++) {
      if (r === 0) {
        visit(cx0, cy0);
      } else {
        for (let dx = -r; dx <= r; dx++) {
          visit(cx0 + dx, cy0 - r);
          visit(cx0 + dx, cy0 + r);
        }
        for (let dy = -r + 1; dy <= r - 1; dy++) {
          visit(cx0 - r, cy0 + dy);
          visit(cx0 + r, cy0 + dy);
        }
      }
      // Anything beyond ring r is at least r * cellSize away.
      const kth = top.kth();
      const reach = r * this.cellSize;
      if (kth !== undefined && kth < reach * reach) break;
    }
    return top.ids();
  }

  assign(rider: Point): string | null {
    const id = this.nearest(rider, 1)[0];
    if (id === undefined) return null;
    this.setAvailable(id, false);
    return id;
  }
}
`,
};
