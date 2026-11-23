import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Implement a spreadsheet.

\`\`\`python
class Spreadsheet:
    def set_cell(self, cell: str, value: str) -> None: ...
    def get_cell(self, cell: str) -> int: ...
\`\`\`

Cells are named like \`A1\`, \`B12\`, \`AA3\`. A value is either an integer literal (\`"42"\`, \`"-3"\`) or a formula starting with \`=\` that adds integers and cell references: \`"=A1+B2+10"\`. An empty cell is \`0\`.`,
  starter: String.raw`class Spreadsheet:
    def set_cell(self, cell: str, value: str) -> None:
        # TODO
        pass

    def get_cell(self, cell: str) -> int:
        # TODO
        return 0
`,
  parts: [
    {
      tests: [
        {
          name: 'literals and empty cells',
          code: String.raw`s = Spreadsheet()
s.set_cell('A1', '5')
assert_equal(s.get_cell('A1'), 5)
assert_equal(s.get_cell('Z99'), 0)`,
        },
        {
          name: 'formula with refs and constants',
          code: String.raw`s = Spreadsheet()
s.set_cell('A1', '5')
s.set_cell('B1', '7')
s.set_cell('C1', '=A1+B1+10')
assert_equal(s.get_cell('C1'), 22)`,
        },
        {
          name: 'changes propagate through chains',
          code: String.raw`s = Spreadsheet()
s.set_cell('A1', '1')
s.set_cell('B1', '=A1+1')
s.set_cell('C1', '=B1+B1')
assert_equal(s.get_cell('C1'), 4)
s.set_cell('A1', '10')
assert_equal(s.get_cell('C1'), 22)`,
        },
        {
          name: 'negative literals and multi-letter columns',
          code: String.raw`s = Spreadsheet()
s.set_cell('AA10', '-4')
s.set_cell('B2', '=AA10+-6')
assert_equal(s.get_cell('B2'), -10)`,
        },
      ],
    },
    {
      prompt:
        'A `set_cell` that would create a reference cycle (including a cell referencing itself) must raise and leave the sheet unchanged.',
      tests: [
        {
          name: 'self reference',
          code: String.raw`s = Spreadsheet()
assert_raises(lambda: s.set_cell('A1', '=A1+1'))
assert_equal(s.get_cell('A1'), 0)`,
        },
        {
          name: 'indirect cycle is rejected, old value kept',
          code: String.raw`s = Spreadsheet()
s.set_cell('A1', '3')
s.set_cell('B1', '=A1')
s.set_cell('C1', '=B1+1')
assert_raises(lambda: s.set_cell('A1', '=C1'))
assert_equal(s.get_cell('A1'), 3)
assert_equal(s.get_cell('C1'), 4)`,
        },
        {
          name: 'diamond is not a cycle',
          code: String.raw`s = Spreadsheet()
s.set_cell('A1', '2')
s.set_cell('B1', '=A1')
s.set_cell('C1', '=A1')
s.set_cell('D1', '=B1+C1')
assert_equal(s.get_cell('D1'), 4)`,
        },
      ],
    },
    {
      prompt: `Support \`SUM(A1:B3)\` as a term inside formulas (rectangular, inclusive): \`"=SUM(A1:A3)+B1"\`.

Reads must be fast: after building a long chain, 20k \`get_cell\` calls should not re-evaluate the whole chain each time.`,
      tests: [
        {
          name: 'SUM over a rectangle',
          code: String.raw`s = Spreadsheet()
s.set_cell('A1', '1')
s.set_cell('A2', '2')
s.set_cell('B1', '3')
s.set_cell('B2', '4')
s.set_cell('C1', '=SUM(A1:B2)+10')
assert_equal(s.get_cell('C1'), 20)
s.set_cell('B2', '0')
assert_equal(s.get_cell('C1'), 16)`,
        },
        {
          name: 'cycle through a range',
          code: String.raw`s = Spreadsheet()
assert_raises(lambda: s.set_cell('A2', '=SUM(A1:A3)'))`,
        },
        {
          // 300 cells, not 2000: Python's recursion limit is 1000, and a natural
          // recursive get_cell (sum over a generator) spends ~2 frames per cell.
          // Uncached reads still cost 20k x 300 evaluations, far over 500 ms.
          name: 'cached reads on a long chain',
          code: String.raw`import time
s = Spreadsheet()
s.set_cell('A1', '1')
for i in range(2, 301):
    s.set_cell('A' + str(i), '=A' + str(i - 1) + '+1')
t0 = time.perf_counter()
for _ in range(20000):
    s.get_cell('A300')
assert_equal(s.get_cell('A300'), 300)
ms = (time.perf_counter() - t0) * 1000
assert ms < 500, '20k reads took ' + str(round(ms)) + ' ms'`,
        },
      ],
    },
  ],
  solution: String.raw`import re

CELL = re.compile(r'^([A-Z]+)(\d+)$')
RANGE = re.compile(r'^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$')
NUMBER = re.compile(r'^-?\d+$')


class Spreadsheet:
    def __init__(self) -> None:
        # A cell's formula is a constant plus the cells it adds up.
        self.formulas: dict[str, tuple[int, list[str]]] = {}
        self.cache: dict[str, int] = {}
        self.dependents: dict[str, set[str]] = {}

    def set_cell(self, cell: str, value: str) -> None:
        const, refs = parse(value)
        # Cycle: does any dependency (transitively) depend on this cell?
        seen: set[str] = set()
        stack = list(refs)
        while stack:
            c = stack.pop()
            if c == cell:
                raise ValueError('cycle via ' + cell)
            if c in seen:
                continue
            seen.add(c)
            stack.extend(self.formulas.get(c, (0, []))[1])
        for d in self.formulas.get(cell, (0, []))[1]:
            self.dependents.get(d, set()).discard(cell)
        self.formulas[cell] = (const, refs)
        for d in refs:
            self.dependents.setdefault(d, set()).add(cell)
        self._invalidate(cell)

    def get_cell(self, cell: str) -> int:
        if cell in self.cache:
            return self.cache[cell]
        const, refs = self.formulas.get(cell, (0, []))
        total = const + sum(self.get_cell(c) for c in refs)
        self.cache[cell] = total
        return total

    def _invalidate(self, cell: str) -> None:
        stack = [cell]
        while stack:
            c = stack.pop()
            if self.cache.pop(c, None) is None and c != cell:
                continue
            stack.extend(self.dependents.get(c, ()))


def parse(value: str) -> tuple[int, list[str]]:
    if not value.startswith('='):
        try:
            return int(value), []
        except ValueError:
            return 0, []
    const, refs = 0, []
    for raw in value[1:].split('+'):
        s = raw.strip()
        if m := RANGE.match(s):
            refs.extend(expand(m.group(1), m.group(2)))
        elif CELL.match(s):
            refs.append(s)
        elif NUMBER.match(s):
            const += int(s)
        else:
            raise ValueError('bad term: ' + s)
    return const, refs


def split(cell: str) -> tuple[int, int]:
    m = CELL.match(cell)
    col = 0
    for ch in m.group(1):
        col = col * 26 + ord(ch) - 64
    return col, int(m.group(2))


def col_name(col: int) -> str:
    s = ''
    while col > 0:
        col, r = divmod(col - 1, 26)
        s = chr(65 + r) + s
    return s


def expand(a: str, b: str) -> list[str]:
    (c1, r1), (c2, r2) = split(a), split(b)
    return [
        col_name(c) + str(r)
        for c in range(min(c1, c2), max(c1, c2) + 1)
        for r in range(min(r1, r2), max(r1, r2) + 1)
    ]
`,
};
