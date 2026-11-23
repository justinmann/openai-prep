import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `A ride-hailing app needs to match a rider with nearby drivers. Distances are plain Euclidean distance on \`(x, y)\`. Drivers and riders are plain dicts.

\`\`\`python
# driver: {'id': str, 'x': float, 'y': float, 'available': bool}
# rider:  {'x': float, 'y': float}

def k_closest(drivers: list[dict], rider: dict, k: int) -> list[str]: ...
\`\`\`

- Return the ids of the \`k\` nearest **available** drivers, nearest first.
- Equal distances are ordered by id (plain string comparison).
- Fewer than \`k\` available drivers returns all of them; \`k <= 0\` returns \`[]\`.

Example: drivers \`a\` at (1, 0), \`b\` at (5, 5) and \`c\` at (0, 2, unavailable); \`k_closest(drivers, {'x': 0, 'y': 0}, 2)\` is \`['a', 'b']\`.`,
  starter: String.raw`def k_closest(drivers: list[dict], rider: dict, k: int) -> list[str]:
    # TODO
    return []


class Dispatcher:
    def __init__(self, cell_size: float = 10) -> None:
        # cell_size is used in Part 3.
        self.cell_size = cell_size

    def update_location(self, id: str, x: float, y: float) -> None:
        # TODO
        pass

    def set_available(self, id: str, available: bool) -> None:
        # TODO
        pass

    def nearest(self, rider: dict, k: int) -> list[str]:
        # TODO
        return []

    def assign(self, rider: dict) -> str | None:
        # TODO
        return None
`,
  parts: [
    {
      prompt:
        'Keep a bounded max-heap of size `k` (`heapq` is a min-heap, so push negated keys) so the work is `O(n log k)` rather than sorting every driver. Compare squared distances to avoid `sqrt`. One test passes 50k drivers and must finish quickly.',
      tests: [
        {
          name: 'nearest first',
          code: String.raw`drivers = [
    {'id': 'a', 'x': 1, 'y': 0, 'available': True},
    {'id': 'b', 'x': 5, 'y': 5, 'available': True},
    {'id': 'c', 'x': 2, 'y': 2, 'available': True},
]
assert_equal(k_closest(drivers, {'x': 0, 'y': 0}, 2), ['a', 'c'])
assert_equal(k_closest(drivers, {'x': 5, 'y': 4}, 1), ['b'])`,
        },
        {
          name: 'skips unavailable drivers',
          code: String.raw`drivers = [
    {'id': 'a', 'x': 1, 'y': 0, 'available': False},
    {'id': 'b', 'x': 5, 'y': 5, 'available': True},
    {'id': 'c', 'x': 0, 'y': 2, 'available': False},
]
assert_equal(k_closest(drivers, {'x': 0, 'y': 0}, 2), ['b'])`,
        },
        {
          name: 'ties broken by id',
          code: String.raw`drivers = [
    {'id': 'd', 'x': 0, 'y': 3, 'available': True},
    {'id': 'b', 'x': 3, 'y': 0, 'available': True},
    {'id': 'c', 'x': -3, 'y': 0, 'available': True},
    {'id': 'a', 'x': 0, 'y': 4, 'available': True},
]
assert_equal(k_closest(drivers, {'x': 0, 'y': 0}, 2), ['b', 'c'])
assert_equal(k_closest(drivers, {'x': 0, 'y': 0}, 4), ['b', 'c', 'd', 'a'])`,
        },
        {
          name: 'k larger than available, k of zero',
          code: String.raw`drivers = [
    {'id': 'a', 'x': 1, 'y': 1, 'available': True},
    {'id': 'b', 'x': -2, 'y': 0, 'available': True},
]
assert_equal(k_closest(drivers, {'x': 0, 'y': 0}, 10), ['a', 'b'])
assert_equal(k_closest(drivers, {'x': 0, 'y': 0}, 0), [])
assert_equal(k_closest([], {'x': 0, 'y': 0}, 3), [])`,
        },
        {
          name: 'rider away from the origin',
          code: String.raw`drivers = [
    {'id': 'home', 'x': 0, 'y': 0, 'available': True},
    {'id': 'near', 'x': 101, 'y': 99, 'available': True},
    {'id': 'mid', 'x': 90, 'y': 100, 'available': True},
]
assert_equal(k_closest(drivers, {'x': 100, 'y': 100}, 3), ['near', 'mid', 'home'])`,
        },
        {
          name: 'large input finishes quickly',
          code: String.raw`import time
seed = [12345]
def rand():
    seed[0] = (seed[0] * 48271) % 2147483647
    return seed[0]
drivers = []
for i in range(50000):
    drivers.append({'id': 'd' + str(i), 'x': rand() % 100000, 'y': rand() % 100000, 'available': i % 3 != 0})
drivers.append({'id': 'zz1', 'x': 50000, 'y': 50001, 'available': True})
drivers.append({'id': 'zz0', 'x': 50001, 'y': 50000, 'available': True})
drivers.append({'id': 'aa', 'x': 50000, 'y': 50000, 'available': False})
t0 = time.perf_counter()
got = k_closest(drivers, {'x': 50000, 'y': 50000}, 10)
ms = (time.perf_counter() - t0) * 1000
assert_equal(len(got), 10)
assert_equal(got[:2], ['zz0', 'zz1'])
assert ms < 2000, 'took ' + str(round(ms)) + ' ms'`,
        },
      ],
    },
    {
      prompt: `Drivers now move and change status over time. Implement \`Dispatcher\` (the constructor argument is for Part 3; ignore it for now).

\`\`\`python
class Dispatcher:
    def update_location(self, id: str, x: float, y: float) -> None: ...
    def set_available(self, id: str, available: bool) -> None: ...
    def nearest(self, rider: dict, k: int) -> list[str]: ...
    def assign(self, rider: dict) -> str | None: ...
\`\`\`

- \`update_location\` on an unknown id registers a new driver, **available** by default; on a known id it moves the driver.
- \`set_available\` on an unknown id raises an exception.
- \`nearest\` has the same ordering rules as \`k_closest\`.
- \`assign\` returns the nearest available driver's id and marks that driver unavailable, or returns \`None\` when nobody is available.`,
      tests: [
        {
          name: 'new drivers start available',
          code: String.raw`d = Dispatcher()
d.update_location('a', 1, 0)
d.update_location('b', 3, 0)
d.update_location('c', 2, 0)
assert_equal(d.nearest({'x': 0, 'y': 0}, 2), ['a', 'c'])`,
        },
        {
          name: 'updates move drivers',
          code: String.raw`d = Dispatcher()
d.update_location('a', 1, 0)
d.update_location('b', 3, 0)
d.update_location('a', 50, 50)
assert_equal(d.nearest({'x': 0, 'y': 0}, 2), ['b', 'a'])`,
        },
        {
          name: 'availability toggles',
          code: String.raw`d = Dispatcher()
d.update_location('a', 1, 0)
d.update_location('b', 3, 0)
d.set_available('a', False)
assert_equal(d.nearest({'x': 0, 'y': 0}, 2), ['b'])
d.set_available('a', True)
assert_equal(d.nearest({'x': 0, 'y': 0}, 2), ['a', 'b'])
d.update_location('b', 0, 0)
assert_equal(d.nearest({'x': 0, 'y': 0}, 1), ['b'], 'a move keeps status')`,
        },
        {
          name: 'assign takes the nearest driver',
          code: String.raw`d = Dispatcher()
d.update_location('a', 1, 0)
d.update_location('b', 3, 0)
assert_equal(d.assign({'x': 0, 'y': 0}), 'a')
assert_equal(d.nearest({'x': 0, 'y': 0}, 5), ['b'], 'a is now busy')
assert_equal(d.assign({'x': 0, 'y': 0}), 'b')
assert_equal(d.assign({'x': 0, 'y': 0}), None, 'nobody left')`,
        },
        {
          name: 'assign on an empty dispatcher',
          code: String.raw`d = Dispatcher()
assert_equal(d.assign({'x': 0, 'y': 0}), None)
assert_equal(d.nearest({'x': 0, 'y': 0}, 3), [])`,
        },
        {
          name: 'unknown driver throws',
          code: String.raw`d = Dispatcher()
d.update_location('a', 0, 0)
assert_raises(lambda: d.set_available('ghost', True))`,
        },
      ],
    },
    {
      prompt: `Scanning every driver per request is too slow for a city. \`Dispatcher(cell_size)\` buckets drivers into square cells of side \`cell_size\` (cell \`(floor(x / cell_size), floor(y / cell_size))\`), and \`nearest\` searches **rings** of cells outward from the rider's cell.

- Ring \`r\` is every cell whose column or row offset from the rider's cell is exactly \`r\`.
- A driver in the next ring can still be closer than one you already found. Any driver beyond ring \`r\` is at least \`r * cell_size\` away, so stop only once you hold \`k\` candidates and the kth best is strictly closer than that.
- Stop when the rings have covered every occupied cell, and keep cells up to date when drivers move.
- Results must match Part 2 exactly. One test loads 20k drivers and runs a thousand queries.`,
      tests: [
        {
          name: 'closer driver just across a cell boundary',
          code: String.raw`d = Dispatcher(10)
d.update_location('same-cell', 0.5, 5)
d.update_location('next-cell', 10.1, 5)
assert_equal(d.nearest({'x': 9.9, 'y': 5}, 1), ['next-cell'])`,
        },
        {
          name: 'outer ring beats a far corner of the inner ring',
          code: String.raw`d = Dispatcher(10)
d.update_location('corner', 19, 19)
d.update_location('outer', 20, 1)
assert_equal(d.nearest({'x': 1, 'y': 1}, 1), ['outer'])
assert_equal(d.nearest({'x': 1, 'y': 1}, 2), ['outer', 'corner'])`,
        },
        {
          name: 'negative coordinates',
          code: String.raw`d = Dispatcher(5)
d.update_location('a', -0.1, -0.1)
d.update_location('b', 0.2, 0.2)
d.update_location('c', -12, 3)
assert_equal(d.nearest({'x': -0.05, 'y': -0.05}, 3), ['a', 'b', 'c'])`,
        },
        {
          name: 'moving between cells',
          code: String.raw`d = Dispatcher(10)
d.update_location('a', 5, 5)
d.update_location('b', 95, 95)
d.update_location('a', 200, 200)
assert_equal(d.nearest({'x': 0, 'y': 0}, 1), ['b'])
d.update_location('a', 1, 1)
assert_equal(d.nearest({'x': 0, 'y': 0}, 2), ['a', 'b'])
assert_equal(d.assign({'x': 0, 'y': 0}), 'a')
assert_equal(d.assign({'x': 0, 'y': 0}), 'b')
assert_equal(d.assign({'x': 0, 'y': 0}), None)`,
        },
        {
          name: 'sparse drivers far from the rider',
          code: String.raw`d = Dispatcher(1)
d.update_location('a', 300, 0)
d.update_location('b', 0, -400)
d.update_location('c', 1000, 1000)
assert_equal(d.nearest({'x': 0, 'y': 0}, 5), ['a', 'b', 'c'])`,
        },
        {
          name: 'matches a brute-force scan',
          code: String.raw`seed = [777]
def rand():
    seed[0] = (seed[0] * 48271) % 2147483647
    return seed[0]
d = Dispatcher(7)
all_drivers = {}
for i in range(1000):
    id = 'd' + str(i)
    p = {'x': (rand() % 2000) / 10, 'y': (rand() % 2000) / 10, 'available': rand() % 4 != 0}
    all_drivers[id] = p
    d.update_location(id, p['x'], p['y'])
    if not p['available']:
        d.set_available(id, False)
for q in range(100):
    rider = {'x': (rand() % 2400) / 10 - 20, 'y': (rand() % 2400) / 10 - 20}
    k = 1 + rand() % 8
    cands = sorted(
        ((p['x'] - rider['x']) * (p['x'] - rider['x']) + (p['y'] - rider['y']) * (p['y'] - rider['y']), id)
        for id, p in all_drivers.items()
        if p['available']
    )
    want = [id for _, id in cands[:k]]
    assert_equal(d.nearest(rider, k), want, 'query ' + str(q))`,
        },
        {
          name: 'large city, many queries',
          code: String.raw`import time
seed = [4242]
def rand():
    seed[0] = (seed[0] * 48271) % 2147483647
    return seed[0]
d = Dispatcher(50)
for i in range(20000):
    d.update_location('d' + str(i), rand() % 10000, rand() % 10000)
t0 = time.perf_counter()
assigned = 0
for q in range(1000):
    rider = {'x': rand() % 10000, 'y': rand() % 10000}
    got = d.nearest(rider, 5)
    assert_equal(len(got), 5)
    if q % 10 == 0 and d.assign(rider) is not None:
        assigned += 1
ms = (time.perf_counter() - t0) * 1000
assert_equal(assigned, 100)
assert ms < 2500, 'took ' + str(round(ms)) + ' ms'`,
        },
      ],
    },
  ],
  solution: String.raw`import heapq
import math


def _dist2(x: float, y: float, p: dict) -> float:
    dx = x - p['x']
    dy = y - p['y']
    return dx * dx + dy * dy


class _Key:
    """Heap key ordered so the worst kept candidate sits at the root."""

    __slots__ = ('dist', 'id')

    def __init__(self, dist: float, id: str) -> None:
        self.dist = dist
        self.id = id

    def __lt__(self, other: '_Key') -> bool:
        # "less" means worse: farther, or equally far with a larger id
        if self.dist != other.dist:
            return self.dist > other.dist
        return self.id > other.id


class _TopK:
    def __init__(self, k: int) -> None:
        self.k = k
        self.heap: list[_Key] = []

    def offer(self, dist: float, id: str) -> None:
        if len(self.heap) < self.k:
            heapq.heappush(self.heap, _Key(dist, id))
            return
        worst = self.heap[0]
        if (dist, id) < (worst.dist, worst.id):
            heapq.heapreplace(self.heap, _Key(dist, id))

    def kth(self) -> float | None:
        return self.heap[0].dist if len(self.heap) == self.k else None

    def ids(self) -> list[str]:
        return [c.id for c in sorted(self.heap, key=lambda c: (c.dist, c.id))]


def k_closest(drivers: list[dict], rider: dict, k: int) -> list[str]:
    if k <= 0:
        return []
    top = _TopK(k)
    for d in drivers:
        if d['available']:
            top.offer(_dist2(d['x'], d['y'], rider), d['id'])
    return top.ids()


class Dispatcher:
    def __init__(self, cell_size: float = 10) -> None:
        self.cell_size = cell_size
        self.drivers: dict[str, dict] = {}
        self.cells: dict[tuple[int, int], dict[str, dict]] = {}
        self.cell_of: dict[str, tuple[int, int]] = {}
        self.min_cx = math.inf
        self.max_cx = -math.inf
        self.min_cy = math.inf
        self.max_cy = -math.inf

    def _cell(self, v: float) -> int:
        return math.floor(v / self.cell_size)

    def update_location(self, id: str, x: float, y: float) -> None:
        d = self.drivers.get(id)
        if d is None:
            d = {'id': id, 'x': x, 'y': y, 'available': True}
            self.drivers[id] = d
        else:
            d['x'] = x
            d['y'] = y
        key = (self._cell(x), self._cell(y))
        old = self.cell_of.get(id)
        if old == key:
            return
        if old is not None:
            bucket = self.cells[old]
            del bucket[id]
            if not bucket:
                del self.cells[old]
        self.cells.setdefault(key, {})[id] = d
        self.cell_of[id] = key
        self.min_cx = min(self.min_cx, key[0])
        self.max_cx = max(self.max_cx, key[0])
        self.min_cy = min(self.min_cy, key[1])
        self.max_cy = max(self.max_cy, key[1])

    def set_available(self, id: str, available: bool) -> None:
        if id not in self.drivers:
            raise KeyError('unknown driver ' + id)
        self.drivers[id]['available'] = available

    def nearest(self, rider: dict, k: int) -> list[str]:
        if k <= 0 or not self.drivers:
            return []
        top = _TopK(k)
        cx0 = self._cell(rider['x'])
        cy0 = self._cell(rider['y'])

        def visit(cx: int, cy: int) -> None:
            bucket = self.cells.get((cx, cy))
            if bucket:
                for d in bucket.values():
                    if d['available']:
                        top.offer(_dist2(d['x'], d['y'], rider), d['id'])

        # The bounding box only grows, so it always covers every occupied cell.
        max_r = int(max(cx0 - self.min_cx, self.max_cx - cx0, cy0 - self.min_cy, self.max_cy - cy0))
        for r in range(max_r + 1):
            if r == 0:
                visit(cx0, cy0)
            else:
                for dx in range(-r, r + 1):
                    visit(cx0 + dx, cy0 - r)
                    visit(cx0 + dx, cy0 + r)
                for dy in range(-r + 1, r):
                    visit(cx0 - r, cy0 + dy)
                    visit(cx0 + r, cy0 + dy)
            # Anything beyond ring r is at least r * cell_size away.
            kth = top.kth()
            reach = r * self.cell_size
            if kth is not None and kth < reach * reach:
                break
        return top.ids()

    def assign(self, rider: dict) -> str | None:
        got = self.nearest(rider, 1)
        if not got:
            return None
        self.set_available(got[0], False)
        return got[0]
`,
};
