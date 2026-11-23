import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `A billing team receives payments and has to work out which open invoice each one settles. Amounts are integer **cents**; due dates are \`'YYYY-MM-DD'\` strings, so they compare correctly as strings. Invoices and payments are plain dicts.

\`\`\`python
# invoice: {'id': str, 'amount': int, 'due_date': str, 'customer': str (optional)}
# payment: {'id': str, 'amount': int, 'memo': str}
# match:   {'payment_id': str, 'invoice_id': str | None, 'reason': str, 'difference': int}
#          reason is one of 'memo', 'amount', 'tolerance', 'none'

def match_payments(invoices: list[dict], payments: list[dict]) -> list[dict]: ...
\`\`\`

- Return one match dict per payment, **in payment order**. Process payments one at a time, in that order.
- Invoice ids look like \`INV-\` followed by digits. A memo **references** the first \`INV-<digits>\` token in it (the whole run of digits: \`INV-00421\` is not \`INV-0042\`).
- If the referenced invoice exists and is not paid yet, the payment settles it with reason \`'memo'\`, whatever the amount.
- Each invoice can be paid **at most once**. A payment that settles nothing gets \`'invoice_id': None\` and reason \`'none'\`.
- \`difference\` is \`payment amount - invoice amount\` for a match and \`0\` for \`'none'\` (only Part 3 tests check it).

Example: invoices \`INV-0001\` (5000) and \`INV-0002\` (7500); a payment of 7500 with memo \`"Paying off: INV-0002"\` gives \`{'payment_id': ..., 'invoice_id': 'INV-0002', 'reason': 'memo', 'difference': 0}\`.`,
  starter: String.raw`def match_payments(invoices: list[dict], payments: list[dict]) -> list[dict]:
    # TODO
    return []
`,
  parts: [
    {
      tests: [
        {
          name: 'memo references an invoice',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'},
    {'id': 'INV-0002', 'amount': 7500, 'due_date': '2026-01-20', 'customer': 'acme'},
]
r = match_payments(invoices, [{'id': 'P1', 'amount': 7500, 'memo': 'Paying off: INV-0002'}])
assert_equal([[m['payment_id'], m['invoice_id'], m['reason']] for m in r], [['P1', 'INV-0002', 'memo']])`,
        },
        {
          name: 'memo match ignores the amount',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [{'id': 'P1', 'amount': 123, 'memo': 'partial for INV-0001, more soon'}])
assert_equal([[m['invoice_id'], m['reason']] for m in r], [['INV-0001', 'memo']])`,
        },
        {
          name: 'unknown id is unmatched',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 111, 'memo': 'INV-9999'},
    {'id': 'P2', 'amount': 222, 'memo': 'ref INV-00011'},
])
assert_equal([[m['payment_id'], m['invoice_id'], m['reason']] for m in r], [['P1', None, 'none'], ['P2', None, 'none']])`,
        },
        {
          name: 'an invoice is paid at most once',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 5000, 'memo': 'INV-0001'},
    {'id': 'P2', 'amount': 1, 'memo': 'INV-0001 again'},
])
assert_equal([[m['payment_id'], m['invoice_id'], m['reason']] for m in r], [['P1', 'INV-0001', 'memo'], ['P2', None, 'none']])`,
        },
        {
          name: 'memo without an id',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 42, 'memo': 'thanks!'},
    {'id': 'P2', 'amount': 43, 'memo': ''},
    {'id': 'P3', 'amount': 44, 'memo': 'inv-0001'},
])
assert_equal([m['invoice_id'] for m in r], [None, None, None], 'ids are case-sensitive')`,
        },
        {
          name: 'only the first id in a memo counts',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [{'id': 'P1', 'amount': 77, 'memo': 'INV-0003 or maybe INV-0001'}])
assert_equal([[m['invoice_id'], m['reason']] for m in r], [[None, 'none']])`,
        },
        {
          name: 'payment order and empty inputs',
          code: String.raw`assert_equal(match_payments([], []), [])
assert_equal(match_payments([{'id': 'INV-0001', 'amount': 1, 'due_date': '2026-01-01'}], []), [])
invoices = [
    {'id': 'INV-0001', 'amount': 100, 'due_date': '2026-01-01'},
    {'id': 'INV-0002', 'amount': 200, 'due_date': '2026-01-02'},
]
r = match_payments(invoices, [
    {'id': 'P9', 'amount': 200, 'memo': 'INV-0002'},
    {'id': 'P3', 'amount': 5, 'memo': 'nothing'},
    {'id': 'P1', 'amount': 100, 'memo': 'INV-0001'},
])
assert_equal([m['payment_id'] for m in r], ['P9', 'P3', 'P1'])
assert_equal([m['invoice_id'] for m in r], ['INV-0002', None, 'INV-0001'])`,
        },
      ],
    },
    {
      tests: [
        {
          name: 'exact amount fallback',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'},
    {'id': 'INV-0002', 'amount': 7500, 'due_date': '2026-01-20'},
]
r = match_payments(invoices, [{'id': 'P1', 'amount': 7500, 'memo': 'monthly'}])
assert_equal([[m['invoice_id'], m['reason']] for m in r], [['INV-0002', 'amount']])`,
        },
        {
          name: 'tie: earliest due date wins',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 900, 'due_date': '2026-03-01'},
    {'id': 'INV-0002', 'amount': 900, 'due_date': '2026-02-01'},
    {'id': 'INV-0003', 'amount': 900, 'due_date': '2026-02-15'},
]
r = match_payments(invoices, [{'id': 'P1', 'amount': 900, 'memo': ''}])
assert_equal(r[0]['invoice_id'], 'INV-0002')`,
        },
        {
          name: 'tie: same due date, lowest id wins',
          code: String.raw`invoices = [
    {'id': 'INV-0010', 'amount': 900, 'due_date': '2026-02-01'},
    {'id': 'INV-0009', 'amount': 900, 'due_date': '2026-02-01'},
]
r = match_payments(invoices, [{'id': 'P1', 'amount': 900, 'memo': ''}])
assert_equal(r[0]['invoice_id'], 'INV-0009')`,
        },
        {
          name: 'unusable memo falls back to amount',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'},
    {'id': 'INV-0002', 'amount': 300, 'due_date': '2026-01-11'},
    {'id': 'INV-0003', 'amount': 400, 'due_date': '2026-01-12'},
]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 5000, 'memo': 'INV-0001'},
    {'id': 'P2', 'amount': 300, 'memo': 'INV-0001 (dup)'},
    {'id': 'P3', 'amount': 400, 'memo': 'INV-9999'},
])
assert_equal([[m['invoice_id'], m['reason']] for m in r], [['INV-0001', 'memo'], ['INV-0002', 'amount'], ['INV-0003', 'amount']])`,
        },
        {
          name: 'memo beats amount',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 100, 'due_date': '2026-05-01'},
    {'id': 'INV-0002', 'amount': 250, 'due_date': '2026-01-01'},
]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 250, 'memo': 'INV-0001'},
    {'id': 'P2', 'amount': 250, 'memo': ''},
])
assert_equal([[m['invoice_id'], m['reason']] for m in r], [['INV-0001', 'memo'], ['INV-0002', 'amount']])`,
        },
        {
          name: 'amount matches skip paid invoices',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 600, 'due_date': '2026-01-01'},
    {'id': 'INV-0002', 'amount': 600, 'due_date': '2026-01-02'},
]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 600, 'memo': ''},
    {'id': 'P2', 'amount': 600, 'memo': ''},
    {'id': 'P3', 'amount': 600, 'memo': ''},
])
assert_equal([[m['invoice_id'], m['reason']] for m in r], [['INV-0001', 'amount'], ['INV-0002', 'amount'], [None, 'none']])`,
        },
      ],
    },
    {
      prompt: `Banks shave off fees, so add a forgiveness tolerance in cents (default \`0\`), and a summary of what is still open:

\`\`\`python
def match_payments(invoices: list[dict], payments: list[dict], tolerance: int = 0) -> list[dict]: ...
def summarize(invoices: list[dict], matches: list[dict]) -> dict: ...
# {'unpaid': [...],              unpaid invoice ids, earliest due date first, then lowest id
#  'outstanding': int,           total amount of the unpaid invoices
#  'unmatched_payments': [...]}  payment ids with reason 'none', in payment order
\`\`\`

Full rule priority, applied to each payment in order:

1. **Memo**: the referenced invoice exists and is unpaid.
2. **Exact amount**: earliest due date, then lowest id.
3. **Tolerance**: an unpaid invoice with \`abs(payment - invoice) <= tolerance\`; the smallest difference wins, then earliest due date, then lowest id.
4. Otherwise \`'none'\`.

\`difference\` is now checked: positive means overpaid, negative means underpaid, \`0\` for exact and unmatched.`,
      tests: [
        {
          name: 'match within tolerance',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 10000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [{'id': 'P1', 'amount': 9950, 'memo': 'wire'}], 100)
assert_equal(r, [{'payment_id': 'P1', 'invoice_id': 'INV-0001', 'reason': 'tolerance', 'difference': -50}])`,
        },
        {
          name: 'tolerance bound is inclusive',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 10000, 'due_date': '2026-01-10'}]
p = [{'id': 'P1', 'amount': 10050, 'memo': ''}]
assert_equal(match_payments(invoices, p, 49), [{'payment_id': 'P1', 'invoice_id': None, 'reason': 'none', 'difference': 0}])
assert_equal(match_payments(invoices, p, 50)[0]['difference'], 50, 'overpaid by 50')`,
        },
        {
          name: 'default tolerance is zero',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 10000, 'due_date': '2026-01-10'}]
