import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Build a tiny in-memory database.

\`\`\`python
Value = str | int
Row = dict[str, Value]

class Database:
    def create_table(self, name: str, columns: list[str]) -> None: ...
    def insert(self, table: str, row: Row) -> None: ...
    def select(
        self,
        table: str,
        where: list[tuple[str, str, Value]] | None = None,      # (column, op, value), op in '=', '<', '>'
        order_by: list[tuple[str, str]] | None = None,          # (column, 'asc' | 'desc')
        columns: list[str] | None = None,
    ) -> list[Row]: ...
\`\`\`

Return copies of rows, so callers cannot mutate stored data.`,
  starter: String.raw`Value = str | int
Row = dict[str, Value]


class Database:
    def create_table(self, name: str, columns: list[str]) -> None:
        # TODO
        pass

    def insert(self, table: str, row: Row) -> None:
        # TODO
        pass

    def select(
        self,
        table: str,
        where: list[tuple[str, str, Value]] | None = None,
        order_by: list[tuple[str, str]] | None = None,
        columns: list[str] | None = None,
    ) -> list[Row]:
        # TODO
        return []
`,
  parts: [
    {
      tests: [
        {
          name: 'insert then select all',
          code: String.raw`db = Database()
db.create_table('users', ['id', 'name'])
db.insert('users', {'id': 1, 'name': 'ada'})
db.insert('users', {'id': 2, 'name': 'bob'})
assert_equal(db.select('users'), [{'id': 1, 'name': 'ada'}, {'id': 2, 'name': 'bob'}])`,
        },
        {
          name: 'validation errors',
          code: String.raw`db = Database()
db.create_table('t', ['a'])
assert_raises(lambda: db.create_table('t', ['a']), 'duplicate table')
assert_raises(lambda: db.insert('missing', {'a': 1}), 'unknown table')
assert_raises(lambda: db.insert('t', {'b': 1}), 'unknown column')
assert_raises(lambda: db.select('missing'), 'select unknown table')`,
        },
        {
          name: 'returned rows are copies',
          code: String.raw`db = Database()
db.create_table('t', ['a'])
db.insert('t', {'a': 1})
db.select('t')[0]['a'] = 99
assert_equal(db.select('t'), [{'a': 1}])`,
        },
      ],
    },
    {
      tests: [
        {
          name: 'single and combined conditions',
          code: String.raw`db = Database()
db.create_table('p', ['name', 'age', 'city'])
db.insert('p', {'name': 'a', 'age': 30, 'city': 'sf'})
db.insert('p', {'name': 'b', 'age': 25, 'city': 'ny'})
db.insert('p', {'name': 'c', 'age': 35, 'city': 'sf'})
db.insert('p', {'name': 'd', 'city': 'sf'})
assert_equal([r['name'] for r in db.select('p', where=[('city', '=', 'sf')])], ['a', 'c', 'd'])
assert_equal([r['name'] for r in db.select('p', where=[('city', '=', 'sf'), ('age', '>', 30)])], ['c'])
assert_equal([r['name'] for r in db.select('p', where=[('age', '<', 31)])], ['a', 'b'])`,
        },
        {
          name: 'unknown column in where throws',
          code: String.raw`db = Database()
db.create_table('t', ['a'])
assert_raises(lambda: db.select('t', where=[('zz', '=', 1)]))`,
        },
      ],
    },
    {
      prompt: `- \`order_by\` sorts by the first column, breaking ties with the next, and so on. Ties after all columns keep insertion order. Missing values sort first ascending.
- \`columns\` returns only those columns (unknown column raises).`,
      tests: [
        {
          name: 'multi-column order',
          code: String.raw`db = Database()
db.create_table('p', ['name', 'team', 'score'])
db.insert('p', {'name': 'a', 'team': 'x', 'score': 3})
db.insert('p', {'name': 'b', 'team': 'y', 'score': 5})
db.insert('p', {'name': 'c', 'team': 'x', 'score': 9})
db.insert('p', {'name': 'd', 'team': 'y', 'score': 5})
rows = db.select('p', order_by=[('team', 'asc'), ('score', 'desc')])
assert_equal([r['name'] for r in rows], ['c', 'a', 'b', 'd'])`,
        },
        {
          name: 'numbers sort numerically',
          code: String.raw`db = Database()
db.create_table('t', ['n'])
for n in [10, 9, 100, 1]:
    db.insert('t', {'n': n})
assert_equal([r['n'] for r in db.select('t', order_by=[('n', 'asc')])], [1, 9, 10, 100])`,
        },
        {
          name: 'where + order + projection together',
          code: String.raw`db = Database()
db.create_table('p', ['name', 'age'])
db.insert('p', {'name': 'a', 'age': 40})
db.insert('p', {'name': 'b', 'age': 20})
db.insert('p', {'name': 'c', 'age': 30})
rows = db.select('p', where=[('age', '>', 25)], order_by=[('age', 'asc')], columns=['name'])
assert_equal(rows, [{'name': 'c'}, {'name': 'a'}])
assert_raises(lambda: db.select('p', columns=['nope']))`,
        },
      ],
    },
  ],
  solution: String.raw`Value = str | int
Row = dict[str, Value]


class Table:
    def __init__(self, columns: list[str]) -> None:
        self.columns = set(columns)
        self.rows: list[Row] = []

    def check(self, column: str) -> None:
        if column not in self.columns:
            raise KeyError('unknown column: ' + column)


class Database:
    def __init__(self) -> None:
        self.tables: dict[str, Table] = {}

    def create_table(self, name: str, columns: list[str]) -> None:
        if name in self.tables:
            raise ValueError('table exists: ' + name)
        self.tables[name] = Table(columns)

    def insert(self, table: str, row: Row) -> None:
        t = self._table(table)
        for c in row:
            t.check(c)
        t.rows.append(dict(row))

    def select(
        self,
        table: str,
        where: list[tuple[str, str, Value]] | None = None,
        order_by: list[tuple[str, str]] | None = None,
        columns: list[str] | None = None,
    ) -> list[Row]:
        t = self._table(table)
        rows = t.rows
        for column, op, value in where or []:
            t.check(column)
            rows = [r for r in rows if column in r and matches(r[column], op, value)]
        order = order_by or []
        for column, _ in order:
            t.check(column)
        # Python's sort is stable, so sorting by the last key first gives a
        # multi-column sort that keeps insertion order on full ties.
        rows = list(rows)
        for column, direction in reversed(order):
            rows.sort(
                key=lambda r: (column in r, r.get(column, 0)),
                reverse=direction == 'desc',
            )
        if columns is not None:
            for c in columns:
                t.check(c)
            return [{c: r[c] for c in columns if c in r} for r in rows]
        return [dict(r) for r in rows]

    def _table(self, name: str) -> Table:
        if name not in self.tables:
            raise KeyError('unknown table: ' + name)
        return self.tables[name]


def matches(v: Value, op: str, value: Value) -> bool:
    if op == '=':
        return v == value
    if op == '<':
        return v < value
    return v > value
`,
};
