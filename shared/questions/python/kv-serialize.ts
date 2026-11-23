import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `You are building persistence for an in-memory key-value store whose keys and values are both strings.

Write \`serialize(data)\`, which turns a \`dict[str, str]\` into a single string, and \`deserialize(s)\`, which turns that string back into the original dict.

- Keys and values may contain **any** character: delimiters like \`:\` \`,\` \`=\`, quotes, newlines, digits, emoji.
- The round trip must be exact: \`deserialize(serialize(data)) == data\`.
- Empty strings and an empty dict must work.
- Do not use \`json\`, \`pickle\` or \`repr\` / \`eval\`; the point is to design the format.`,
  starter: String.raw`def serialize(data: dict[str, str]) -> str:
    # TODO
    return ''


def deserialize(s: str) -> dict[str, str]:
    # TODO
    return {}
`,
  solution: String.raw`# Length-prefixed encoding: <len>:<chars> for every key and value.
def serialize(data: dict[str, str]) -> str:
    parts = []
    for k, v in data.items():
        parts.append(str(len(k)) + ':' + k + str(len(v)) + ':' + v)
    return ''.join(parts)


def deserialize(s: str) -> dict[str, str]:
    out: dict[str, str] = {}
    pos = 0

    def read() -> str:
        nonlocal pos
        colon = s.find(':', pos)
        if colon == -1:
            raise ValueError('malformed input at ' + str(pos))
        digits = s[pos:colon]
        if not digits.isdigit():
            raise ValueError('bad length at ' + str(pos))
        start = colon + 1
        end = start + int(digits)
        if end > len(s):
            raise ValueError('truncated input')
        pos = end
        return s[start:end]

    while pos < len(s):
        key = read()
        out[key] = read()
    return out


def save_chunked(data: dict[str, str], chunk_size: int, store: dict[str, str]) -> None:
    s = serialize(data)
    n = 0
    for i in range(0, len(s), chunk_size):
        store['chunk_' + str(n)] = s[i:i + chunk_size]
        n += 1
    store['meta'] = str(n)  # commit marker goes last


def load_chunked(store: dict[str, str]) -> dict[str, str]:
    meta = store.get('meta')
    if meta is None:
        return {}
    pieces = []
    for i in range(int(meta)):
        chunk = store.get('chunk_' + str(i))
        if chunk is None:
            raise KeyError('missing chunk ' + str(i))
        pieces.append(chunk)
    return deserialize(''.join(pieces))
`,
  parts: [
    {
      tests: [
        {
          name: 'simple map round-trips',
          code: String.raw`d = {'name': 'John', 'city': 'Paris'}
assert_equal(deserialize(serialize(d)), d)`,
        },
        {
          name: 'serialize returns a string',
          code: String.raw`assert_equal(type(serialize({'a': 'b'})).__name__, 'str')`,
        },
        {
          name: 'keys and values containing delimiters',
          code: String.raw`d = {'name:first': 'John:Doe', 'x,y': 'New,York', 'a=b': 'c=d;e', 'q"': "it's"}
assert_equal(deserialize(serialize(d)), d)`,
        },
        {
          name: 'newlines, tabs and unicode',
          code: String.raw`d = {'line\n1': 'v\r\n2', 'tab\t': '\x00nul', 'emoji🙂': '日本語'}
assert_equal(deserialize(serialize(d)), d)`,
        },
        {
          name: 'values that look like your length prefixes',
          code: String.raw`d = {'12': '3:4', '0:': '5:', '2:ab': '3:xyz'}
assert_equal(deserialize(serialize(d)), d)`,
        },
        {
          name: 'empty strings',
          code: String.raw`d = {'': 'x', 'a': ''}
assert_equal(deserialize(serialize(d)), d)
assert_equal(deserialize(serialize({'k': ''})), {'k': ''})`,
        },
        {
          name: 'empty map',
          code: String.raw`assert_equal(deserialize(serialize({})), {})`,
        },
        {
          name: 'fuzz: 300 random entries',
          code: String.raw`alphabet = 'ab:,=;"\'\n\\0123456789 🙂'
seed = 7
def rand(n):
    nonlocal seed
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed % n
def word():
    return ''.join(alphabet[rand(len(alphabet))] for _ in range(rand(12)))
d = {}
for i in range(300):
    d[word() + str(i)] = word()
assert_equal(deserialize(serialize(d)), d)`,
        },
      ],
    },
    {
      prompt: `The store is now too big to write as one blob. Implement:

\`\`\`python
def save_chunked(data: dict[str, str], chunk_size: int, store: dict[str, str]) -> None
def load_chunked(store: dict[str, str]) -> dict[str, str]
\`\`\`

- Split the serialized data into chunks of **at most** \`chunk_size\` characters, stored under keys \`chunk_0\`, \`chunk_1\`, ...
- Write a metadata entry under the key \`meta\` that tells \`load_chunked\` how many chunks to read (its format is up to you).
- \`meta\` must be written **last**: it acts as a commit marker, so a crash mid-save never leaves metadata pointing at chunks that do not exist. Write each entry with \`store[key] = value\`.
- \`load_chunked\` on a store with no \`meta\` returns \`{}\`.`,
      tests: [
        {
          name: 'round-trips through chunks',
          code: String.raw`store = {}
d = {'alpha': 'x' * 50, 'b:c': 'line\nbreak', '': ''}
save_chunked(d, 16, store)
assert_equal(load_chunked(store), d)`,
        },
        {
          name: 'every chunk respects chunkSize',
          code: String.raw`import re
store = {}
d = {'key' + str(i): 'value:' + str(i) for i in range(40)}
save_chunked(d, 10, store)
count = 0
for k, v in store.items():
    if k == 'meta':
        continue
    assert re.fullmatch(r'chunk_\d+', k), 'unexpected key ' + k
    assert len(v) <= 10, k + ' has length ' + str(len(v))
    count += 1
assert count > 1, 'expected several chunks, got ' + str(count)
assert_equal(load_chunked(store), d)`,
        },
        {
          name: 'meta is written last',
          code: String.raw`order = []
class RecordingStore(dict):
    def __setitem__(self, k, v):
        order.append(k)
        super().__setitem__(k, v)
store = RecordingStore()
save_chunked({'a': 'b' * 30}, 8, store)
assert len(order) > 1, 'expected chunk writes before meta'
assert_equal(order[-1], 'meta', 'last write')`,
        },
        {
          name: 'no meta means empty',
          code: String.raw`store = {'chunk_0': 'garbage'}
assert_equal(load_chunked(store), {})`,
        },
        {
          name: 'empty map round-trips',
          code: String.raw`store = {}
save_chunked({}, 4, store)
assert_equal(load_chunked(store), {})`,
        },
      ],
    },
  ],
};
