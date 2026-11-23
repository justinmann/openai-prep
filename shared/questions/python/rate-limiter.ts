import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `An API gateway needs to throttle callers. Build a few limiters that decide, per request, whether to let it through.

Time is always passed in as a millisecond timestamp. Timestamps never go backwards. Python uses snake_case names.

\`\`\`python
class FixedWindowLimiter:
    def __init__(self, limit: int, window_ms: int) -> None: ...
    def allow(self, user_id: str, now: int) -> bool: ...
\`\`\`

- Time is cut into aligned windows \`[0, window_ms)\`, \`[window_ms, 2 * window_ms)\`, ...
- Each user may make at most \`limit\` allowed requests per window. Denied requests do not count.
- Users are limited independently.

\`\`\`python
rl = FixedWindowLimiter(2, 1000)
rl.allow('u', 10)    # True
rl.allow('u', 20)    # True
rl.allow('u', 999)   # False
rl.allow('u', 1000)  # True: a new window
\`\`\``,
  starter: String.raw`class FixedWindowLimiter:
    def __init__(self, limit: int, window_ms: int) -> None:
        self.limit = limit
        self.window_ms = window_ms

    def allow(self, user_id: str, now: int) -> bool:
        # TODO
        return False
`,
  solution: String.raw`import math
from collections import deque

EPS = 1e-9


class FixedWindowLimiter:
    def __init__(self, limit: int, window_ms: int) -> None:
        self.limit = limit
        self.window_ms = window_ms
        self._windows: dict[str, list[int]] = {}  # user -> [start, count]

    def allow(self, user_id: str, now: int) -> bool:
        start = now // self.window_ms * self.window_ms
        w = self._windows.get(user_id)
        if w is None or w[0] != start:
            w = [start, 0]
            self._windows[user_id] = w
        if w[1] >= self.limit:
            return False
        w[1] += 1
        return True


class TokenBucket:
    def __init__(self, capacity: float, refill_per_sec: float) -> None:
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        self._buckets: dict[str, list[float]] = {}  # user -> [tokens, last]

    def tokens(self, user_id: str, now: int) -> float:
        return self._refill(user_id, now)[0]

    def can_allow(self, user_id: str, now: int, cost: float = 1) -> bool:
        return self._refill(user_id, now)[0] + EPS >= cost

    def allow(self, user_id: str, now: int, cost: float = 1) -> bool:
        if not self.can_allow(user_id, now, cost):
            return False
        b = self._refill(user_id, now)
        b[0] = max(0.0, b[0] - cost)
        return True

    def retry_after(self, user_id: str, now: int) -> int:
        missing = 1 - self._refill(user_id, now)[0]
        if missing <= EPS:
            return 0
        return math.ceil(missing * 1000 / self.refill_per_sec - EPS)

    def _refill(self, user_id: str, now: int) -> list[float]:
        b = self._buckets.get(user_id)
        if b is None:
            b = [self.capacity, now]
            self._buckets[user_id] = b
        added = (now - b[1]) * self.refill_per_sec / 1000
        b[0] = min(self.capacity, b[0] + added)
        b[1] = now
        return b


class CompositeLimiter:
    GLOBAL = '*'

    def __init__(self, per_user: TokenBucket, global_bucket: TokenBucket) -> None:
        self.per_user = per_user
        self.global_bucket = global_bucket

    def allow(self, user_id: str, now: int, cost: float = 1) -> bool:
        # Check both before taking from either.
        if not self.per_user.can_allow(user_id, now, cost):
            return False
        if not self.global_bucket.can_allow(self.GLOBAL, now, cost):
            return False
        self.per_user.allow(user_id, now, cost)
        self.global_bucket.allow(self.GLOBAL, now, cost)
        return True


class SlidingWindowLog:
    def __init__(self, limit: int, window_ms: int) -> None:
        self.limit = limit
        self.window_ms = window_ms
        self._logs: dict[str, deque[int]] = {}

    def allow(self, user_id: str, now: int) -> bool:
        log = self._prune(user_id, now)
        if len(log) >= self.limit:
            return False
        log.append(now)
        return True

    def retry_after(self, user_id: str, now: int) -> int:
        log = self._prune(user_id, now)
        if len(log) < self.limit:
            return 0
        # The (len - limit + 1)th oldest must age out.
        return log[len(log) - self.limit] + self.window_ms - now

    def _prune(self, user_id: str, now: int) -> deque[int]:
        log = self._logs.setdefault(user_id, deque())
        while log and log[0] <= now - self.window_ms:
            log.popleft()
        return log


class SlidingWindowCounter:
    def __init__(self, limit: int, window_ms: int) -> None:
        self.limit = limit
        self.window_ms = window_ms
        self._state: dict[str, list[int]] = {}  # user -> [start, curr, prev]

    def allow(self, user_id: str, now: int) -> bool:
        start = now // self.window_ms * self.window_ms
        s = self._state.get(user_id)
        if s is None:
            s = [start, 0, 0]
            self._state[user_id] = s
        elif s[0] != start:
            s[2] = s[1] if start - s[0] == self.window_ms else 0
            s[1] = 0
            s[0] = start
        weight = (self.window_ms - (now - start)) / self.window_ms
        if s[2] * weight + s[1] >= self.limit - EPS:
            return False
        s[1] += 1
        return True
`,
  parts: [
    {
      prompt:
        'Implement `FixedWindowLimiter`. A `limit` of 0 denies everything.',
      tests: [
        {
          name: 'allows up to the limit',
          code: String.raw`rl = FixedWindowLimiter(3, 1000)
assert_equal(rl.allow('u', 0), True)
assert_equal(rl.allow('u', 1), True)
assert_equal(rl.allow('u', 2), True)
assert_equal(rl.allow('u', 3), False)
assert_equal(rl.allow('u', 4), False)`,
        },
        {
          name: 'windows are aligned, not rolling',
          code: String.raw`rl = FixedWindowLimiter(2, 1000)
assert_equal(rl.allow('u', 900), True)
assert_equal(rl.allow('u', 950), True)
assert_equal(rl.allow('u', 999), False, 'same window')
assert_equal(rl.allow('u', 1000), True, 'window boundary')
assert_equal(rl.allow('u', 1001), True)
assert_equal(rl.allow('u', 1002), False)`,
        },
        {
          name: 'users are independent',
          code: String.raw`rl = FixedWindowLimiter(1, 1000)
assert_equal(rl.allow('a', 0), True)
assert_equal(rl.allow('b', 0), True)
assert_equal(rl.allow('a', 1), False)
assert_equal(rl.allow('b', 1), False)`,
        },
        {
          name: 'long gap resets',
          code: String.raw`rl = FixedWindowLimiter(1, 1000)
assert_equal(rl.allow('u', 0), True)
assert_equal(rl.allow('u', 5_000_500), True)
assert_equal(rl.allow('u', 5_000_999), False)`,
        },
        {
          name: 'limit 0 denies everything',
          code: String.raw`rl = FixedWindowLimiter(0, 1000)
assert_equal(rl.allow('u', 0), False)
assert_equal(rl.allow('u', 5000), False)`,
        },
      ],
    },
    {
      prompt: `Fixed windows allow bursts of \`2 * limit\` across a boundary. Add a token bucket:

\`\`\`python
class TokenBucket:
    def __init__(self, capacity: float, refill_per_sec: float) -> None: ...
    def allow(self, user_id: str, now: int, cost: float = 1) -> bool: ...
    def tokens(self, user_id: str, now: int) -> float: ...   # current balance, after refill
\`\`\`

- A new user starts with a full bucket of \`capacity\` tokens.
- Tokens refill continuously at \`refill_per_sec\` (fractions count: 250 ms at 2/s adds 0.5), never above \`capacity\`.
- A request is allowed if the bucket holds at least \`cost\` tokens; then \`cost\` is taken. A denied request takes nothing.

Then combine two buckets so a request needs both a per-user token and a global one:

\`\`\`python
class CompositeLimiter:
    def __init__(self, per_user: TokenBucket, global_bucket: TokenBucket) -> None: ...
    def allow(self, user_id: str, now: int, cost: float = 1) -> bool: ...
\`\`\`

The global bucket is one shared bucket for all users. A request denied by either limit must not consume from the other.`,
      tests: [
        {
          name: 'starts full and drains',
          code: String.raw`b = TokenBucket(3, 1)
assert_equal(b.allow('u', 0), True)
assert_equal(b.allow('u', 0), True)
assert_equal(b.allow('u', 0), True)
assert_equal(b.allow('u', 0), False)
assert_equal(b.tokens('u', 0), 0)`,
        },
        {
          name: 'fractional refill',
          code: String.raw`b = TokenBucket(2, 2)
b.allow('u', 0); b.allow('u', 0)
assert_equal(b.tokens('u', 250), 0.5)
assert_equal(b.allow('u', 250), False, 'half a token is not enough')
assert_equal(b.allow('u', 500), True)
assert_equal(b.tokens('u', 500), 0)`,
        },
        {
          name: 'refill caps at capacity',
          code: String.raw`b = TokenBucket(2, 10)
b.allow('u', 0)
assert_equal(b.tokens('u', 1_000_000), 2)
assert_equal(b.allow('u', 1_000_000), True)
assert_equal(b.allow('u', 1_000_000), True)
assert_equal(b.allow('u', 1_000_000), False)`,
        },
        {
          name: 'cost and denied requests take nothing',
          code: String.raw`b = TokenBucket(5, 1)
assert_equal(b.allow('u', 0, 3), True)
assert_equal(b.allow('u', 0, 3), False, 'only 2 left')
assert_equal(b.tokens('u', 0), 2, 'denial took nothing')
assert_equal(b.allow('u', 0, 2), True)
assert_equal(b.allow('x', 0, 6), False, 'cost above capacity')
assert_equal(b.tokens('x', 0), 5)`,
        },
        {
          name: 'users have separate buckets',
          code: String.raw`b = TokenBucket(1, 1)
assert_equal(b.allow('a', 0), True)
assert_equal(b.allow('a', 0), False)
assert_equal(b.allow('b', 0), True)`,
        },
        {
          name: 'composite: user denial spares the global bucket',
          code: String.raw`users = TokenBucket(2, 0.001)
glob = TokenBucket(3, 0.001)
rl = CompositeLimiter(users, glob)
assert_equal(rl.allow('a', 0), True)
assert_equal(rl.allow('a', 0), True)
assert_equal(rl.allow('a', 0), False, 'a over its own limit')
assert_equal(rl.allow('a', 0), False)
assert_equal(rl.allow('b', 0), True, 'global still had 1 left')
assert_equal(rl.allow('c', 0), False, 'global empty')`,
        },
        {
          name: 'composite: global denial spares the user bucket',
          code: String.raw`users = TokenBucket(2, 1)
glob = TokenBucket(1, 1)
rl = CompositeLimiter(users, glob)
assert_equal(rl.allow('a', 0), True)
assert_equal(rl.allow('b', 0), False, 'global empty')
assert_equal(rl.allow('b', 0), False)
assert_equal(users.tokens('b', 0), 2, 'b kept its tokens')
assert_equal(rl.allow('b', 1000), True, 'global refilled')
assert_equal(users.tokens('b', 1000), 1)`,
        },
      ],
    },
    {
      prompt: `Add two sliding-window limiters with the same \`allow(user_id, now)\` API:

\`\`\`python
class SlidingWindowLog:
    def __init__(self, limit: int, window_ms: int) -> None: ...
    def allow(self, user_id: str, now: int) -> bool: ...
    def retry_after(self, user_id: str, now: int) -> int: ...

class SlidingWindowCounter:
    def __init__(self, limit: int, window_ms: int) -> None: ...
    def allow(self, user_id: str, now: int) -> bool: ...
\`\`\`

- **Log**: remember each allowed request's timestamp. A request at \`t\` still counts at \`now\` while \`t > now - window_ms\`. Allow if fewer than \`limit\` requests count.
- **Counter**: keep only counts for the current aligned window and the one before it. Estimate \`prev * (window_ms - elapsed) / window_ms + curr\`, where \`elapsed = now - current_window_start\`, and allow (incrementing \`curr\`) if the estimate is **< limit**. If the previous window is not the one right before, \`prev\` is 0.
- \`retry_after(user_id, now)\` returns the ms until a request would be allowed: 0 if it would be allowed now. It does not consume anything.
- Also add \`retry_after(user_id, now)\` to \`TokenBucket\` for a cost of 1, rounded up to a whole ms.`,
      tests: [
        {
          name: 'log: window slides',
          code: String.raw`rl = SlidingWindowLog(2, 1000)
assert_equal(rl.allow('u', 0), True)
assert_equal(rl.allow('u', 500), True)
assert_equal(rl.allow('u', 999), False)
assert_equal(rl.allow('u', 1000), True, 'request at 0 aged out')
assert_equal(rl.allow('u', 1001), False)
assert_equal(rl.allow('u', 1500), True)`,
        },
        {
          name: 'log: denied requests are not recorded',
          code: String.raw`rl = SlidingWindowLog(1, 1000)
assert_equal(rl.allow('u', 0), True)
for t in range(100, 1000, 100):
    assert_equal(rl.allow('u', t), False, 'at ' + str(t))
assert_equal(rl.allow('u', 1000), True)
assert_equal(rl.allow('v', 1000), True, 'other user')`,
        },
        {
          name: 'log: retryAfter',
          code: String.raw`rl = SlidingWindowLog(2, 1000)
assert_equal(rl.retry_after('u', 0), 0, 'unknown user')
rl.allow('u', 0); rl.allow('u', 300)
assert_equal(rl.retry_after('u', 400), 600)
assert_equal(rl.retry_after('u', 400), 600, 'does not consume')
assert_equal(rl.allow('u', 999), False)
assert_equal(rl.allow('u', 1000), True)
assert_equal(rl.retry_after('u', 1000), 300)
assert_equal(rl.retry_after('u', 1300), 0)`,
        },
        {
          name: 'counter: weights the previous window',
          code: String.raw`rl = SlidingWindowCounter(10, 1000)
for i in range(10):
    assert_equal(rl.allow('u', 100 + i), True)
assert_equal(rl.allow('u', 200), False, 'current window full')
assert_equal(rl.allow('u', 1000), False, 'prev counts fully at the boundary')
n = 0
while rl.allow('u', 1500):
    n += 1
assert_equal(n, 5, 'half of prev remains at the midpoint')`,
        },
        {
          name: 'counter: prev decays as the window advances',
          code: String.raw`rl = SlidingWindowCounter(4, 1000)
for _ in range(4):
    rl.allow('u', 0)
assert_equal(rl.allow('u', 1250), True, '3 + 0 < 4')
assert_equal(rl.allow('u', 1250), False, '3 + 1 = 4')
assert_equal(rl.allow('u', 1750), True, '1 + 1 < 4')
assert_equal(rl.allow('u', 1750), True, '1 + 2 < 4')
assert_equal(rl.allow('u', 1750), False)`,
        },
        {
          name: 'counter: a skipped window resets prev',
          code: String.raw`rl = SlidingWindowCounter(2, 1000)
rl.allow('u', 0); rl.allow('u', 0)
assert_equal(rl.allow('u', 2000), True)
assert_equal(rl.allow('u', 2000), True)
assert_equal(rl.allow('u', 2000), False)
assert_equal(rl.allow('v', 2000), True, 'other user')`,
        },
        {
          name: 'token bucket: retryAfter',
          code: String.raw`b = TokenBucket(1, 2)
assert_equal(b.retry_after('u', 0), 0)
b.allow('u', 0)
assert_equal(b.retry_after('u', 0), 500)
assert_equal(b.retry_after('u', 200), 300)
assert_equal(b.allow('u', 499), False)
assert_equal(b.allow('u', 500), True)
slow = TokenBucket(1, 3)
slow.allow('u', 0)
assert_equal(slow.retry_after('u', 0), 334, 'rounded up')`,
        },
      ],
    },
  ],
};
