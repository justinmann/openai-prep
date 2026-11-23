import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Customers get GPU credits that expire. Implement:

\`\`\`python
class Credits:
    def grant(self, id: str, amount: int, timestamp: int, expires_in: int) -> None: ...
    def subtract(self, amount: int, timestamp: int) -> None: ...
    def get_balance(self, timestamp: int) -> int: ...
\`\`\`

- A grant is usable at times \`t\` with \`timestamp <= t < timestamp + expires_in\`.
- \`subtract\` consumes from grants valid at that moment, **soonest-expiring first**. If there is not enough, it consumes everything available and the shortfall is dropped (the balance never goes negative).
- At the same timestamp, grants apply before subtractions.`,
  starter: String.raw`class Credits:
    def grant(self, id: str, amount: int, timestamp: int, expires_in: int) -> None:
        # TODO
        pass

    def subtract(self, amount: int, timestamp: int) -> None:
        # TODO
        pass

    def get_balance(self, timestamp: int) -> int:
        # TODO
        return 0
`,
  parts: [
    {
      tests: [
        {
          name: 'grant and expire',
          code: String.raw`c = Credits()
c.grant('a', 10, 0, 10)
assert_equal(c.get_balance(0), 10)
assert_equal(c.get_balance(9), 10)
assert_equal(c.get_balance(10), 0, 'expired at 0 + 10')`,
        },
        {
          name: 'subtract uses soonest-expiring first',
          code: String.raw`c = Credits()
c.grant('long', 10, 0, 100)
c.grant('short', 5, 0, 10)
c.subtract(7, 1)
assert_equal(c.get_balance(1), 8)
assert_equal(c.get_balance(50), 8, 'the 5 short credits were spent, so nothing extra expires')`,
        },
        {
          name: 'balance never goes negative',
          code: String.raw`c = Credits()
c.grant('a', 3, 0, 100)
c.subtract(10, 1)
assert_equal(c.get_balance(2), 0)
c.grant('b', 4, 3, 100)
assert_equal(c.get_balance(3), 4, 'shortfall was dropped, not owed')`,
        },
        {
          name: 'expired grants cannot be spent',
          code: String.raw`c = Credits()
c.grant('a', 5, 0, 5)
c.grant('b', 5, 0, 50)
c.subtract(3, 5)
assert_equal(c.get_balance(5), 2)`,
        },
      ],
    },
    {
      prompt:
        'Calls may now arrive in **any** order. `get_balance(t)` must equal the result of applying every event with timestamp `<= t` in timestamp order (grants before subtractions at a tie).',
      tests: [
        {
          name: 'late grant changes an earlier subtraction',
          code: String.raw`c = Credits()
c.subtract(5, 10)
c.grant('a', 8, 0, 100)
assert_equal(c.get_balance(5), 8)
assert_equal(c.get_balance(10), 3)`,
        },
        {
          name: 'late subtraction consumes the right grant',
          code: String.raw`c = Credits()
c.grant('long', 10, 0, 100)
c.grant('short', 5, 0, 20)
assert_equal(c.get_balance(30), 10)
c.subtract(5, 1)
assert_equal(c.get_balance(30), 10, 'the subtraction should have taken the short grant')
assert_equal(c.get_balance(5), 10)`,
        },
        {
          name: 'queries in the past are stable',
          code: String.raw`c = Credits()
c.grant('a', 10, 0, 1000)
c.subtract(1, 100)
c.subtract(1, 200)
c.subtract(1, 300)
assert_equal(c.get_balance(250), 8)
assert_equal(c.get_balance(50), 10)
assert_equal(c.get_balance(300), 7)`,
        },
        {
          name: 'tie: grant applies before subtract',
          code: String.raw`c = Credits()
c.subtract(4, 5)
c.grant('a', 10, 5, 10)
assert_equal(c.get_balance(5), 6)`,
        },
      ],
    },
  ],
  solution: String.raw`# Store events; replay on query. Simple, correct for out-of-order input.
# (Follow-up: cache replays or keep snapshots if queries dominate.)
GRANT, SUB = 0, 1


class Credits:
    def __init__(self) -> None:
        # (timestamp, kind, seq, amount, expires); sorting the tuples puts
        # grants before subtractions at a tie, then arrival order.
        self.events: list[tuple[int, int, int, int, int]] = []

    def grant(self, id: str, amount: int, timestamp: int, expires_in: int) -> None:
        self.events.append((timestamp, GRANT, len(self.events), amount, timestamp + expires_in))

    def subtract(self, amount: int, timestamp: int) -> None:
        self.events.append((timestamp, SUB, len(self.events), amount, 0))

    def get_balance(self, timestamp: int) -> int:
        live: list[list[int]] = []  # [expires, left]
        for t, kind, _, amount, expires in sorted(e for e in self.events if e[0] <= timestamp):
            if kind == GRANT:
                live.append([expires, amount])
                continue
            need = amount
            for g in sorted((g for g in live if g[0] > t and g[1] > 0), key=lambda g: g[0]):
                take = min(g[1], need)
                g[1] -= take
                need -= take
                if need == 0:
                    break
        return sum(left for expires, left in live if expires > timestamp)
`,
};
