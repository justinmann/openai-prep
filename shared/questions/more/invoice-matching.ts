import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'invoice-matching',
  title: 'Invoice Payment Matching',
  difficulty: 'medium',
  tags: ['matching', 'sorting', 'parsing'],
  summary:
    'Reconcile incoming payments against open invoices by memo id, exact amount, then a tolerance.',
  companies: ['stripe'],
  sources: [
    'https://github.com/lhf927/stripe-interview-questions',
    'https://thita.ai/interviews/stripe',
  ],
  prompt: `A billing team receives payments and has to work out which open invoice each one settles. Amounts are integer **cents**; due dates are \`'YYYY-MM-DD'\` strings, so they compare correctly as strings.

\`\`\`ts
type Invoice = { id: string; amount: number; dueDate: string; customer?: string };
type Payment = { id: string; amount: number; memo: string };
type Reason = 'memo' | 'amount' | 'tolerance' | 'none';
type Match = { paymentId: string; invoiceId: string | null; reason: Reason; difference: number };

function matchPayments(invoices: Invoice[], payments: Payment[]): Match[]
\`\`\`

- Return one \`Match\` per payment, **in payment order**. Process payments one at a time, in that order.
- Invoice ids look like \`INV-\` followed by digits. A memo **references** the first \`INV-<digits>\` token in it (the whole run of digits: \`INV-00421\` is not \`INV-0042\`).
- If the referenced invoice exists and is not paid yet, the payment settles it with reason \`'memo'\`, whatever the amount.
- Each invoice can be paid **at most once**. A payment that settles nothing gets \`invoiceId: null\` and reason \`'none'\`.
- \`difference\` is \`payment.amount - invoice.amount\` for a match and \`0\` for \`'none'\` (only Part 3 tests check it).

Example: invoices \`INV-0001\` (5000) and \`INV-0002\` (7500); a payment of 7500 with memo \`"Paying off: INV-0002"\` gives \`{ paymentId, invoiceId: 'INV-0002', reason: 'memo', difference: 0 }\`.`,
  starter: `type Invoice = { id: string; amount: number; dueDate: string; customer?: string };
type Payment = { id: string; amount: number; memo: string };
type Reason = 'memo' | 'amount' | 'tolerance' | 'none';
type Match = { paymentId: string; invoiceId: string | null; reason: Reason; difference: number };

function matchPayments(invoices: Invoice[], payments: Payment[]): Match[] {
  // TODO
  return [];
}
`,
  parts: [
    {
      title: 'Part 1: Match by memo',
      prompt:
        'Only the memo matters for now. An unknown id, an already-paid id, or a memo with no id leaves the payment unmatched.',
      tests: [
        {
          name: 'memo references an invoice',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' },
  { id: 'INV-0002', amount: 7500, dueDate: '2026-01-20', customer: 'acme' },
];
const r = matchPayments(invoices, [{ id: 'P1', amount: 7500, memo: 'Paying off: INV-0002' }]);
assertEqual(r.map((m) => [m.paymentId, m.invoiceId, m.reason]), [['P1', 'INV-0002', 'memo']]);`,
        },
        {
          name: 'memo match ignores the amount',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [{ id: 'P1', amount: 123, memo: 'partial for INV-0001, more soon' }]);
assertEqual(r.map((m) => [m.invoiceId, m.reason]), [['INV-0001', 'memo']]);`,
        },
        {
          name: 'unknown id is unmatched',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 111, memo: 'INV-9999' },
  { id: 'P2', amount: 222, memo: 'ref INV-00011' },
]);
assertEqual(r.map((m) => [m.paymentId, m.invoiceId, m.reason]), [['P1', null, 'none'], ['P2', null, 'none']]);`,
        },
        {
          name: 'an invoice is paid at most once',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 5000, memo: 'INV-0001' },
  { id: 'P2', amount: 1, memo: 'INV-0001 again' },
]);
assertEqual(r.map((m) => [m.paymentId, m.invoiceId, m.reason]), [['P1', 'INV-0001', 'memo'], ['P2', null, 'none']]);`,
        },
        {
          name: 'memo without an id',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 42, memo: 'thanks!' },
  { id: 'P2', amount: 43, memo: '' },
  { id: 'P3', amount: 44, memo: 'inv-0001' },
]);
assertEqual(r.map((m) => m.invoiceId), [null, null, null], 'ids are case-sensitive');`,
        },
        {
          name: 'only the first id in a memo counts',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [{ id: 'P1', amount: 77, memo: 'INV-0003 or maybe INV-0001' }]);
assertEqual(r.map((m) => [m.invoiceId, m.reason]), [[null, 'none']]);`,
        },
        {
          name: 'payment order and empty inputs',
          code: String.raw`assertEqual(matchPayments([], []), []);
assertEqual(matchPayments([{ id: 'INV-0001', amount: 1, dueDate: '2026-01-01' }], []), []);
const invoices = [
  { id: 'INV-0001', amount: 100, dueDate: '2026-01-01' },
  { id: 'INV-0002', amount: 200, dueDate: '2026-01-02' },
];
const r = matchPayments(invoices, [
  { id: 'P9', amount: 200, memo: 'INV-0002' },
  { id: 'P3', amount: 5, memo: 'nothing' },
  { id: 'P1', amount: 100, memo: 'INV-0001' },
]);
assertEqual(r.map((m) => m.paymentId), ['P9', 'P3', 'P1']);
assertEqual(r.map((m) => m.invoiceId), ['INV-0002', null, 'INV-0001']);`,
        },
      ],
    },
    {
      title: 'Part 2: Fall back to the amount',
      prompt: `Customers often forget the memo. When the memo gives no usable invoice (no id, an unknown id, or an id that is already paid), settle the **unpaid** invoice whose amount equals the payment amount exactly, with reason \`'amount'\`.

- Ties go to the **earliest due date**, then the **lowest id** (plain string comparison).
- Rule priority so far: memo first, then exact amount, then \`'none'\`.`,
      tests: [
        {
          name: 'exact amount fallback',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' },
  { id: 'INV-0002', amount: 7500, dueDate: '2026-01-20' },
];
const r = matchPayments(invoices, [{ id: 'P1', amount: 7500, memo: 'monthly' }]);
assertEqual(r.map((m) => [m.invoiceId, m.reason]), [['INV-0002', 'amount']]);`,
        },
        {
          name: 'tie: earliest due date wins',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 900, dueDate: '2026-03-01' },
  { id: 'INV-0002', amount: 900, dueDate: '2026-02-01' },
  { id: 'INV-0003', amount: 900, dueDate: '2026-02-15' },
];
const r = matchPayments(invoices, [{ id: 'P1', amount: 900, memo: '' }]);
assertEqual(r[0].invoiceId, 'INV-0002');`,
        },
        {
          name: 'tie: same due date, lowest id wins',
          code: String.raw`const invoices = [
  { id: 'INV-0010', amount: 900, dueDate: '2026-02-01' },
  { id: 'INV-0009', amount: 900, dueDate: '2026-02-01' },
];
const r = matchPayments(invoices, [{ id: 'P1', amount: 900, memo: '' }]);
assertEqual(r[0].invoiceId, 'INV-0009');`,
        },
        {
          name: 'unusable memo falls back to amount',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' },
  { id: 'INV-0002', amount: 300, dueDate: '2026-01-11' },
  { id: 'INV-0003', amount: 400, dueDate: '2026-01-12' },
];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 5000, memo: 'INV-0001' },
  { id: 'P2', amount: 300, memo: 'INV-0001 (dup)' },
  { id: 'P3', amount: 400, memo: 'INV-9999' },
]);
assertEqual(r.map((m) => [m.invoiceId, m.reason]), [['INV-0001', 'memo'], ['INV-0002', 'amount'], ['INV-0003', 'amount']]);`,
        },
        {
          name: 'memo beats amount',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 100, dueDate: '2026-05-01' },
  { id: 'INV-0002', amount: 250, dueDate: '2026-01-01' },
];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 250, memo: 'INV-0001' },
  { id: 'P2', amount: 250, memo: '' },
]);
assertEqual(r.map((m) => [m.invoiceId, m.reason]), [['INV-0001', 'memo'], ['INV-0002', 'amount']]);`,
        },
        {
          name: 'amount matches skip paid invoices',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 600, dueDate: '2026-01-01' },
  { id: 'INV-0002', amount: 600, dueDate: '2026-01-02' },
];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 600, memo: '' },
  { id: 'P2', amount: 600, memo: '' },
  { id: 'P3', amount: 600, memo: '' },
]);
assertEqual(r.map((m) => [m.invoiceId, m.reason]), [['INV-0001', 'amount'], ['INV-0002', 'amount'], [null, 'none']]);`,
        },
      ],
    },
    {
      title: 'Part 3: Tolerance and a summary',
      prompt: `Banks shave off fees, so add a forgiveness tolerance in cents (default \`0\`), and a summary of what is still open:

\`\`\`ts
function matchPayments(invoices: Invoice[], payments: Payment[], tolerance?: number): Match[]
function summarize(invoices: Invoice[], matches: Match[]): {
  unpaid: string[];             // unpaid invoice ids, earliest due date first, then lowest id
  outstanding: number;          // total amount of the unpaid invoices
  unmatchedPayments: string[];  // payment ids with reason 'none', in payment order
}
\`\`\`

Full rule priority, applied to each payment in order:

1. **Memo**: the referenced invoice exists and is unpaid.
2. **Exact amount**: earliest due date, then lowest id.
3. **Tolerance**: an unpaid invoice with \`|payment - invoice| <= tolerance\`; the smallest difference wins, then earliest due date, then lowest id.
4. Otherwise \`'none'\`.

\`difference\` is now checked: positive means overpaid, negative means underpaid, \`0\` for exact and unmatched.`,
      tests: [
        {
          name: 'match within tolerance',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 10000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [{ id: 'P1', amount: 9950, memo: 'wire' }], 100);
assertEqual(r, [{ paymentId: 'P1', invoiceId: 'INV-0001', reason: 'tolerance', difference: -50 }]);`,
        },
        {
          name: 'tolerance bound is inclusive',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 10000, dueDate: '2026-01-10' }];
const p = [{ id: 'P1', amount: 10050, memo: '' }];
assertEqual(matchPayments(invoices, p, 49), [{ paymentId: 'P1', invoiceId: null, reason: 'none', difference: 0 }]);
assertEqual(matchPayments(invoices, p, 50)[0].difference, 50, 'overpaid by 50');`,
        },
        {
          name: 'default tolerance is zero',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 10000, dueDate: '2026-01-10' }];
