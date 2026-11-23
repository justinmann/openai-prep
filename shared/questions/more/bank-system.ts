import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'bank-system',
  title: 'Banking System',
  difficulty: 'hard',
  tags: ['design', 'simulation', 'sorting', 'history'],
  summary:
    'An in-memory bank with transfers, top spenders, scheduled payments, merges and point-in-time balances.',
  companies: ['anthropic', 'openai', 'stripe'],
  sources: [
    'https://prachub.com/companies/anthropic',
    'https://www.interviewquery.com/guides/anthropic-software-engineer',
  ],
  prompt: `Build an in-memory banking system. Every operation carries a \`timestamp\`, and timestamps strictly increase across calls.

\`\`\`ts
class Bank {
  createAccount(id: string, timestamp: number): boolean
  deposit(id: string, amount: number, timestamp: number): number | null
  transfer(from: string, to: string, amount: number, timestamp: number): number | null
}
\`\`\`

- \`createAccount\` returns \`false\` if the id already exists, otherwise \`true\`. New accounts start at balance 0.
- \`deposit\` adds money and returns the new balance.
- \`transfer\` moves money and returns the **sender's** new balance.
- Return \`null\` for anything invalid: an unknown account, a non-positive amount, a transfer to the same account, or a transfer larger than the sender's balance. A failed call changes nothing.

\`\`\`ts
const bank = new Bank();
bank.createAccount('a', 1);      // true
bank.deposit('a', 100, 2);       // 100
bank.createAccount('b', 3);      // true
bank.transfer('a', 'b', 30, 4);  // 70
bank.transfer('a', 'b', 500, 5); // null
\`\`\``,
  starter: `class Bank {
  createAccount(id: string, timestamp: number): boolean {
    // TODO
    return false;
  }

  deposit(id: string, amount: number, timestamp: number): number | null {
    // TODO
    return null;
  }

  transfer(from: string, to: string, amount: number, timestamp: number): number | null {
    // TODO
    return null;
  }
}
`,
  parts: [
    {
      title: 'Part 1: Accounts, deposits, transfers',
      prompt: 'Implement the three operations above with full validation.',
      tests: [
        {
          name: 'create accounts',
          code: String.raw`const bank = new Bank();
assertEqual(bank.createAccount('a', 1), true);
assertEqual(bank.createAccount('b', 2), true);
assertEqual(bank.createAccount('a', 3), false, 'duplicate id');`,
        },
        {
          name: 'deposits accumulate',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
assertEqual(bank.deposit('a', 100, 2), 100);
assertEqual(bank.deposit('a', 25, 3), 125);`,
        },
        {
          name: 'invalid deposits',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
assertEqual(bank.deposit('nope', 10, 2), null, 'unknown account');
assertEqual(bank.deposit('a', 0, 3), null, 'zero amount');
assertEqual(bank.deposit('a', -5, 4), null, 'negative amount');
assertEqual(bank.deposit('a', 1, 5), 1, 'failed calls changed nothing');`,
        },
        {
          name: 'transfer returns sender balance',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 100, 3);
assertEqual(bank.transfer('a', 'b', 30, 4), 70);
assertEqual(bank.deposit('b', 1, 5), 31, 'receiver got the money');`,
        },
        {
          name: 'invalid transfers change nothing',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 50, 3);
assertEqual(bank.transfer('a', 'b', 51, 4), null, 'insufficient funds');
assertEqual(bank.transfer('a', 'a', 10, 5), null, 'same account');
assertEqual(bank.transfer('a', 'zzz', 10, 6), null, 'unknown receiver');
assertEqual(bank.transfer('zzz', 'a', 10, 7), null, 'unknown sender');
assertEqual(bank.transfer('a', 'b', 0, 8), null, 'zero amount');
assertEqual(bank.deposit('a', 1, 9), 51);
assertEqual(bank.deposit('b', 1, 10), 1);`,
        },
        {
          name: 'transfer the whole balance',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 40, 3);
assertEqual(bank.transfer('a', 'b', 40, 4), 0);
assertEqual(bank.transfer('a', 'b', 1, 5), null, 'now empty');`,
        },
      ],
    },
    {
      title: 'Part 2: Top spenders and scheduled payments',
      prompt: `Add:

\`\`\`ts
topSpenders(n: number, timestamp: number): string[]
schedulePayment(id: string, amount: number, at: number, timestamp: number): string | null
cancelPayment(id: string, paymentId: string, timestamp: number): boolean
\`\`\`

- **Outgoing** is the total of an account's successful transfers out plus its executed payments. \`topSpenders\` returns up to \`n\` entries formatted \`"id(total)"\`, highest total first, ties by id ascending. Accounts with 0 outgoing are included.
- \`schedulePayment\` returns ids \`"payment1"\`, \`"payment2"\`, ... (one counter for the whole bank), or \`null\` for an unknown account, a non-positive amount, or \`at <= timestamp\`. A payment withdraws money from the bank.
- A payment is **due** once an operation's timestamp is \`>= at\`. Before doing anything else, every operation first executes all due payments, ordered by \`at\`, ties by scheduling order. A due payment the account cannot afford is skipped and dropped (not retried).
- \`cancelPayment\` returns \`true\` only if the payment is still pending and belongs to \`id\`. A payment that already ran or was skipped cannot be cancelled.

\`\`\`ts
bank.schedulePayment('a', 20, 10, 5); // "payment1"
bank.deposit('a', 5, 10);             // payment1 runs first, then the deposit
\`\`\``,
      tests: [
        {
          name: 'top spenders by outgoing total',
          code: String.raw`const bank = new Bank();
for (const [i, id] of ['a', 'b', 'c', 'd'].entries()) { bank.createAccount(id, i + 1); bank.deposit(id, 100, i + 10); }
bank.transfer('a', 'b', 30, 20);
bank.transfer('c', 'b', 50, 21);
bank.transfer('a', 'c', 20, 22);
assertEqual(bank.topSpenders(2, 23), ['a(50)', 'c(50)'], 'tie broken by id');
assertEqual(bank.topSpenders(10, 24), ['a(50)', 'c(50)', 'b(0)', 'd(0)']);`,
        },
        {
          name: 'failed transfers do not count',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 10, 3);
bank.transfer('a', 'b', 999, 4);
assertEqual(bank.topSpenders(1, 5), ['a(0)']);`,
        },
        {
          name: 'payment runs when its time comes',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
bank.deposit('a', 100, 2);
assertEqual(bank.schedulePayment('a', 30, 10, 3), 'payment1');
assertEqual(bank.deposit('a', 1, 9), 101, 'not due yet');
assertEqual(bank.deposit('a', 1, 10), 72, 'due at exactly at, runs before the deposit');
assertEqual(bank.topSpenders(1, 11), ['a(30)'], 'payments count as outgoing');`,
        },
        {
          name: 'payment ids and validation',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
assertEqual(bank.schedulePayment('a', 5, 100, 3), 'payment1');
assertEqual(bank.schedulePayment('nope', 5, 100, 4), null);
assertEqual(bank.schedulePayment('a', 0, 100, 5), null);
assertEqual(bank.schedulePayment('a', 5, 6, 6), null, 'at must be in the future');
assertEqual(bank.schedulePayment('b', 5, 100, 7), 'payment2', 'one counter for the bank');`,
        },
        {
          name: 'due payments run in time order, unaffordable ones are skipped',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
bank.deposit('a', 50, 2);
bank.schedulePayment('a', 40, 20, 3); // payment1
bank.schedulePayment('a', 30, 10, 4); // payment2, earlier at
bank.schedulePayment('a', 15, 20, 5); // payment3, same at as payment1
// At 25: payment2 (30) runs, payment1 (40) is skipped, payment3 (15) runs.
assertEqual(bank.deposit('a', 1, 25), 6);
assertEqual(bank.deposit('a', 100, 26), 106, 'skipped payment is not retried');`,
        },
        {
          name: 'cancel a pending payment',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 100, 3);
const p = bank.schedulePayment('a', 60, 10, 4);
assertEqual(bank.cancelPayment('b', p, 5), false, 'wrong owner');
assertEqual(bank.cancelPayment('a', 'payment99', 6), false, 'unknown id');
assertEqual(bank.cancelPayment('a', p, 7), true);
assertEqual(bank.cancelPayment('a', p, 8), false, 'already cancelled');
assertEqual(bank.deposit('a', 1, 20), 101, 'cancelled payment never runs');`,
        },
        {
          name: 'cannot cancel once due',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
bank.deposit('a', 100, 2);
const p = bank.schedulePayment('a', 10, 5, 3);
assertEqual(bank.cancelPayment('a', p, 5), false, 'it ran first');
assertEqual(bank.deposit('a', 1, 6), 91);`,
        },
      ],
    },
    {
      title: 'Part 3: Merges and balance history',
      prompt: `Add:

\`\`\`ts
mergeAccounts(a: string, b: string, timestamp: number): boolean
getBalance(id: string, timestamp: number, timeAt: number): number | null
\`\`\`

- \`mergeAccounts\` folds \`b\` into \`a\`: \`a\` gains \`b\`'s balance and outgoing total, and \`b\`'s pending payments now belong to \`a\` (same payment ids, cancelled via \`a\`). \`b\` then stops existing: later operations on it fail, it leaves \`topSpenders\`, and its id cannot be created again. Returns \`false\` (changing nothing) if \`a === b\` or either is unknown.
- \`getBalance\` returns the balance \`id\` had right after all operations at or before \`timeAt\` (\`timeAt <= timestamp\`). It returns \`null\` if the account did not exist yet at \`timeAt\`. For a merged-away account, it returns its old balances for times before the merge and \`null\` from the merge on.
- An executed payment changes the balance at its \`at\` time.`,
      tests: [
        {
          name: 'merge combines balances',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 10, 3); bank.deposit('b', 25, 4);
assertEqual(bank.mergeAccounts('a', 'b', 5), true);
assertEqual(bank.deposit('a', 1, 6), 36);
assertEqual(bank.deposit('b', 1, 7), null, 'b is gone');
assertEqual(bank.createAccount('b', 8), false, 'id cannot be reused');`,
        },
        {
          name: 'invalid merges',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
assertEqual(bank.mergeAccounts('a', 'a', 2), false);
assertEqual(bank.mergeAccounts('a', 'zzz', 3), false);
assertEqual(bank.mergeAccounts('zzz', 'a', 4), false);
assertEqual(bank.deposit('a', 5, 5), 5);`,
        },
        {
          name: 'merge carries outgoing totals',
          code: String.raw`const bank = new Bank();
for (const [i, id] of ['a', 'b', 'c'].entries()) { bank.createAccount(id, i + 1); bank.deposit(id, 100, i + 10); }
bank.transfer('b', 'c', 40, 20);
bank.transfer('a', 'c', 5, 21);
bank.transfer('c', 'a', 30, 22);
bank.mergeAccounts('a', 'b', 23);
assertEqual(bank.topSpenders(5, 24), ['a(45)', 'c(30)']);`,
        },
        {
          name: 'pending payments move to the surviving account',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 100, 3); bank.deposit('b', 10, 4);
const p1 = bank.schedulePayment('b', 50, 20, 5);
const p2 = bank.schedulePayment('b', 5, 30, 6);
bank.mergeAccounts('a', 'b', 7);
assertEqual(bank.cancelPayment('b', p2, 8), false, 'b no longer exists');
assertEqual(bank.cancelPayment('a', p2, 9), true, 'a owns it now');
assertEqual(bank.deposit('a', 1, 20), 61, 'p1 drew from the merged balance');
assertEqual(bank.topSpenders(1, 21), ['a(50)']);
assertEqual(p1, 'payment1');`,
        },
        {
          name: 'balance at a past time',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 10); bank.createAccount('b', 11);
bank.deposit('a', 100, 20);
bank.transfer('a', 'b', 30, 30);
bank.deposit('a', 5, 40);
assertEqual(bank.getBalance('a', 50, 9), null, 'before creation');
assertEqual(bank.getBalance('a', 51, 10), 0, 'created empty');
assertEqual(bank.getBalance('a', 52, 25), 100);
assertEqual(bank.getBalance('a', 53, 30), 70, 'inclusive of timeAt');
assertEqual(bank.getBalance('a', 54, 54), 75);
assertEqual(bank.getBalance('b', 55, 35), 30);
assertEqual(bank.getBalance('nope', 56, 50), null);`,
        },
        {
          name: 'history of a merged account',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1); bank.createAccount('b', 2);
