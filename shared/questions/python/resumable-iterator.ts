import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Long-running jobs get preempted. Build iterators that can checkpoint their position and resume from it.

Every iterator exposes \`get_state()\`, returning a **JSON-serializable** snapshot, and \`set_state(state)\`, which restores a snapshot taken from an iterator over the same data. Tests round-trip state through \`json.dumps\` / \`json.loads\`.`,
  starter: String.raw`from typing import Any, Generic, TypeVar

T = TypeVar('T')


class ListIterator(Generic[T]):
    def __init__(self, items: list[T]) -> None:
        self.items = items

    def has_next(self) -> bool:
        # TODO
        return False

    def next(self) -> T:
        # TODO: raise StopIteration when exhausted
        raise NotImplementedError

    def get_state(self) -> Any:
        # TODO
        return None

    def set_state(self, state: Any) -> None:
        # TODO
        pass
`,
  solution: String.raw`from typing import Any, Awaitable, Callable, Generic, Optional, TypeVar

T = TypeVar('T')


class ListIterator(Generic[T]):
    def __init__(self, items: list[T]) -> None:
        self.items = items
        self.i = 0

    def has_next(self) -> bool:
        return self.i < len(self.items)

    def next(self) -> T:
        if not self.has_next():
            raise StopIteration('exhausted')
        v = self.items[self.i]
        self.i += 1
        return v

    def get_state(self) -> dict[str, int]:
        return {'i': self.i}

    def set_state(self, state: Any) -> None:
        self.i = state['i']


class MultiListIterator(Generic[T]):
    def __init__(self, lists: list[list[T]]) -> None:
        self.lists = lists
        self.list = 0
        self.idx = 0
        self._skip()

    def _skip(self) -> None:
        while self.list < len(self.lists) and self.idx >= len(self.lists[self.list]):
            self.list += 1
            self.idx = 0

    def has_next(self) -> bool:
        return self.list < len(self.lists)

    def next(self) -> T:
        if not self.has_next():
            raise StopIteration('exhausted')
        v = self.lists[self.list][self.idx]
        self.idx += 1
        self._skip()
        return v

    def get_state(self) -> dict[str, int]:
        return {'list': self.list, 'idx': self.idx}

    def set_state(self, state: Any) -> None:
        self.list = state['list']
        self.idx = state['idx']
        self._skip()


# A page is {'items': [...], 'next_token': str | None}
Page = dict[str, Any]
FetchPage = Callable[[Optional[str]], Awaitable[Page]]


class PagedIterator(Generic[T]):
    def __init__(self, fetch_page: FetchPage) -> None:
        self.fetch_page = fetch_page
        # token of the page we are on, the page if loaded, and our offset in it
        self.token: Optional[str] = None
        self.page: Optional[Page] = None
        self.offset = 0

    async def next(self) -> tuple[bool, Optional[T]]:
        while True:
            if self.page is None:
                self.page = await self.fetch_page(self.token)
            items = self.page['items']
            if self.offset < len(items):
                v = items[self.offset]
                self.offset += 1
                return False, v
            if self.page['next_token'] is None:
                return True, None
            self.token = self.page['next_token']
            self.page = None
            self.offset = 0

    def get_state(self) -> dict[str, Any]:
        return {'token': self.token, 'offset': self.offset}

    def set_state(self, state: Any) -> None:
        self.token = state['token']
        self.offset = state['offset']
        self.page = None
`,
  parts: [
    {
      prompt:
        'Implement `ListIterator` over a list with `has_next()`, `next()`, `get_state()` and `set_state(state)`. `next()` raises when exhausted.',
      tests: [
        {
          name: 'iterates in order',
          code: String.raw`it = ListIterator([1, 2, 3])
out = []
while it.has_next():
    out.append(it.next())
assert_equal(out, [1, 2, 3])`,
        },
        {
          name: 'next() throws when exhausted',
          code: String.raw`it = ListIterator([])
assert_equal(it.has_next(), False)
assert_raises(lambda: it.next())`,
        },
        {
          name: 'resume from a checkpoint',
          code: String.raw`import json
it = ListIterator(['a', 'b', 'c', 'd'])
it.next(); it.next()
saved = json.loads(json.dumps(it.get_state()))
fresh = ListIterator(['a', 'b', 'c', 'd'])
fresh.set_state(saved)
assert_equal(fresh.next(), 'c')
assert_equal(fresh.next(), 'd')
assert_equal(fresh.has_next(), False)`,
        },
        {
          name: 'rewind to an earlier state',
          code: String.raw`import json
it = ListIterator([1, 2, 3])
start = json.loads(json.dumps(it.get_state()))
it.next(); it.next()
it.set_state(start)
assert_equal(it.next(), 1)`,
        },
      ],
    },
    {
      prompt:
        'Implement `MultiListIterator`, constructed with a `list[list[T]]`, that yields every element of every list in order, skipping empty lists, with the same four methods.',
      tests: [
        {
          name: 'flattens and skips empties',
          code: String.raw`it = MultiListIterator([[], [1, 2], [], [], [3], []])
out = []
while it.has_next():
    out.append(it.next())
assert_equal(out, [1, 2, 3])`,
        },
        {
          name: 'all empty',
          code: String.raw`it = MultiListIterator([[], []])
assert_equal(it.has_next(), False)
assert_raises(lambda: it.next())`,
        },
        {
          name: 'checkpoint across list boundaries',
          code: String.raw`import json
data = [[1], [], [2, 3], [4]]
it = MultiListIterator(data)
seen = []
states = []
while it.has_next():
    states.append(json.loads(json.dumps(it.get_state())))
    seen.append(it.next())
for i, state in enumerate(states):
    r = MultiListIterator(data)
    r.set_state(state)
    rest = []
    while r.has_next():
        rest.append(r.next())
    assert_equal(rest, seen[i:], 'resume at ' + str(i))`,
        },
      ],
    },
    {
      prompt: `Data now comes from a paged API. A page is a dict \`{'items': [...], 'next_token': str | None}\`, and the fetcher is async:

\`\`\`python
FetchPage = Callable[[str | None], Awaitable[dict]]
\`\`\`

Implement \`PagedIterator\` with \`__init__(self, fetch_page)\`, \`async def next(self) -> tuple[bool, T | None]\` returning \`(done, value)\`, \`get_state()\` and \`set_state(state)\`.

- The first call fetches page \`None\`. Pages may be empty but still have a \`next_token\`.
- Do not refetch a page you are partway through unless you were restored from state.
- Resuming from state must not re-fetch earlier pages: only the page you were on and the ones after it.`,
      tests: [
        {
          name: 'iterates all pages, skipping empty ones',
          code: String.raw`pages = {'start': {'items': [1, 2], 'next_token': 'p2'}, 'p2': {'items': [], 'next_token': 'p3'}, 'p3': {'items': [3], 'next_token': None}}
async def fetch_page(t):
    await asyncio.sleep(0.001)
    return pages['start' if t is None else t]
it = PagedIterator(fetch_page)
out = []
while True:
    done, value = await it.next()
    if done:
        break
    out.append(value)
assert_equal(out, [1, 2, 3])`,
        },
        {
          name: 'fetches each page once',
          code: String.raw`pages = {'start': {'items': [1, 2, 3], 'next_token': 'b'}, 'b': {'items': [4], 'next_token': None}}
calls = []
async def fetch_page(t):
    calls.append(t)
    return pages['start' if t is None else t]
it = PagedIterator(fetch_page)
while True:
    done, _ = await it.next()
    if done:
        break
assert_equal(calls, [None, 'b'])`,
        },
        {
          name: 'resume mid-page without refetching earlier pages',
          code: String.raw`import json
pages = {'start': {'items': ['a', 'b'], 'next_token': 'p2'}, 'p2': {'items': ['c', 'd', 'e'], 'next_token': None}}
async def plain(t):
    return pages['start' if t is None else t]
it = PagedIterator(plain)
await it.next(); await it.next(); await it.next()  # a b c
saved = json.loads(json.dumps(it.get_state()))
calls = []
async def counting(t):
    calls.append(t)
    return pages['start' if t is None else t]
resumed = PagedIterator(counting)
resumed.set_state(saved)
out = []
while True:
    done, value = await resumed.next()
    if done:
        break
    out.append(value)
assert_equal(out, ['d', 'e'])
assert None not in calls, 'refetched the first page: ' + repr(calls)`,
        },
      ],
    },
  ],
};
