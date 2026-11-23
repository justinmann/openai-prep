import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Build a small file system that lives entirely in memory.

\`\`\`python
class FileSystem:
    def mkdir(self, path: str) -> None: ...
    def write_file(self, path: str, content: str) -> None: ...
    def append_file(self, path: str, content: str) -> None: ...
    def read_file(self, path: str) -> str: ...
    def ls(self, path: str) -> list[str]: ...
\`\`\`

- Paths are absolute and normalized: \`'/'\` is the root, otherwise \`'/a/b/c'\` (no trailing slash, no \`.\` or \`..\`).
- \`mkdir\` creates every missing directory along the path; an existing directory is fine.
- \`write_file\` creates the file or **overwrites** it; \`append_file\` creates it or adds to the end. The parent directory must already exist.
- \`ls\` on a directory returns its child names sorted; on a file it returns \`[name]\`.
- Errors **raise** an exception: a missing path, a missing parent, or a file where a directory is needed (or the reverse).

Example: \`mkdir('/a/b')\`, \`write_file('/a/b/x.txt', 'hi')\`, then \`ls('/a')\` is \`['b']\` and \`read_file('/a/b/x.txt')\` is \`'hi'\`.`,
  starter: String.raw`class FileSystem:
    def mkdir(self, path: str) -> None:
        # TODO
        pass

    def write_file(self, path: str, content: str) -> None:
        # TODO
        pass

    def append_file(self, path: str, content: str) -> None:
        # TODO
        pass

    def read_file(self, path: str) -> str:
        # TODO
        return ''

    def ls(self, path: str) -> list[str]:
        # TODO
        return []
`,
  parts: [
    {
      prompt:
        'Start with an empty root directory. `FileSystem()` takes no arguments for now.',
      tests: [
        {
          name: 'write and read back',
          code: String.raw`fs = FileSystem()
fs.mkdir('/docs')
fs.write_file('/docs/a.txt', 'hello')
assert_equal(fs.read_file('/docs/a.txt'), 'hello')
fs.write_file('/docs/a.txt', 'bye')
assert_equal(fs.read_file('/docs/a.txt'), 'bye', 'overwrite')`,
        },
        {
          name: 'appendFile creates then appends',
          code: String.raw`fs = FileSystem()
fs.append_file('/log', 'a')
fs.append_file('/log', 'bc')
assert_equal(fs.read_file('/log'), 'abc')
fs.write_file('/empty', '')
assert_equal(fs.read_file('/empty'), '', 'empty files exist')`,
        },
        {
          name: 'mkdir creates parents and is idempotent',
          code: String.raw`fs = FileSystem()
fs.mkdir('/a/b/c')
fs.mkdir('/a/b')
fs.mkdir('/')
assert_equal(fs.ls('/'), ['a'])
assert_equal(fs.ls('/a'), ['b'])
assert_equal(fs.ls('/a/b/c'), [])`,
        },
        {
          name: 'ls sorts names and handles files',
          code: String.raw`fs = FileSystem()
fs.mkdir('/d')
fs.write_file('/d/zeta', '1')
fs.mkdir('/d/alpha')
fs.write_file('/d/Mid', '2')
assert_equal(fs.ls('/d'), ['Mid', 'alpha', 'zeta'])
assert_equal(fs.ls('/d/zeta'), ['zeta'])`,
        },
        {
          name: 'missing paths throw',
          code: String.raw`fs = FileSystem()
assert_raises(lambda: fs.read_file('/nope'), 'read missing')
assert_raises(lambda: fs.ls('/nope'), 'ls missing')
assert_raises(lambda: fs.write_file('/no/parent.txt', 'x'), 'parent must exist')
assert_raises(lambda: fs.append_file('/no/parent.txt', 'x'), 'append parent must exist')
assert_equal(fs.ls('/'), [], 'failed writes create nothing')`,
        },
        {
          name: 'file vs directory conflicts throw',
          code: String.raw`fs = FileSystem()
fs.mkdir('/d')
fs.write_file('/f', 'x')
assert_raises(lambda: fs.read_file('/d'), 'read a directory')
assert_raises(lambda: fs.write_file('/d', 'x'), 'write over a directory')
assert_raises(lambda: fs.mkdir('/f'), 'mkdir over a file')
assert_raises(lambda: fs.mkdir('/f/sub'), 'mkdir through a file')
assert_raises(lambda: fs.write_file('/f/x', 'y'), 'file as parent')
assert_raises(lambda: fs.write_file('/', 'x'), 'root is a directory')
assert_equal(fs.read_file('/f'), 'x')`,
        },
      ],
    },
    {
      prompt: `The disk now has a size. A file's size is \`len(content)\`; directories are free.

\`\`\`python
def __init__(self, capacity: int | None = None) -> None: ...  # bytes; None means unlimited
def rm(self, path: str) -> None: ...                          # recursive for directories
def du(self, path: str) -> int: ...                           # total bytes of all files at or under path
def find(self, path: str, name_contains: str | None = None,
         min_size: int | None = None, max_size: int | None = None) -> list[str]: ...
\`\`\`

- A write or append that would push the total over \`capacity\` raises and **changes nothing**. Overwriting frees the old content first.
- \`rm\` frees space; removing \`'/'\` or a missing path raises.
- \`find\` returns the full paths of **files** at or under \`path\` that match every given filter (size bounds inclusive), sorted. A missing path raises.`,
      tests: [
        {
          name: 'capacity limits writes',
          code: String.raw`fs = FileSystem(capacity=10)
fs.write_file('/a', '123456')
assert_raises(lambda: fs.write_file('/b', '12345'), 'over capacity')
assert_raises(lambda: fs.read_file('/b'), 'rejected write created nothing')
fs.write_file('/b', '1234')
assert_equal(fs.du('/'), 10, 'exactly full is fine')`,
        },
        {
          name: 'overwrite and append count correctly',
          code: String.raw`fs = FileSystem(capacity=10)
fs.write_file('/a', '12345678')
fs.write_file('/a', '1234567890')
assert_equal(fs.du('/a'), 10, 'overwrite frees old bytes first')
assert_raises(lambda: fs.append_file('/a', 'x'), 'append over capacity')
assert_equal(fs.read_file('/a'), '1234567890', 'failed append changed nothing')`,
        },
        {
          name: 'rm is recursive and frees space',
          code: String.raw`fs = FileSystem(capacity=6)
fs.mkdir('/a/b')
fs.write_file('/a/b/x', '123')
fs.write_file('/a/y', '456')
fs.rm('/a')
assert_equal(fs.ls('/'), [])
assert_raises(lambda: fs.read_file('/a/b/x'))
fs.write_file('/z', '123456')
assert_equal(fs.du('/'), 6)`,
        },
        {
          name: 'rm errors',
          code: String.raw`fs = FileSystem()
fs.write_file('/f', 'x')
assert_raises(lambda: fs.rm('/missing'), 'missing')
assert_raises(lambda: fs.rm('/'), 'root')
fs.rm('/f')
assert_raises(lambda: fs.rm('/f'), 'already removed')`,
        },
        {
          name: 'du sums a subtree',
          code: String.raw`fs = FileSystem()
fs.mkdir('/a/b')
fs.mkdir('/c')
fs.write_file('/a/one', '1')
fs.write_file('/a/b/two', '22')
fs.write_file('/c/three', '333')
assert_equal(fs.du('/'), 6)
assert_equal(fs.du('/a'), 3)
assert_equal(fs.du('/a/b/two'), 2)
assert_equal(fs.du('/c'), 3)
assert_raises(lambda: fs.du('/nope'))`,
        },
        {
          name: 'find with filters',
          code: String.raw`fs = FileSystem()
fs.mkdir('/src/lib')
fs.write_file('/src/main.ts', '12345')
fs.write_file('/src/lib/util.ts', '12')
fs.write_file('/src/lib/readme.md', '1234567890')
fs.write_file('/top.ts', '1')
assert_equal(fs.find('/src'), ['/src/lib/readme.md', '/src/lib/util.ts', '/src/main.ts'])
assert_equal(fs.find('/', name_contains='.ts'), ['/src/lib/util.ts', '/src/main.ts', '/top.ts'])
assert_equal(fs.find('/', min_size=2, max_size=5), ['/src/lib/util.ts', '/src/main.ts'])
assert_equal(fs.find('/src/main.ts', name_contains='main'), ['/src/main.ts'], 'a file path')
assert_equal(fs.find('/src', name_contains='lib'), [], 'directories are not results')
assert_raises(lambda: fs.find('/nope'))`,
        },
      ],
    },
    {
      prompt: `Add users. Every mutating call takes an optional keyword argument \`user\` (default \`'root'\`); reads stay open to everyone.

\`\`\`python
def __init__(self, capacity: int | None = None, quotas: dict[str, int] | None = None) -> None: ...
# mkdir(path, user='root'), write_file(path, content, user='root'),
# append_file(path, content, user='root'), rm(path, user='root')
def mv(self, src: str, dst: str, user: str = 'root') -> None: ...
def owner(self, path: str) -> str: ...     # who owns this file or directory
def usage(self, user: str) -> int: ...     # bytes in files owned by user
\`\`\`

- Anything a call creates (including parents made by \`mkdir\`) is owned by the caller. The root directory is owned by \`'root'\`. Anyone may create new entries anywhere.
- Only a file's owner may overwrite or append to it. Only the owner may \`rm\` a file; \`rm\` of a directory needs the caller to own it **and** everything inside it. \`'root'\` may do all of these.
- A user with a quota cannot own more than that many bytes; the quota is checked **in addition to** total capacity, and the bytes count against the file's owner. A failing call raises and changes nothing.
- \`mv\` moves a file or directory tree with the same permission rule as \`rm\`. Ownership (and so usage) is preserved. It raises without changing anything if \`src\` is missing or \`'/'\`, \`dst\` already exists, the parent of \`dst\` is missing, or \`dst\` is inside \`src\`.`,
      tests: [
        {
          name: 'creator owns new entries',
          code: String.raw`fs = FileSystem()
fs.mkdir('/home/alice', user='alice')
fs.write_file('/home/alice/notes', 'hi', user='alice')
fs.write_file('/sys', 'x')
assert_equal(fs.owner('/home'), 'alice', 'parents too')
assert_equal(fs.owner('/home/alice/notes'), 'alice')
assert_equal(fs.owner('/sys'), 'root')
assert_equal(fs.owner('/'), 'root')`,
        },
        {
          name: 'only the owner or root can write',
          code: String.raw`fs = FileSystem()
fs.write_file('/a', 'mine', user='alice')
assert_raises(lambda: fs.write_file('/a', 'yours', user='bob'), 'overwrite')
assert_raises(lambda: fs.append_file('/a', '!', user='bob'), 'append')
assert_equal(fs.read_file('/a'), 'mine', 'anyone can read')
fs.append_file('/a', '!', user='alice')
fs.write_file('/a', 'fixed', user='root')
assert_equal(fs.read_file('/a'), 'fixed')
assert_equal(fs.owner('/a'), 'alice', 'root writing keeps the owner')`,
        },
        {
          name: 'rm permissions',
          code: String.raw`fs = FileSystem()
fs.mkdir('/shared', user='alice')
fs.write_file('/shared/a', '1', user='alice')
fs.write_file('/shared/b', '2', user='bob')
assert_raises(lambda: fs.rm('/shared/a', user='bob'), 'not your file')
assert_raises(lambda: fs.rm('/shared', user='alice'), 'dir holds a file alice does not own')
assert_equal(fs.ls('/shared'), ['a', 'b'], 'failed rm removed nothing')
fs.rm('/shared/b', user='bob')
fs.rm('/shared', user='alice')
fs.mkdir('/x/y', user='carol')
fs.rm('/x', user='root')
assert_equal(fs.ls('/'), [])`,
        },
        {
          name: 'per-user quotas',
          code: String.raw`fs = FileSystem(quotas={'alice': 5})
fs.write_file('/a1', '123', user='alice')
assert_raises(lambda: fs.write_file('/a2', '123', user='alice'), 'alice over quota')
fs.write_file('/a2', '12', user='alice')
assert_equal(fs.usage('alice'), 5)
fs.write_file('/b', '1234567890', user='bob')
assert_equal(fs.usage('bob'), 10, 'no quota means unlimited')
assert_raises(lambda: fs.append_file('/a1', 'x', user='root'), 'bytes count against the owner')
fs.rm('/a1', user='alice')
assert_equal(fs.usage('alice'), 2)
assert_equal(fs.usage('nobody'), 0)`,
        },
        {
          name: 'quota and capacity both apply',
          code: String.raw`fs = FileSystem(capacity=8, quotas={'alice': 6})
fs.write_file('/b', '12345', user='bob')
assert_raises(lambda: fs.write_file('/a', '1234', user='alice'), 'within quota but over capacity')
assert_equal(fs.usage('alice'), 0)
assert_raises(lambda: fs.ls('/a'), 'nothing created')
fs.write_file('/a', '123', user='alice')
assert_equal(fs.du('/'), 8)`,
        },
        {
          name: 'mv moves trees and keeps owners',
          code: String.raw`fs = FileSystem(quotas={'alice': 4})
fs.mkdir('/src/deep', user='alice')
fs.write_file('/src/deep/f', '1234', user='alice')
fs.mkdir('/dst', user='bob')
fs.mv('/src', '/dst/moved', user='alice')
assert_equal(fs.ls('/'), ['dst'])
assert_equal(fs.read_file('/dst/moved/deep/f'), '1234')
assert_equal(fs.owner('/dst/moved/deep/f'), 'alice')
assert_equal(fs.owner('/dst/moved'), 'alice')
assert_equal(fs.usage('alice'), 4)
fs.mv('/dst/moved/deep/f', '/g', user='alice')
assert_equal(fs.ls('/dst/moved/deep'), [])
assert_equal(fs.read_file('/g'), '1234')`,
        },
        {
          name: 'mv fails cleanly',
          code: String.raw`fs = FileSystem()
fs.mkdir('/a/b', user='alice')
fs.write_file('/a/f', 'x', user='alice')
fs.write_file('/taken', 'y', user='bob')
assert_raises(lambda: fs.mv('/a/f', '/taken', user='alice'), 'dst exists')
assert_raises(lambda: fs.mv('/a/f', '/no/where', user='alice'), 'dst parent missing')
assert_raises(lambda: fs.mv('/a', '/a/b/inside', user='alice'), 'into itself')
assert_raises(lambda: fs.mv('/missing', '/m', user='alice'), 'src missing')
assert_raises(lambda: fs.mv('/', '/r'), 'root')
assert_raises(lambda: fs.mv('/taken', '/mine', user='alice'), 'not the owner')
assert_equal(fs.read_file('/a/f'), 'x')
assert_equal(fs.read_file('/taken'), 'y')
assert_equal(fs.ls('/'), ['a', 'taken'])
assert_equal(fs.ls('/a'), ['b', 'f'])`,
        },
      ],
    },
  ],
  solution: String.raw`from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Node:
    name: str
    owner: str
    is_dir: bool
    content: str = ''
    children: dict[str, Node] = field(default_factory=dict)


class FileSystem:
    def __init__(self, capacity: int | None = None, quotas: dict[str, int] | None = None) -> None:
        self.root = Node('', 'root', True)
        self.capacity = capacity
        self.quotas = dict(quotas or {})
        self.used = 0
        self.used_by: dict[str, int] = {}

    def mkdir(self, path: str, user: str = 'root') -> None:
        d = self.root
        for part in self._parts(path):
            nxt = d.children.get(part)
            if nxt is None:
                nxt = Node(part, user, True)
                d.children[part] = nxt
            elif not nxt.is_dir:
                raise ValueError('not a directory: ' + path)
            d = nxt

    def write_file(self, path: str, content: str, user: str = 'root') -> None:
        self._put(path, content, user, False)

    def append_file(self, path: str, content: str, user: str = 'root') -> None:
        self._put(path, content, user, True)

    def read_file(self, path: str) -> str:
        node = self._get(path)
        if node.is_dir:
            raise ValueError('is a directory: ' + path)
        return node.content

    def ls(self, path: str) -> list[str]:
        node = self._get(path)
        return sorted(node.children) if node.is_dir else [node.name]

    def rm(self, path: str, user: str = 'root') -> None:
        d, name = self._parent_of(path)
        node = d.children.get(name)
        if node is None:
            raise FileNotFoundError(path)
        self._check_tree(node, user)
        for _, f in self._files(node, ''):
            self._charge(f.owner, -len(f.content))
        del d.children[name]

    def du(self, path: str) -> int:
        return sum(len(f.content) for _, f in self._files(self._get(path), ''))

    def find(self, path: str, name_contains: str | None = None,
             min_size: int | None = None, max_size: int | None = None) -> list[str]:
        node = self._get(path)
        base = '' if path == '/' else path[: len(path) - len(node.name) - 1]
        out = []
        for p, f in self._files(node, base):
            size = len(f.content)
            if name_contains is not None and name_contains not in f.name:
                continue
            if min_size is not None and size < min_size:
                continue
            if max_size is not None and size > max_size:
                continue
            out.append(p)
        return sorted(out)

    def mv(self, src: str, dst: str, user: str = 'root') -> None:
        src_dir, src_name = self._parent_of(src)
        node = src_dir.children.get(src_name)
        if node is None:
            raise FileNotFoundError(src)
        self._check_tree(node, user)
        if dst == src or dst.startswith(src + '/'):
            raise ValueError('cannot move into itself')
        dst_dir, dst_name = self._parent_of(dst)
        if dst_name in dst_dir.children:
            raise FileExistsError(dst)
        del src_dir.children[src_name]
        node.name = dst_name
        dst_dir.children[dst_name] = node

    def owner(self, path: str) -> str:
        return self._get(path).owner

    def usage(self, user: str) -> int:
        return self.used_by.get(user, 0)

    # helpers

    def _parts(self, path: str) -> list[str]:
        if not path.startswith('/'):
            raise ValueError('path must be absolute: ' + path)
        return [p for p in path.split('/') if p]

    def _get(self, path: str) -> Node:
        node = self.root
        for part in self._parts(path):
            nxt = node.children.get(part) if node.is_dir else None
            if nxt is None:
                raise FileNotFoundError(path)
            node = nxt
        return node

    def _parent_of(self, path: str) -> tuple[Node, str]:
        parts = self._parts(path)
        if not parts:
            raise ValueError('not allowed on the root')
        parent = self._get('/' + '/'.join(parts[:-1]))
        if not parent.is_dir:
            raise ValueError('not a directory: ' + path)
        return parent, parts[-1]

    def _put(self, path: str, content: str, user: str, append: bool) -> None:
        d, name = self._parent_of(path)
        existing = d.children.get(name)
        if existing is not None and existing.is_dir:
            raise ValueError('is a directory: ' + path)
        if existing is not None and user != 'root' and existing.owner != user:
            raise PermissionError(path)
        owner = existing.owner if existing is not None else user
        old = existing.content if existing is not None else ''
        new = old + content if append else content
        self._charge(owner, len(new) - len(old))
        if existing is not None:
            existing.content = new
        else:
            d.children[name] = Node(name, owner, False, new)

    # Validates before mutating, so a rejected write changes nothing.
    def _charge(self, owner: str, delta: int) -> None:
        mine = self.used_by.get(owner, 0)
        if delta > 0:
            if self.capacity is not None and self.used + delta > self.capacity:
                raise OSError('disk full')
            quota = self.quotas.get(owner)
            if quota is not None and mine + delta > quota:
                raise OSError('quota exceeded for ' + owner)
        self.used += delta
        self.used_by[owner] = mine + delta

    def _check_tree(self, node: Node, user: str) -> None:
        if user == 'root':
            return
        if node.owner != user:
            raise PermissionError(node.name)
        for child in node.children.values():
            self._check_tree(child, user)

    def _files(self, node: Node, prefix: str) -> list[tuple[str, Node]]:
        path = '' if node is self.root else prefix + '/' + node.name
        if not node.is_dir:
            return [(path, node)]
        out: list[tuple[str, Node]] = []
        for child in node.children.values():
            out.extend(self._files(child, path))
        return out
`,
};