bank.deposit('a', 10, 3); bank.deposit('b', 25, 4);
bank.mergeAccounts('a', 'b', 5);
assertEqual(bank.getBalance('a', 6, 4), 10, 'before merge');
assertEqual(bank.getBalance('a', 7, 5), 35, 'after merge');
assertEqual(bank.getBalance('b', 8, 4), 25, 'b before merge');
assertEqual(bank.getBalance('b', 9, 5), null, 'b from the merge on');`,
        },
        {
          name: 'payments land at their scheduled time',
          code: String.raw`const bank = new Bank();
bank.createAccount('a', 1);
bank.deposit('a', 100, 2);
bank.schedulePayment('a', 40, 10, 3);
assertEqual(bank.getBalance('a', 50, 9), 100);
assertEqual(bank.getBalance('a', 51, 10), 60, 'executed at its at time');`,
        },
      ],
    },
  ],
  solution: String.raw`type Entry = [ts: number, balance: number];
type Account = { balance: number; outgoing: number; history: Entry[] };
type Payment = { id: string; owner: string; amount: number; at: number; seq: number };

class Bank {
  private accounts = new Map<string, Account>();
  // Merged-away accounts keep their history until the merge.
  private closed = new Map<string, { history: Entry[]; closedAt: number }>();
  // Pending payments sorted by (at, seq).
  private pending: Payment[] = [];
  private seq = 0;