r = match_payments(invoices, [{'id': 'P1', 'amount': 9999, 'memo': ''}])
assert_equal(r[0]['reason'], 'none')`,
        },
        {
          name: 'closest difference first, then due date',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 1000, 'due_date': '2026-03-01'},
    {'id': 'INV-0002', 'amount': 1030, 'due_date': '2026-01-01'},
    {'id': 'INV-0003', 'amount': 1010, 'due_date': '2026-02-01'},
    {'id': 'INV-0004', 'amount': 990, 'due_date': '2026-01-15'},
]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 1005, 'memo': ''},
    {'id': 'P2', 'amount': 1005, 'memo': ''},
    {'id': 'P3', 'amount': 1005, 'memo': ''},
], 30)
assert_equal([[m['invoice_id'], m['difference']] for m in r], [['INV-0003', -5], ['INV-0001', 5], ['INV-0004', 15]])`,
        },
        {
          name: 'exact amount beats tolerance',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 995, 'due_date': '2026-01-01'},
    {'id': 'INV-0002', 'amount': 1000, 'due_date': '2026-06-01'},
]
r = match_payments(invoices, [{'id': 'P1', 'amount': 1000, 'memo': ''}], 100)
assert_equal(r[0]['invoice_id'], 'INV-0002')
assert_equal(r[0]['reason'], 'amount')`,
        },
        {
          name: 'difference on memo and exact matches',
          code: String.raw`invoices = [
    {'id': 'INV-0001', 'amount': 5000, 'due_date': '2026-01-10'},
    {'id': 'INV-0002', 'amount': 700, 'due_date': '2026-01-11'},
]
r = match_payments(invoices, [
    {'id': 'P1', 'amount': 4900, 'memo': 'INV-0001'},
    {'id': 'P2', 'amount': 700, 'memo': ''},
], 10)
assert_equal([[m['reason'], m['difference']] for m in r], [['memo', -100], ['amount', 0]])`,
        },
        {
          name: 'summary of unpaid invoices',
          code: String.raw`invoices = [
    {'id': 'INV-0004', 'amount': 400, 'due_date': '2026-02-01'},
    {'id': 'INV-0001', 'amount': 100, 'due_date': '2026-03-01'},
    {'id': 'INV-0003', 'amount': 300, 'due_date': '2026-02-01'},
    {'id': 'INV-0002', 'amount': 200, 'due_date': '2026-01-01'},
]
m = match_payments(invoices, [
    {'id': 'P1', 'amount': 1, 'memo': 'nope'},
    {'id': 'P2', 'amount': 200, 'memo': ''},
    {'id': 'P3', 'amount': 2, 'memo': 'INV-0002'},
])
assert_equal(summarize(invoices, m), {
    'unpaid': ['INV-0003', 'INV-0004', 'INV-0001'],
    'outstanding': 800,
    'unmatched_payments': ['P1', 'P3'],
})`,
        },
        {
          name: 'summary when everything is paid',
          code: String.raw`invoices = [{'id': 'INV-0001', 'amount': 100, 'due_date': '2026-03-01'}]
