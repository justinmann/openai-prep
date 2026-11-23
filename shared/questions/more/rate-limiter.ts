import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'rate-limiter',
  title: 'Rate Limiter',
  difficulty: 'medium',
  tags: ['design', 'sliding window', 'queue'],
  summary:
    'Fixed-window, token-bucket and sliding-window rate limiters with per-user and global limits.',
  companies: ['stripe', 'netflix', 'google', 'amazon'],
  sources: [
    'https://www.techinterview.net/questions/stripe-system-design-interview-questions',
    'https://copilotinterview.com/blog/netflix-coding-interview-questions',
    'https://leetcode.com/problems/logger-rate-limiter/',
  ],
  prompt: `An API gateway needs to throttle callers. Build a few limiters that decide, per request, whether to let it through.

Time is always passed in as a millisecond timestamp. Timestamps never go backwards.

\`\`\`ts
class FixedWindowLimiter {
  constructor(limit: number, windowMs: number)
  allow(userId: string, now: number): boolean
}
\`\`\`

- Time is cut into aligned windows \`[0, windowMs)\`, \`[windowMs, 2 * windowMs)\`, ...
- Each user may make at most \`limit\` allowed requests per window. Denied requests do not count.
- Users are limited independently.

\`\`\`ts
const rl = new FixedWindowLimiter(2, 1000);
rl.allow('u', 10);    // true
rl.allow('u', 20);    // true
rl.allow('u', 999);   // false
rl.allow('u', 1000);  // true: a new window
\`\`\``,
  starter: `class FixedWindowLimiter {
  constructor(private limit: number, private windowMs: number) {}

  allow(userId: string, now: number): boolean {
    // TODO
    return false;
  }
}
`,
  parts: [
    {
      title: 'Part 1: Fixed window',
      prompt:
        'Implement `FixedWindowLimiter`. A `limit` of 0 denies everything.',
      tests: [
        {
          name: 'allows up to the limit',
          code: String.raw`const rl = new FixedWindowLimiter(3, 1000);
assertEqual(rl.allow('u', 0), true);
assertEqual(rl.allow('u', 1), true);
assertEqual(rl.allow('u', 2), true);
assertEqual(rl.allow('u', 3), false);
assertEqual(rl.allow('u', 4), false);`,
        },
        {
          name: 'windows are aligned, not rolling',
          code: String.raw`const rl = new FixedWindowLimiter(2, 1000);
assertEqual(rl.allow('u', 900), true);
assertEqual(rl.allow('u', 950), true);
assertEqual(rl.allow('u', 999), false, 'same window');
assertEqual(rl.allow('u', 1000), true, 'window boundary');
assertEqual(rl.allow('u', 1001), true);
assertEqual(rl.allow('u', 1002), false);`,
        },
        {
          name: 'users are independent',
          code: String.raw`const rl = new FixedWindowLimiter(1, 1000);
assertEqual(rl.allow('a', 0), true);
assertEqual(rl.allow('b', 0), true);
assertEqual(rl.allow('a', 1), false);
assertEqual(rl.allow('b', 1), false);`,
        },
        {
          name: 'long gap resets',
          code: String.raw`const rl = new FixedWindowLimiter(1, 1000);
assertEqual(rl.allow('u', 0), true);
assertEqual(rl.allow('u', 5_000_500), true);
assertEqual(rl.allow('u', 5_000_999), false);`,
        },
        {
          name: 'limit 0 denies everything',
          code: String.raw`const rl = new FixedWindowLimiter(0, 1000);
assertEqual(rl.allow('u', 0), false);
assertEqual(rl.allow('u', 5000), false);`,
        },
      ],
    },
    {
      title: 'Part 2: Token bucket and combined limits',
      prompt: `Fixed windows allow bursts of \`2 * limit\` across a boundary. Add a token bucket:

\`\`\`ts
class TokenBucket {
  constructor(capacity: number, refillPerSec: number)
  allow(userId: string, now: number, cost?: number): boolean   // cost defaults to 1
  tokens(userId: string, now: number): number                  // current balance, after refill
}
\`\`\`

- A new user starts with a full bucket of \`capacity\` tokens.
- Tokens refill continuously at \`refillPerSec\` (fractions count: 250 ms at 2/s adds 0.5), never above \`capacity\`.
- A request is allowed if the bucket holds at least \`cost\` tokens; then \`cost\` is taken. A denied request takes nothing.

Then combine two buckets so a request needs both a per-user token and a global one:

\`\`\`ts
class CompositeLimiter {
  constructor(perUser: TokenBucket, globalBucket: TokenBucket)
  allow(userId: string, now: number, cost?: number): boolean
}
\`\`\`

The global bucket is one shared bucket for all users. A request denied by either limit must not consume from the other.`,
      tests: [
        {
          name: 'starts full and drains',
          code: String.raw`const b = new TokenBucket(3, 1);
assertEqual(b.allow('u', 0), true);
assertEqual(b.allow('u', 0), true);
assertEqual(b.allow('u', 0), true);
assertEqual(b.allow('u', 0), false);
assertEqual(b.tokens('u', 0), 0);`,
        },
        {
          name: 'fractional refill',
          code: String.raw`const b = new TokenBucket(2, 2);
b.allow('u', 0); b.allow('u', 0);
assertEqual(b.tokens('u', 250), 0.5);
assertEqual(b.allow('u', 250), false, 'half a token is not enough');
assertEqual(b.allow('u', 500), true);
assertEqual(b.tokens('u', 500), 0);`,
        },
        {
          name: 'refill caps at capacity',
          code: String.raw`const b = new TokenBucket(2, 10);
b.allow('u', 0);
assertEqual(b.tokens('u', 1_000_000), 2);
assertEqual(b.allow('u', 1_000_000), true);
assertEqual(b.allow('u', 1_000_000), true);
assertEqual(b.allow('u', 1_000_000), false);`,
        },
        {
          name: 'cost and denied requests take nothing',
          code: String.raw`const b = new TokenBucket(5, 1);
assertEqual(b.allow('u', 0, 3), true);
assertEqual(b.allow('u', 0, 3), false, 'only 2 left');
assertEqual(b.tokens('u', 0), 2, 'denial took nothing');
assertEqual(b.allow('u', 0, 2), true);
assertEqual(b.allow('x', 0, 6), false, 'cost above capacity');
assertEqual(b.tokens('x', 0), 5);`,
        },
        {
          name: 'users have separate buckets',
          code: String.raw`const b = new TokenBucket(1, 1);
assertEqual(b.allow('a', 0), true);
assertEqual(b.allow('a', 0), false);
assertEqual(b.allow('b', 0), true);`,
        },
        {
          name: 'composite: user denial spares the global bucket',
          code: String.raw`const users = new TokenBucket(2, 0.001);
const global = new TokenBucket(3, 0.001);
const rl = new CompositeLimiter(users, global);
assertEqual(rl.allow('a', 0), true);
assertEqual(rl.allow('a', 0), true);
assertEqual(rl.allow('a', 0), false, 'a over its own limit');
assertEqual(rl.allow('a', 0), false);
assertEqual(rl.allow('b', 0), true, 'global still had 1 left');
assertEqual(rl.allow('c', 0), false, 'global empty');`,
        },
        {
          name: 'composite: global denial spares the user bucket',
          code: String.raw`const users = new TokenBucket(2, 1);
const global = new TokenBucket(1, 1);
const rl = new CompositeLimiter(users, global);
assertEqual(rl.allow('a', 0), true);
assertEqual(rl.allow('b', 0), false, 'global empty');
assertEqual(rl.allow('b', 0), false);
assertEqual(users.tokens('b', 0), 2, 'b kept its tokens');
assertEqual(rl.allow('b', 1000), true, 'global refilled');
assertEqual(users.tokens('b', 1000), 1);`,
        },
      ],
    },
    {
      title: 'Part 3: Sliding windows and retry-after',
      prompt: `Add two sliding-window limiters with the same \`allow(userId, now)\` API:

\`\`\`ts
class SlidingWindowLog {
  constructor(limit: number, windowMs: number)
  allow(userId: string, now: number): boolean
  retryAfter(userId: string, now: number): number
}

class SlidingWindowCounter {
  constructor(limit: number, windowMs: number)
  allow(userId: string, now: number): boolean
}
\`\`\`

- **Log**: remember each allowed request's timestamp. A request at \`t\` still counts at \`now\` while \`t > now - windowMs\`. Allow if fewer than \`limit\` requests count.
- **Counter**: keep only counts for the current aligned window and the one before it. Estimate \`prev * (windowMs - elapsed) / windowMs + curr\`, where \`elapsed = now - currentWindowStart\`, and allow (incrementing \`curr\`) if the estimate is **< limit**. If the previous window is not the one right before, \`prev\` is 0.
- \`retryAfter(userId, now)\` returns the ms until a request would be allowed: 0 if it would be allowed now. It does not consume anything.
- Also add \`retryAfter(userId, now)\` to \`TokenBucket\` for a cost of 1, rounded up to a whole ms.`,
      tests: [
        {
          name: 'log: window slides',
          code: String.raw`const rl = new SlidingWindowLog(2, 1000);
assertEqual(rl.allow('u', 0), true);
assertEqual(rl.allow('u', 500), true);
assertEqual(rl.allow('u', 999), false);
assertEqual(rl.allow('u', 1000), true, 'request at 0 aged out');
assertEqual(rl.allow('u', 1001), false);
assertEqual(rl.allow('u', 1500), true);`,
        },
        {
          name: 'log: denied requests are not recorded',
          code: String.raw`const rl = new SlidingWindowLog(1, 1000);
assertEqual(rl.allow('u', 0), true);
for (let t = 100; t < 1000; t += 100) assertEqual(rl.allow('u', t), false, 'at ' + t);
assertEqual(rl.allow('u', 1000), true);
assertEqual(rl.allow('v', 1000), true, 'other user');`,
        },
        {
          name: 'log: retryAfter',
          code: String.raw`const rl = new SlidingWindowLog(2, 1000);
assertEqual(rl.retryAfter('u', 0), 0, 'unknown user');
rl.allow('u', 0); rl.allow('u', 300);
assertEqual(rl.retryAfter('u', 400), 600);
assertEqual(rl.retryAfter('u', 400), 600, 'does not consume');
assertEqual(rl.allow('u', 999), false);
assertEqual(rl.allow('u', 1000), true);
assertEqual(rl.retryAfter('u', 1000), 300);
assertEqual(rl.retryAfter('u', 1300), 0);`,
        },
        {
          name: 'counter: weights the previous window',
          code: String.raw`const rl = new SlidingWindowCounter(10, 1000);
for (let i = 0; i < 10; i++) assertEqual(rl.allow('u', 100 + i), true);
assertEqual(rl.allow('u', 200), false, 'current window full');
assertEqual(rl.allow('u', 1000), false, 'prev counts fully at the boundary');
let n = 0;
while (rl.allow('u', 1500)) n++;
assertEqual(n, 5, 'half of prev remains at the midpoint');`,
        },
        {
          name: 'counter: prev decays as the window advances',
          code: String.raw`const rl = new SlidingWindowCounter(4, 1000);
for (let i = 0; i < 4; i++) rl.allow('u', 0);
assertEqual(rl.allow('u', 1250), true, '3 + 0 < 4');
assertEqual(rl.allow('u', 1250), false, '3 + 1 = 4');
assertEqual(rl.allow('u', 1750), true, '1 + 1 < 4');
assertEqual(rl.allow('u', 1750), true, '1 + 2 < 4');
assertEqual(rl.allow('u', 1750), false);`,
        },
        {
          name: 'counter: a skipped window resets prev',
          code: String.raw`const rl = new SlidingWindowCounter(2, 1000);
rl.allow('u', 0); rl.allow('u', 0);
assertEqual(rl.allow('u', 2000), true);
assertEqual(rl.allow('u', 2000), true);
assertEqual(rl.allow('u', 2000), false);
assertEqual(rl.allow('v', 2000), true, 'other user');`,
        },
        {
          name: 'token bucket: retryAfter',
          code: String.raw`const b = new TokenBucket(1, 2);
assertEqual(b.retryAfter('u', 0), 0);
b.allow('u', 0);
assertEqual(b.retryAfter('u', 0), 500);
assertEqual(b.retryAfter('u', 200), 300);
assertEqual(b.allow('u', 499), false);
assertEqual(b.allow('u', 500), true);
const slow = new TokenBucket(1, 3);
slow.allow('u', 0);
assertEqual(slow.retryAfter('u', 0), 334, 'rounded up');`,
        },
      ],
    },
  ],
  solution: String.raw`const EPS = 1e-9;

class FixedWindowLimiter {
  private windows = new Map<string, { start: number; count: number }>();

  constructor(private limit: number, private windowMs: number) {}

  allow(userId: string, now: number): boolean {
    const start = Math.floor(now / this.windowMs) * this.windowMs;
    let w = this.windows.get(userId);
    if (!w || w.start !== start) {
      w = { start, count: 0 };
      this.windows.set(userId, w);
    }
    if (w.count >= this.limit) return false;
    w.count++;
    return true;
  }
}

class TokenBucket {
  private buckets = new Map<string, { tokens: number; last: number }>();

  constructor(private capacity: number, private refillPerSec: number) {}

  tokens(userId: string, now: number): number {
    return this.refill(userId, now).tokens;
  }

  canAllow(userId: string, now: number, cost = 1): boolean {
    return this.refill(userId, now).tokens + EPS >= cost;
  }

  allow(userId: string, now: number, cost = 1): boolean {
    if (!this.canAllow(userId, now, cost)) return false;
    const b = this.refill(userId, now);
    b.tokens = Math.max(0, b.tokens - cost);
    return true;
  }

  retryAfter(userId: string, now: number): number {
    const missing = 1 - this.refill(userId, now).tokens;
    if (missing <= EPS) return 0;
    return Math.ceil((missing * 1000) / this.refillPerSec - EPS);
  }

  private refill(userId: string, now: number): { tokens: number; last: number } {
    let b = this.buckets.get(userId);
    if (!b) {
      b = { tokens: this.capacity, last: now };
      this.buckets.set(userId, b);
    }
    const added = ((now - b.last) * this.refillPerSec) / 1000;
    b.tokens = Math.min(this.capacity, b.tokens + added);
    b.last = now;
    return b;
  }
}

class CompositeLimiter {
  private static GLOBAL = '*';

  constructor(private perUser: TokenBucket, private globalBucket: TokenBucket) {}

  allow(userId: string, now: number, cost = 1): boolean {
    // Check both before taking from either.
    if (!this.perUser.canAllow(userId, now, cost)) return false;
    if (!this.globalBucket.canAllow(CompositeLimiter.GLOBAL, now, cost)) return false;
    this.perUser.allow(userId, now, cost);
    this.globalBucket.allow(CompositeLimiter.GLOBAL, now, cost);
    return true;
  }
}

class SlidingWindowLog {
  // Allowed timestamps per user, oldest first; head is the first live index.
  private logs = new Map<string, { times: number[]; head: number }>();

  constructor(private limit: number, private windowMs: number) {}

  allow(userId: string, now: number): boolean {
    const log = this.prune(userId, now);
    if (log.times.length - log.head >= this.limit) return false;
    log.times.push(now);
    return true;
  }

  retryAfter(userId: string, now: number): number {
    const log = this.prune(userId, now);
    const live = log.times.length - log.head;
    if (live < this.limit) return 0;
    // The (live - limit + 1)th oldest must age out.
    return log.times[log.head + live - this.limit]! + this.windowMs - now;
  }

  private prune(userId: string, now: number): { times: number[]; head: number } {
    let log = this.logs.get(userId);
    if (!log) {
      log = { times: [], head: 0 };
      this.logs.set(userId, log);
    }
    while (log.head < log.times.length && log.times[log.head]! <= now - this.windowMs) log.head++;
    // Compact occasionally so memory stays proportional to the live window.
    if (log.head > 64 && log.head * 2 > log.times.length) {
      log.times = log.times.slice(log.head);
      log.head = 0;
    }
    return log;
  }
}

class SlidingWindowCounter {
  private state = new Map<string, { start: number; curr: number; prev: number }>();

  constructor(private limit: number, private windowMs: number) {}

  allow(userId: string, now: number): boolean {
    const start = Math.floor(now / this.windowMs) * this.windowMs;
    let s = this.state.get(userId);
    if (!s) {
      s = { start, curr: 0, prev: 0 };
      this.state.set(userId, s);
    } else if (s.start !== start) {
      s.prev = start - s.start === this.windowMs ? s.curr : 0;
      s.curr = 0;
      s.start = start;
    }
    const weight = (this.windowMs - (now - start)) / this.windowMs;
    if (s.prev * weight + s.curr >= this.limit - EPS) return false;
    s.curr++;
    return true;
  }
}
`,
};