  createAccount(id: string, timestamp: number): boolean {
    this.runDue(timestamp);
    if (this.accounts.has(id) || this.closed.has(id)) return false;
    this.accounts.set(id, { balance: 0, outgoing: 0, history: [[timestamp, 0]] });
    return true;
  }

  deposit(id: string, amount: number, timestamp: number): number | null {
    this.runDue(timestamp);
    const acct = this.accounts.get(id);
    if (!acct || amount <= 0) return null;
    this.setBalance(acct, acct.balance + amount, timestamp);
    return acct.balance;
  }

  transfer(from: string, to: string, amount: number, timestamp: number): number | null {
    this.runDue(timestamp);
    const src = this.accounts.get(from);
    const dst = this.accounts.get(to);
    if (!src || !dst || from === to || amount <= 0 || src.balance < amount) return null;
    this.setBalance(src, src.balance - amount, timestamp);
    this.setBalance(dst, dst.balance + amount, timestamp);
    src.outgoing += amount;
    return src.balance;
  }

  topSpenders(n: number, timestamp: number): string[] {
    this.runDue(timestamp);
    return [...this.accounts.entries()]
      .sort(([ia, a], [ib, b]) => b.outgoing - a.outgoing || (ia < ib ? -1 : ia > ib ? 1 : 0))
      .slice(0, n)
      .map(([id, a]) => id + '(' + a.outgoing + ')');
  }