m = match_payments(invoices, [{'id': 'P1', 'amount': 100, 'memo': 'INV-0001'}])
assert_equal(summarize(invoices, m), {'unpaid': [], 'outstanding': 0, 'unmatched_payments': []})
assert_equal(summarize([], []), {'unpaid': [], 'outstanding': 0, 'unmatched_payments': []})`,
        },
      ],
    },
  ],
  solution: String.raw`import re

INVOICE_ID = re.compile(r'INV-\d+')


def _order(inv: dict) -> tuple[str, str]:
    return (inv['due_date'], inv['id'])


def match_payments(invoices: list[dict], payments: list[dict], tolerance: int = 0) -> list[dict]:
    by_id = {inv['id']: inv for inv in invoices}
    # Scanning in (due_date, id) order makes "first hit" the tie-break winner.
    ordered = sorted(invoices, key=_order)
    paid: set[str] = set()
    out: list[dict] = []

    for p in payments:
        def settle(inv: dict, reason: str) -> dict:
            paid.add(inv['id'])
            return {'payment_id': p['id'], 'invoice_id': inv['id'], 'reason': reason,
                    'difference': p['amount'] - inv['amount']}

        ref = INVOICE_ID.search(p['memo'])
        named = by_id.get(ref.group(0)) if ref else None
        if named is not None and named['id'] not in paid:
            out.append(settle(named, 'memo'))
            continue

        exact = next((inv for inv in ordered if inv['id'] not in paid and inv['amount'] == p['amount']), None)
        if exact is not None:
            out.append(settle(exact, 'amount'))
            continue

        best = None
        for inv in ordered:
            if inv['id'] in paid:
                continue
            d = abs(p['amount'] - inv['amount'])
            if d <= tolerance and (best is None or d < abs(p['amount'] - best['amount'])):
                best = inv
        if best is not None:
            out.append(settle(best, 'tolerance'))
            continue

        out.append({'payment_id': p['id'], 'invoice_id': None, 'reason': 'none', 'difference': 0})
    return out


def summarize(invoices: list[dict], matches: list[dict]) -> dict:
    paid = {m['invoice_id'] for m in matches if m['invoice_id'] is not None}
    unpaid = sorted((inv for inv in invoices if inv['id'] not in paid), key=_order)
    return {
        'unpaid': [inv['id'] for inv in unpaid],
        'outstanding': sum(inv['amount'] for inv in unpaid),
        'unmatched_payments': [m['payment_id'] for m in matches if m['reason'] == 'none'],
    }
`,
};
