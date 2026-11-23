import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Build an in-memory banking system. Every operation carries a \`timestamp\`, and timestamps strictly increase across calls.

\`\`\`python
class Bank:
    def create_account(self, id: str, timestamp: int) -> bool: ...
    def deposit(self, id: str, amount: int, timestamp: int) -> int | None: ...
    def transfer(self, src: str, dst: str, amount: int, timestamp: int) -> int | None: ...
\`\`\`

- \`create_account\` returns \`False\` if the id already exists, otherwise \`True\`. New accounts start at balance 0.
- \`deposit\` adds money and returns the new balance.
- \`transfer\` moves money and returns the **sender's** new balance.
- Return \`None\` for anything invalid: an unknown account, a non-positive amount, a transfer to the same account, or a transfer larger than the sender's balance. A failed call changes nothing.

\`\`\`python
bank = Bank()
bank.create_account('a', 1)       # True
bank.deposit('a', 100, 2)         # 100
bank.create_account('b', 3)       # True
bank.transfer('a', 'b', 30, 4)    # 70
bank.transfer('a', 'b', 500, 5)   # None
\`\`\``,
  starter: String.raw`class Bank:
    def create_account(self, id: str, timestamp: int) -> bool:
        # TODO
        return False

    def deposit(self, id: str, amount: int, timestamp: int) -> int | None:
        # TODO
        return None

    def transfer(self, src: str, dst: str, amount: int, timestamp: int) -> int | None:
        # TODO
        return None
`,
  parts: [
    {
      prompt: 'Implement the three operations above with full validation.',
      tests: [
        {
          name: 'create accounts',
          code: String.raw`bank = Bank()
assert_equal(bank.create_account('a', 1), True)
assert_equal(bank.create_account('b', 2), True)
assert_equal(bank.create_account('a', 3), False, 'duplicate id')`,
        },
        {
          name: 'deposits accumulate',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
assert_equal(bank.deposit('a', 100, 2), 100)
assert_equal(bank.deposit('a', 25, 3), 125)`,
        },
        {
          name: 'invalid deposits',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
assert_equal(bank.deposit('nope', 10, 2), None, 'unknown account')
assert_equal(bank.deposit('a', 0, 3), None, 'zero amount')
assert_equal(bank.deposit('a', -5, 4), None, 'negative amount')
assert_equal(bank.deposit('a', 1, 5), 1, 'failed calls changed nothing')`,
        },
        {
          name: 'transfer returns sender balance',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 100, 3)
assert_equal(bank.transfer('a', 'b', 30, 4), 70)
assert_equal(bank.deposit('b', 1, 5), 31, 'receiver got the money')`,
        },
        {
          name: 'invalid transfers change nothing',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 50, 3)
assert_equal(bank.transfer('a', 'b', 51, 4), None, 'insufficient funds')
assert_equal(bank.transfer('a', 'a', 10, 5), None, 'same account')
assert_equal(bank.transfer('a', 'zzz', 10, 6), None, 'unknown receiver')
assert_equal(bank.transfer('zzz', 'a', 10, 7), None, 'unknown sender')
assert_equal(bank.transfer('a', 'b', 0, 8), None, 'zero amount')
assert_equal(bank.deposit('a', 1, 9), 51)
assert_equal(bank.deposit('b', 1, 10), 1)`,
        },
        {
          name: 'transfer the whole balance',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 40, 3)
assert_equal(bank.transfer('a', 'b', 40, 4), 0)
assert_equal(bank.transfer('a', 'b', 1, 5), None, 'now empty')`,
        },
      ],
    },
    {
      prompt: `Add:

\`\`\`python
def top_spenders(self, n: int, timestamp: int) -> list[str]: ...
def schedule_payment(self, id: str, amount: int, at: int, timestamp: int) -> str | None: ...
def cancel_payment(self, id: str, payment_id: str, timestamp: int) -> bool: ...
\`\`\`

- **Outgoing** is the total of an account's successful transfers out plus its executed payments. \`top_spenders\` returns up to \`n\` entries formatted \`"id(total)"\`, highest total first, ties by id ascending. Accounts with 0 outgoing are included.
- \`schedule_payment\` returns ids \`"payment1"\`, \`"payment2"\`, ... (one counter for the whole bank), or \`None\` for an unknown account, a non-positive amount, or \`at <= timestamp\`. A payment withdraws money from the bank.
- A payment is **due** once an operation's timestamp is \`>= at\`. Before doing anything else, every operation first executes all due payments, ordered by \`at\`, ties by scheduling order. A due payment the account cannot afford is skipped and dropped (not retried).
- \`cancel_payment\` returns \`True\` only if the payment is still pending and belongs to \`id\`. A payment that already ran or was skipped cannot be cancelled.

\`\`\`python
bank.schedule_payment('a', 20, 10, 5)  # "payment1"
bank.deposit('a', 5, 10)               # payment1 runs first, then the deposit
\`\`\``,
      tests: [
        {
          name: 'top spenders by outgoing total',
          code: String.raw`bank = Bank()
for i, id in enumerate(['a', 'b', 'c', 'd']):
    bank.create_account(id, i + 1)
    bank.deposit(id, 100, i + 10)
bank.transfer('a', 'b', 30, 20)
bank.transfer('c', 'b', 50, 21)
bank.transfer('a', 'c', 20, 22)
assert_equal(bank.top_spenders(2, 23), ['a(50)', 'c(50)'], 'tie broken by id')
assert_equal(bank.top_spenders(10, 24), ['a(50)', 'c(50)', 'b(0)', 'd(0)'])`,
        },
        {
          name: 'failed transfers do not count',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 10, 3)
bank.transfer('a', 'b', 999, 4)
assert_equal(bank.top_spenders(1, 5), ['a(0)'])`,
        },
        {
          name: 'payment runs when its time comes',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
bank.deposit('a', 100, 2)
assert_equal(bank.schedule_payment('a', 30, 10, 3), 'payment1')
assert_equal(bank.deposit('a', 1, 9), 101, 'not due yet')
assert_equal(bank.deposit('a', 1, 10), 72, 'due at exactly at, runs before the deposit')
assert_equal(bank.top_spenders(1, 11), ['a(30)'], 'payments count as outgoing')`,
        },
        {
          name: 'payment ids and validation',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
assert_equal(bank.schedule_payment('a', 5, 100, 3), 'payment1')
assert_equal(bank.schedule_payment('nope', 5, 100, 4), None)
assert_equal(bank.schedule_payment('a', 0, 100, 5), None)
assert_equal(bank.schedule_payment('a', 5, 6, 6), None, 'at must be in the future')
assert_equal(bank.schedule_payment('b', 5, 100, 7), 'payment2', 'one counter for the bank')`,
        },
        {
          name: 'due payments run in time order, unaffordable ones are skipped',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
bank.deposit('a', 50, 2)
bank.schedule_payment('a', 40, 20, 3)  # payment1
bank.schedule_payment('a', 30, 10, 4)  # payment2, earlier at
bank.schedule_payment('a', 15, 20, 5)  # payment3, same at as payment1
# At 25: payment2 (30) runs, payment1 (40) is skipped, payment3 (15) runs.
assert_equal(bank.deposit('a', 1, 25), 6)
assert_equal(bank.deposit('a', 100, 26), 106, 'skipped payment is not retried')`,
        },
        {
          name: 'cancel a pending payment',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 100, 3)
p = bank.schedule_payment('a', 60, 10, 4)
assert_equal(bank.cancel_payment('b', p, 5), False, 'wrong owner')
assert_equal(bank.cancel_payment('a', 'payment99', 6), False, 'unknown id')
assert_equal(bank.cancel_payment('a', p, 7), True)
assert_equal(bank.cancel_payment('a', p, 8), False, 'already cancelled')
assert_equal(bank.deposit('a', 1, 20), 101, 'cancelled payment never runs')`,
        },
        {
          name: 'cannot cancel once due',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
bank.deposit('a', 100, 2)
p = bank.schedule_payment('a', 10, 5, 3)
assert_equal(bank.cancel_payment('a', p, 5), False, 'it ran first')
assert_equal(bank.deposit('a', 1, 6), 91)`,
        },
      ],
    },
    {
      prompt: `Add:

\`\`\`python
def merge_accounts(self, a: str, b: str, timestamp: int) -> bool: ...
def get_balance(self, id: str, timestamp: int, time_at: int) -> int | None: ...
\`\`\`

- \`merge_accounts\` folds \`b\` into \`a\`: \`a\` gains \`b\`'s balance and outgoing total, and \`b\`'s pending payments now belong to \`a\` (same payment ids, cancelled via \`a\`). \`b\` then stops existing: later operations on it fail, it leaves \`top_spenders\`, and its id cannot be created again. Returns \`False\` (changing nothing) if \`a == b\` or either is unknown.
- \`get_balance\` returns the balance \`id\` had right after all operations at or before \`time_at\` (\`time_at <= timestamp\`). It returns \`None\` if the account did not exist yet at \`time_at\`. For a merged-away account, it returns its old balances for times before the merge and \`None\` from the merge on.
- An executed payment changes the balance at its \`at\` time.`,
      tests: [
        {
          name: 'merge combines balances',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 10, 3); bank.deposit('b', 25, 4)
assert_equal(bank.merge_accounts('a', 'b', 5), True)
assert_equal(bank.deposit('a', 1, 6), 36)
assert_equal(bank.deposit('b', 1, 7), None, 'b is gone')
assert_equal(bank.create_account('b', 8), False, 'id cannot be reused')`,
        },
        {
          name: 'invalid merges',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
assert_equal(bank.merge_accounts('a', 'a', 2), False)
assert_equal(bank.merge_accounts('a', 'zzz', 3), False)
assert_equal(bank.merge_accounts('zzz', 'a', 4), False)
assert_equal(bank.deposit('a', 5, 5), 5)`,
        },
        {
          name: 'merge carries outgoing totals',
          code: String.raw`bank = Bank()
for i, id in enumerate(['a', 'b', 'c']):
    bank.create_account(id, i + 1)
    bank.deposit(id, 100, i + 10)
bank.transfer('b', 'c', 40, 20)
bank.transfer('a', 'c', 5, 21)
bank.transfer('c', 'a', 30, 22)
bank.merge_accounts('a', 'b', 23)
assert_equal(bank.top_spenders(5, 24), ['a(45)', 'c(30)'])`,
        },
        {
          name: 'pending payments move to the surviving account',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 100, 3); bank.deposit('b', 10, 4)
p1 = bank.schedule_payment('b', 50, 20, 5)
p2 = bank.schedule_payment('b', 5, 30, 6)
bank.merge_accounts('a', 'b', 7)
assert_equal(bank.cancel_payment('b', p2, 8), False, 'b no longer exists')
assert_equal(bank.cancel_payment('a', p2, 9), True, 'a owns it now')
assert_equal(bank.deposit('a', 1, 20), 61, 'p1 drew from the merged balance')
assert_equal(bank.top_spenders(1, 21), ['a(50)'])
assert_equal(p1, 'payment1')`,
        },
        {
          name: 'balance at a past time',
          code: String.raw`bank = Bank()
bank.create_account('a', 10); bank.create_account('b', 11)
bank.deposit('a', 100, 20)
bank.transfer('a', 'b', 30, 30)
bank.deposit('a', 5, 40)
assert_equal(bank.get_balance('a', 50, 9), None, 'before creation')
assert_equal(bank.get_balance('a', 51, 10), 0, 'created empty')
assert_equal(bank.get_balance('a', 52, 25), 100)
assert_equal(bank.get_balance('a', 53, 30), 70, 'inclusive of time_at')
assert_equal(bank.get_balance('a', 54, 54), 75)
assert_equal(bank.get_balance('b', 55, 35), 30)
assert_equal(bank.get_balance('nope', 56, 50), None)`,
        },
        {
          name: 'history of a merged account',
          code: String.raw`bank = Bank()
bank.create_account('a', 1); bank.create_account('b', 2)
bank.deposit('a', 10, 3); bank.deposit('b', 25, 4)
bank.merge_accounts('a', 'b', 5)
assert_equal(bank.get_balance('a', 6, 4), 10, 'before merge')
assert_equal(bank.get_balance('a', 7, 5), 35, 'after merge')
assert_equal(bank.get_balance('b', 8, 4), 25, 'b before merge')
assert_equal(bank.get_balance('b', 9, 5), None, 'b from the merge on')`,
        },
        {
          name: 'payments land at their scheduled time',
          code: String.raw`bank = Bank()
bank.create_account('a', 1)
bank.deposit('a', 100, 2)
bank.schedule_payment('a', 40, 10, 3)
assert_equal(bank.get_balance('a', 50, 9), 100)
assert_equal(bank.get_balance('a', 51, 10), 60, 'executed at its at time')`,
        },
      ],
    },
  ],
  solution: String.raw`from bisect import bisect_right, insort
from dataclasses import dataclass, field


@dataclass
class Account:
    balance: int = 0
    outgoing: int = 0
    times: list[int] = field(default_factory=list)
    balances: list[int] = field(default_factory=list)


@dataclass(order=True)
class Payment:
    at: int
    seq: int
    id: str = field(compare=False)
    owner: str = field(compare=False)
    amount: int = field(compare=False)


class Bank:
    def __init__(self) -> None:
        self.accounts: dict[str, Account] = {}
        # Merged-away accounts: (account with its history, merge timestamp).
        self.closed: dict[str, tuple[Account, int]] = {}
        self.pending: list[Payment] = []  # sorted by (at, seq)
        self.seq = 0

    def create_account(self, id: str, timestamp: int) -> bool:
        self._run_due(timestamp)
        if id in self.accounts or id in self.closed:
            return False
        acct = Account()
        self._set_balance(acct, 0, timestamp)
        self.accounts[id] = acct
        return True

    def deposit(self, id: str, amount: int, timestamp: int) -> int | None:
        self._run_due(timestamp)
        acct = self.accounts.get(id)
        if acct is None or amount <= 0:
            return None
        self._set_balance(acct, acct.balance + amount, timestamp)
        return acct.balance

    def transfer(self, src: str, dst: str, amount: int, timestamp: int) -> int | None:
        self._run_due(timestamp)
        a = self.accounts.get(src)
        b = self.accounts.get(dst)
        if a is None or b is None or src == dst or amount <= 0 or a.balance < amount:
            return None
        self._set_balance(a, a.balance - amount, timestamp)
        self._set_balance(b, b.balance + amount, timestamp)
        a.outgoing += amount
        return a.balance

    def top_spenders(self, n: int, timestamp: int) -> list[str]:
        self._run_due(timestamp)
        ranked = sorted(self.accounts.items(), key=lambda kv: (-kv[1].outgoing, kv[0]))
        return [id + '(' + str(a.outgoing) + ')' for id, a in ranked[:n]]

    def schedule_payment(self, id: str, amount: int, at: int, timestamp: int) -> str | None:
        self._run_due(timestamp)
        if id not in self.accounts or amount <= 0 or at <= timestamp:
            return None
        self.seq += 1
        p = Payment(at, self.seq, 'payment' + str(self.seq), id, amount)
        insort(self.pending, p)
        return p.id

    def cancel_payment(self, id: str, payment_id: str, timestamp: int) -> bool:
        self._run_due(timestamp)
        for i, p in enumerate(self.pending):
            if p.id == payment_id:
                if p.owner != id or id not in self.accounts:
                    return False
                del self.pending[i]
                return True
        return False

    def merge_accounts(self, a: str, b: str, timestamp: int) -> bool:
        self._run_due(timestamp)
        keep = self.accounts.get(a)
        gone = self.accounts.get(b)
        if keep is None or gone is None or a == b:
            return False
        self._set_balance(keep, keep.balance + gone.balance, timestamp)
        keep.outgoing += gone.outgoing
        for p in self.pending:
            if p.owner == b:
                p.owner = a
        del self.accounts[b]
        self.closed[b] = (gone, timestamp)
        return True

    def get_balance(self, id: str, timestamp: int, time_at: int) -> int | None:
        self._run_due(timestamp)
        acct = self.accounts.get(id)
        if acct is None:
            if id not in self.closed:
                return None
            acct, closed_at = self.closed[id]
            if time_at >= closed_at:
                return None
        i = bisect_right(acct.times, time_at) - 1
        return acct.balances[i] if i >= 0 else None

    def _run_due(self, timestamp: int) -> None:
        while self.pending and self.pending[0].at <= timestamp:
            p = self.pending.pop(0)
            acct = self.accounts.get(p.owner)
            if acct is None or acct.balance < p.amount:
                continue
            self._set_balance(acct, acct.balance - p.amount, p.at)
            acct.outgoing += p.amount

    def _set_balance(self, acct: Account, balance: int, ts: int) -> None:
        acct.balance = balance
        if acct.times and acct.times[-1] == ts:
            acct.balances[-1] = balance
        else:
            acct.times.append(ts)
            acct.balances.append(balance)
`,
};
