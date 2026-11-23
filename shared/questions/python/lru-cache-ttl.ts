import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Build an in-memory cache that holds at most \`capacity\` entries and throws out the least recently used one when it runs out of room.

\`\`\`python
class LRUCache:
    def __init__(self, capacity: int) -> None: ...   # capacity >= 1
    def get(self, key) -> object | None: ...         # value, or None on a miss
    def put(self, key, value) -> None: ...
\`\`\`

- \`get\` and \`put\` must both be **O(1)**.
- A \`get\` hit and any \`put\` make that key the most recently used.
- \`put\` on a key that is already cached replaces its value; it never evicts.

\`\`\`python
c = LRUCache(2)
c.put('a', 1); c.put('b', 2)
c.get('a')      # 1, so 'b' is now least recently used
c.put('c', 3)   # evicts 'b'
c.get('b')      # None
\`\`\``,
  starter: String.raw`class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity

    def get(self, key):
        # TODO
        return None

    def put(self, key, value) -> None:
        # TODO
        pass
`,
  solution: String.raw`import json
import math
import time
from collections import OrderedDict


class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        # key -> (value, expires_at); the first key is the least recently used.
        self._items: OrderedDict = OrderedDict()
        # Lower bound on the earliest expiry, so purging is skipped until
        # something can actually have expired.
        self._next_expiry = math.inf

    def get(self, key, now: float = 0):
        entry = self._items.get(key)
        if entry is None:
            return None
        if entry[1] <= now:
            del self._items[key]
            return None
        self._items.move_to_end(key)
        return entry[0]

    def put(self, key, value, now: float = 0, ttl: float | None = None) -> None:
        expires_at = math.inf if ttl is None else now + ttl
        if key in self._items:
            del self._items[key]
        elif len(self._items) >= self.capacity:
            self._purge_expired(now)
            if len(self._items) >= self.capacity:
                self._items.popitem(last=False)
        self._items[key] = (value, expires_at)
        self._next_expiry = min(self._next_expiry, expires_at)

    def size(self, now: float = 0) -> int:
        self._purge_expired(now)
        return len(self._items)

    # A full sweep, but only when the cache is full (or size() is asked) and
    # some entry may have expired. A min-heap keyed by expires_at with lazy
    # deletion makes this O(log n) per expired entry.
    def _purge_expired(self, now: float) -> None:
        if self._next_expiry > now:
            return
        for key in [k for k, (_, exp) in self._items.items() if exp <= now]:
            del self._items[key]
        self._next_expiry = min((exp for _, exp in self._items.values()), default=math.inf)


def memoize(fn, capacity: int, ttl: float | None = None, clock=None):
    cache = LRUCache(capacity)
    clock = clock or (lambda: time.time() * 1000)
    stats = {'hits': 0, 'misses': 0}

    def wrapped(*args):
        # JSON with sorted keys: f(1, 2), f(12) and f('1', 2) all differ,
        # and {'a': 1, 'b': 2} equals {'b': 2, 'a': 1}.
        key = json.dumps(list(args), sort_keys=True)
        t = clock()
        box = cache.get(key, t)  # values are boxed so a cached None is a hit
        if box is not None:
            stats['hits'] += 1
            return box[0]
        stats['misses'] += 1
        result = fn(*args)
        cache.put(key, (result,), t, ttl)
        return result

    wrapped.stats = lambda: dict(stats)
    return wrapped
`,
  parts: [
    {
      tests: [
        {
          name: 'miss returns null',
          code: String.raw`c = LRUCache(2)
assert_equal(c.get('nope'), None)`,
        },
        {
          name: 'put then get',
          code: String.raw`c = LRUCache(2)
c.put('a', 1); c.put('b', 2)
assert_equal(c.get('a'), 1)
assert_equal(c.get('b'), 2)`,
        },
        {
          name: 'evicts least recently used',
          code: String.raw`c = LRUCache(2)
c.put('a', 1); c.put('b', 2); c.put('c', 3)
assert_equal(c.get('a'), None, 'a evicted')
assert_equal(c.get('b'), 2)
assert_equal(c.get('c'), 3)`,
        },
        {
          name: 'get refreshes recency',
          code: String.raw`c = LRUCache(2)
c.put('a', 1); c.put('b', 2)
c.get('a')
c.put('c', 3)
assert_equal(c.get('b'), None, 'b evicted')
assert_equal(c.get('a'), 1)`,
        },
        {
          name: 'overwrite updates value and recency without evicting',
          code: String.raw`c = LRUCache(2)
c.put('a', 1); c.put('b', 2)
c.put('a', 10)
assert_equal(c.get('b'), 2, 'b still there')
c.put('c', 3)
assert_equal(c.get('a'), None, 'a was least recent after get(b)')
assert_equal(c.get('b'), 2)
assert_equal(c.get('c'), 3)`,
        },
        {
          name: 'capacity 1',
          code: String.raw`c = LRUCache(1)
c.put('a', 1); c.put('b', 2)
assert_equal(c.get('a'), None)
assert_equal(c.get('b'), 2)`,
        },
        {
          name: '100k operations',
          code: String.raw`import time
c = LRUCache(1000)
t0 = time.perf_counter()
hits = 0
for i in range(100000):
    c.put('k' + str(i), i)
    if c.get('k' + str(i - 1)) == i - 1:
        hits += 1
assert_equal(hits, 100000 - 1, 'recent keys stay cached')
assert_equal(c.get('k0'), None, 'old keys evicted')
ms = (time.perf_counter() - t0) * 1000
assert ms < 3000, 'took ' + str(round(ms)) + ' ms'`,
        },
      ],
    },
    {
      prompt: `Entries can now expire. Time comes from the caller, in ms, so tests are deterministic:

\`\`\`python
def put(self, key, value, now: float = 0, ttl: float | None = None) -> None: ...
def get(self, key, now: float = 0): ...
def size(self, now: float = 0) -> int: ...   # live entries only
\`\`\`

- An entry put at \`now\` with \`ttl\` is expired once the clock reaches \`now + ttl\`. With \`ttl=None\` it never expires.
- Reading an expired entry is a miss (and it can be dropped).
- \`put\` on an existing key resets both its value and its TTL.
- Expired entries do not count toward capacity: when a new key needs room, drop expired entries first and only evict the LRU live entry if the cache is still full.`,
      tests: [
        {
          name: 'entry expires at now + ttl',
          code: String.raw`c = LRUCache(5)
c.put('a', 1, 100, 50)
assert_equal(c.get('a', 149), 1, 'just before')
assert_equal(c.get('a', 150), None, 'at expiry')
assert_equal(c.get('a', 151), None, 'after')`,
        },
        {
          name: 'no ttl never expires',
          code: String.raw`c = LRUCache(5)
c.put('a', 1, 0)
assert_equal(c.get('a', 1e12), 1)`,
        },
        {
          name: 'put resets ttl',
          code: String.raw`c = LRUCache(5)
c.put('a', 1, 0, 10)
c.put('a', 2, 5, 10)
assert_equal(c.get('a', 12), 2, 'new ttl counts from 5')
assert_equal(c.get('a', 15), None)
c.put('b', 1, 0, 10)
c.put('b', 2, 5)
assert_equal(c.get('b', 1000), 2, 'put without ttl clears it')`,
        },
        {
          name: 'size counts live entries',
          code: String.raw`c = LRUCache(5)
c.put('a', 1, 0, 10); c.put('b', 2, 0, 20); c.put('c', 3, 0)
assert_equal(c.size(0), 3)
assert_equal(c.size(10), 2)
assert_equal(c.size(20), 1)`,
        },
        {
          name: 'expired evicted before live LRU',
          code: String.raw`c = LRUCache(2)
c.put('a', 1, 0)          # least recently used, but never expires
c.put('b', 2, 1, 5)       # expires at 6
c.put('c', 3, 10)
assert_equal(c.get('a', 10), 1, 'live a kept')
assert_equal(c.get('c', 10), 3)
assert_equal(c.get('b', 10), None)`,
        },
        {
          name: 'falls back to LRU when nothing expired',
          code: String.raw`c = LRUCache(2)
c.put('a', 1, 0, 100); c.put('b', 2, 1, 100)
c.get('a', 2)
c.put('c', 3, 3, 100)
assert_equal(c.get('b', 4), None, 'b was LRU')
assert_equal(c.get('a', 4), 1)
assert_equal(c.get('c', 4), 3)`,
        },
        {
          name: 'expired read does not refresh or count',
          code: String.raw`c = LRUCache(2)
c.put('a', 1, 0, 5)
assert_equal(c.get('a', 5), None)
c.put('b', 2, 6); c.put('c', 3, 7)
assert_equal(c.size(7), 2)
assert_equal(c.get('b', 8), 2)
assert_equal(c.get('c', 8), 3)`,
        },
      ],
    },
    {
      prompt: `Build a memoizer on top of your cache:

\`\`\`python
def memoize(fn, capacity: int, ttl: float | None = None, clock=None):
    # clock() returns ms; defaults to time.time() * 1000
    # returns a callable wrapper with wrapper.stats() -> {'hits': int, 'misses': int}
\`\`\`

- The cache key covers **all** positional arguments by value: \`f(1, 2)\`, \`f(12)\` and \`f('1', 2)\` are three different calls.
- Dict and list arguments compare by JSON value, and dict key order does not matter (\`{'a': 1, 'b': 2}\` equals \`{'b': 2, 'a': 1}\`).
- Results like \`None\`, \`0\` and \`False\` are cached like any other.
- If \`fn\` raises, nothing is cached (the call still counts as a miss).
- \`stats()\` reports cache hits and misses so far.`,
      tests: [
        {
          name: 'caches repeated calls',
          code: String.raw`calls = [0]
def sq_fn(n):
    calls[0] += 1
    return n * n
sq = memoize(sq_fn, capacity=10)
assert_equal(sq(3), 9); assert_equal(sq(3), 9); assert_equal(sq(4), 16)
assert_equal(calls[0], 2)
assert_equal(sq.stats(), {'hits': 1, 'misses': 2})`,
        },
        {
          name: 'argument boundaries and types do not collide',
          code: String.raw`f = memoize(lambda *args: str(len(args)) + ':' + ','.join(type(a).__name__ for a in args), capacity=10)
assert_equal(f(1, 2), '2:int,int')
assert_equal(f(12), '1:int')
assert_equal(f('1', 2), '2:str,int')
assert_equal(f('1,2'), '1:str')
assert_equal(f.stats(), {'hits': 0, 'misses': 4})`,
        },
        {
          name: 'objects compare by value, key order ignored',
          code: String.raw`calls = [0]
def add(o):
    calls[0] += 1
    return o['a'] + o['b']
f = memoize(add, capacity=10)
assert_equal(f({'a': 1, 'b': 2}), 3)
assert_equal(f({'b': 2, 'a': 1}), 3)
assert_equal(f({'a': 1, 'b': 3}), 4)
assert_equal(calls[0], 2)`,
        },
        {
          name: 'falsy results are cached',
          code: String.raw`calls = [0]
def g(x):
    calls[0] += 1
    return None if x == 0 else False
f = memoize(g, capacity=10)
assert_equal(f(0), None); assert_equal(f(0), None)
assert_equal(f(1), False); assert_equal(f(1), False)
assert_equal(calls[0], 2)
assert_equal(f.stats(), {'hits': 2, 'misses': 2})`,
        },
        {
          name: 'ttl uses the injected clock',
          code: String.raw`t = [0]
calls = [0]
def g(x):
    calls[0] += 1
    return x + calls[0]
f = memoize(g, capacity=10, ttl=100, clock=lambda: t[0])
assert_equal(f(1), 2)
t[0] = 99; assert_equal(f(1), 2, 'still cached')
t[0] = 100; assert_equal(f(1), 3, 'expired, recomputed')
assert_equal(f.stats(), {'hits': 1, 'misses': 2})`,
        },
        {
          name: 'capacity evicts least recently used',
          code: String.raw`calls = [0]
def g(x):
    calls[0] += 1
    return x
f = memoize(g, capacity=2)
f(1); f(2); f(1); f(3)
f(1)
assert_equal(calls[0], 3, '1 kept')
f(2)
assert_equal(calls[0], 4, '2 was evicted')`,
        },
        {
          name: 'throws are not cached',
          code: String.raw`calls = [0]
def g(x):
    calls[0] += 1
    if calls[0] == 1:
        raise ValueError('flaky')
    return x
f = memoize(g, capacity=10)
assert_raises(lambda: f(5))
assert_equal(f(5), 5)
assert_equal(f(5), 5)
assert_equal(calls[0], 2)
assert_equal(f.stats(), {'hits': 1, 'misses': 2})`,
        },
      ],
    },
  ],
};