  schedulePayment(id: string, amount: number, at: number, timestamp: number): string | null {
    this.runDue(timestamp);
    if (!this.accounts.has(id) || amount <= 0 || at <= timestamp) return null;
    this.seq++;
    const p: Payment = { id: 'payment' + this.seq, owner: id, amount, at, seq: this.seq };
    let i = this.pending.length;
    while (i > 0 && this.pending[i - 1]!.at > at) i--;
    this.pending.splice(i, 0, p);
    return p.id;
  }

  cancelPayment(id: string, paymentId: string, timestamp: number): boolean {
    this.runDue(timestamp);
    const i = this.pending.findIndex((p) => p.id === paymentId);
    if (i === -1 || this.pending[i]!.owner !== id || !this.accounts.has(id)) return false;
    this.pending.splice(i, 1);
    return true;
  }

  mergeAccounts(a: string, b: string, timestamp: number): boolean {
    this.runDue(timestamp);
    const keep = this.accounts.get(a);
    const gone = this.accounts.get(b);
    if (!keep || !gone || a === b) return false;
    this.setBalance(keep, keep.balance + gone.balance, timestamp);
    keep.outgoing += gone.outgoing;
    for (const p of this.pending) if (p.owner === b) p.owner = a;
    this.accounts.delete(b);
    this.closed.set(b, { history: gone.history, closedAt: timestamp });
    return true;
  }

  getBalance(id: string, timestamp: number, timeAt: number): number | null {
    this.runDue(timestamp);
    let history: Entry[];
    const live = this.accounts.get(id);
    if (live) history = live.history;
    else {
      const c = this.closed.get(id);
      if (!c || timeAt >= c.closedAt) return null;
      history = c.history;
    }
    // Last entry with ts <= timeAt.
    let lo = 0, hi = history.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (history[mid]![0] <= timeAt) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans === -1 ? null : history[ans]![1];
  }

  private runDue(timestamp: number): void {
    while (this.pending.length > 0 && this.pending[0]!.at <= timestamp) {
      const p = this.pending.shift()!;
      const acct = this.accounts.get(p.owner);
      if (!acct || acct.balance < p.amount) continue;
      this.setBalance(acct, acct.balance - p.amount, p.at);
      acct.outgoing += p.amount;
    }
  }

  private setBalance(acct: Account, balance: number, ts: number): void {
    acct.balance = balance;
    const last = acct.history[acct.history.length - 1];
    if (last && last[0] === ts) last[1] = balance;
    else acct.history.push([ts, balance]);
  }
}
`,
};