const r = matchPayments(invoices, [{ id: 'P1', amount: 9999, memo: '' }]);
assertEqual(r[0].reason, 'none');`,
        },
        {
          name: 'closest difference first, then due date',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 1000, dueDate: '2026-03-01' },
  { id: 'INV-0002', amount: 1030, dueDate: '2026-01-01' },
  { id: 'INV-0003', amount: 1010, dueDate: '2026-02-01' },
  { id: 'INV-0004', amount: 990, dueDate: '2026-01-15' },
];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 1005, memo: '' },
  { id: 'P2', amount: 1005, memo: '' },
  { id: 'P3', amount: 1005, memo: '' },
], 30);
assertEqual(r.map((m) => [m.invoiceId, m.difference]), [['INV-0003', -5], ['INV-0001', 5], ['INV-0004', 15]]);`,
        },
        {
          name: 'exact amount beats tolerance',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 995, dueDate: '2026-01-01' },
  { id: 'INV-0002', amount: 1000, dueDate: '2026-06-01' },
];
const r = matchPayments(invoices, [{ id: 'P1', amount: 1000, memo: '' }], 100);
assertEqual(r[0].invoiceId, 'INV-0002');
assertEqual(r[0].reason, 'amount');`,
        },
        {
          name: 'difference on memo and exact matches',
          code: String.raw`const invoices = [
  { id: 'INV-0001', amount: 5000, dueDate: '2026-01-10' },
  { id: 'INV-0002', amount: 700, dueDate: '2026-01-11' },
];
const r = matchPayments(invoices, [
  { id: 'P1', amount: 4900, memo: 'INV-0001' },
  { id: 'P2', amount: 700, memo: '' },
], 10);
assertEqual(r.map((m) => [m.reason, m.difference]), [['memo', -100], ['amount', 0]]);`,
        },
        {
          name: 'summary of unpaid invoices',
          code: String.raw`const invoices = [
  { id: 'INV-0004', amount: 400, dueDate: '2026-02-01' },
  { id: 'INV-0001', amount: 100, dueDate: '2026-03-01' },
  { id: 'INV-0003', amount: 300, dueDate: '2026-02-01' },
  { id: 'INV-0002', amount: 200, dueDate: '2026-01-01' },
];
const m = matchPayments(invoices, [
  { id: 'P1', amount: 1, memo: 'nope' },
  { id: 'P2', amount: 200, memo: '' },
  { id: 'P3', amount: 2, memo: 'INV-0002' },
]);
assertEqual(summarize(invoices, m), {
  unpaid: ['INV-0003', 'INV-0004', 'INV-0001'],
  outstanding: 800,
  unmatchedPayments: ['P1', 'P3'],
});`,
        },
        {
          name: 'summary when everything is paid',
          code: String.raw`const invoices = [{ id: 'INV-0001', amount: 100, dueDate: '2026-03-01' }];
