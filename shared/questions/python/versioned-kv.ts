import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Implement a key-value store that keeps every version of a value.

\`\`\`python
class VersionedKV:
    def set(self, key: str, value: str, timestamp: int) -> None: ...
    def get(self, key: str, timestamp: int | None = None) -> str | None: ...
\`\`\`

- \`get(key, t)\` returns the value set at the largest timestamp **<= t**, or \`None\` if there is none.
- \`get(key)\` with no timestamp returns the latest value.
- Setting the same key at the same timestamp overwrites that version.`,
  starter: String.raw`class VersionedKV:
    def set(self, key: str, value: str, timestamp: int) -> None:
        # TODO
        pass

    def get(self, key: str, timestamp: int | None = None) -> str | None:
        # TODO
        return None
`,
  solution: String.raw`from bisect import bisect_right


class VersionedKV:
    def __init__(self) -> None:
        # key -> (sorted timestamps, values); a None value is a tombstone
        self._versions: dict[str, tuple[list[int], list[str | None]]] = {}

    def set(self, key: str, value: str, timestamp: int) -> None:
        self._put(key, value, timestamp)

    def delete(self, key: str, timestamp: int) -> None:
        self._put(key, None, timestamp)

    def get(self, key: str, timestamp: int | None = None) -> str | None:
        entry = self._versions.get(key)
        if not entry or not entry[0]:
            return None
        times, values = entry
        if timestamp is None:
            return values[-1]
        i = bisect_right(times, timestamp) - 1
        return values[i] if i >= 0 else None

    def _put(self, key: str, value: str | None, ts: int) -> None:
        times, values = self._versions.setdefault(key, ([], []))
        # Fast path for in-order writes.
        if not times or times[-1] < ts:
            times.append(ts)
            values.append(value)
            return
        i = bisect_right(times, ts) - 1
        if i >= 0 and times[i] == ts:
            values[i] = value
        else:
            times.insert(i + 1, ts)
            values.insert(i + 1, value)
`,
  parts: [
    {
      tests: [
        {
          name: 'latest value without timestamp',
          code: String.raw`kv = VersionedKV()
kv.set('a', '1', 10); kv.set('a', '2', 20)
assert_equal(kv.get('a'), '2')`,
        },
        {
          name: 'point-in-time reads',
          code: String.raw`kv = VersionedKV()
kv.set('a', '1', 10); kv.set('a', '2', 20); kv.set('a', '3', 30)
assert_equal(kv.get('a', 5), None, 'before first write')
assert_equal(kv.get('a', 10), '1', 'exact')
assert_equal(kv.get('a', 25), '2', 'between')
assert_equal(kv.get('a', 1000), '3', 'after last')`,
        },
        {
          name: 'missing key',
          code: String.raw`kv = VersionedKV()
assert_equal(kv.get('nope'), None)
assert_equal(kv.get('nope', 5), None)`,
        },
        {
          name: 'keys are independent',
          code: String.raw`kv = VersionedKV()
kv.set('a', 'x', 1); kv.set('b', 'y', 2)
assert_equal(kv.get('a', 2), 'x')
assert_equal(kv.get('b', 1), None)`,
        },
        {
          name: 'same timestamp overwrites',
          code: String.raw`kv = VersionedKV()
kv.set('a', 'old', 5); kv.set('a', 'new', 5)
assert_equal(kv.get('a', 5), 'new')`,
        },
      ],
    },
    {
      prompt: `Writes can now arrive with **any** timestamp order (replication lag). Also add:

\`\`\`python
def delete(self, key: str, timestamp: int) -> None: ...
\`\`\`

A delete is a tombstone: reads at or after it return \`None\` until a later \`set\`.`,
      tests: [
        {
          name: 'out-of-order sets',
          code: String.raw`kv = VersionedKV()
kv.set('a', '3', 30); kv.set('a', '1', 10); kv.set('a', '2', 20)
assert_equal(kv.get('a', 15), '1')
assert_equal(kv.get('a', 25), '2')
assert_equal(kv.get('a'), '3')`,
        },
        {
          name: 'delete hides older versions',
          code: String.raw`kv = VersionedKV()
kv.set('a', '1', 10); kv.delete('a', 20); kv.set('a', '3', 30)
assert_equal(kv.get('a', 15), '1')
assert_equal(kv.get('a', 20), None)
assert_equal(kv.get('a', 25), None)
assert_equal(kv.get('a', 30), '3')`,
        },
        {
          name: 'latest read after delete',
          code: String.raw`kv = VersionedKV()
kv.set('a', '1', 10); kv.delete('a', 20)
assert_equal(kv.get('a'), None)`,
        },
      ],
    },
    {
      tests: [
        {
          name: '100k writes + 100k reads',
          code: String.raw`import time
kv = VersionedKV()
t0 = time.perf_counter()
for i in range(100000):
    kv.set('hot', 'v' + str(i), i * 2)
for i in range(100000):
    got = kv.get('hot', i * 2 + 1)
    if got != 'v' + str(i):
        raise AssertionError('at ' + str(i) + ' got ' + repr(got))
ms = (time.perf_counter() - t0) * 1000
assert ms < 3000, 'took ' + str(round(ms)) + ' ms'`,
        },
      ],
    },
  ],
};