const m = matchPayments(invoices, [{ id: 'P1', amount: 100, memo: 'INV-0001' }]);
assertEqual(summarize(invoices, m), { unpaid: [], outstanding: 0, unmatchedPayments: [] });
assertEqual(summarize([], []), { unpaid: [], outstanding: 0, unmatchedPayments: [] });`,
        },
      ],
    },
  ],
  solution: String.raw`type Invoice = { id: string; amount: number; dueDate: string; customer?: string };
type Payment = { id: string; amount: number; memo: string };
type Reason = 'memo' | 'amount' | 'tolerance' | 'none';
type Match = { paymentId: string; invoiceId: string | null; reason: Reason; difference: number };

function byDueThenId(a: Invoice, b: Invoice): number {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function matchPayments(invoices: Invoice[], payments: Payment[], tolerance = 0): Match[] {
  const byId = new Map(invoices.map((inv) => [inv.id, inv]));
  // Scanning in (dueDate, id) order makes "first hit" the tie-break winner.
  const ordered = [...invoices].sort(byDueThenId);
  const paid = new Set<string>();

  return payments.map((p): Match => {
    const settle = (inv: Invoice, reason: Reason): Match => {
      paid.add(inv.id);
      return { paymentId: p.id, invoiceId: inv.id, reason, difference: p.amount - inv.amount };
    };

    const ref = /INV-\d+/.exec(p.memo);
    const named = ref ? byId.get(ref[0]) : undefined;
    if (named && !paid.has(named.id)) return settle(named, 'memo');

    const exact = ordered.find((inv) => !paid.has(inv.id) && inv.amount === p.amount);
    if (exact) return settle(exact, 'amount');

    let best: Invoice | undefined;
    for (const inv of ordered) {
      if (paid.has(inv.id)) continue;
      const d = Math.abs(p.amount - inv.amount);
      if (d <= tolerance && (!best || d < Math.abs(p.amount - best.amount))) best = inv;
    }
    if (best) return settle(best, 'tolerance');

    return { paymentId: p.id, invoiceId: null, reason: 'none', difference: 0 };
  });
}

function summarize(invoices: Invoice[], matches: Match[]) {
  const paid = new Set(matches.map((m) => m.invoiceId).filter((id) => id !== null));
  const unpaid = invoices.filter((inv) => !paid.has(inv.id)).sort(byDueThenId);
  return {
    unpaid: unpaid.map((inv) => inv.id),
    outstanding: unpaid.reduce((sum, inv) => sum + inv.amount, 0),
    unmatchedPayments: matches.filter((m) => m.reason === 'none').map((m) => m.paymentId),
  };
}
`,
};
