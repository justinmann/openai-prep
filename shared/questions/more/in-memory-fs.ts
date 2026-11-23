import type { CodingQuestion } from '../types';

export const question: CodingQuestion = {
  kind: 'coding',
  id: 'in-memory-fs',
  title: 'In-Memory File System',
  difficulty: 'medium',
  tags: ['design', 'trees', 'recursion'],
  summary:
    'A path-based in-memory file system, then capacity, rm/du/find, and finally owners, quotas and mv.',
  companies: ['airbnb', 'uber', 'microsoft'],
  sources: [
    'https://www.1point3acres.com/interview/guides/airbnb-interview-trend-2026q4',
    'https://leetcode.com/discuss/post/7300207/uber-software-engineer-ii-se-2-bangalore-wyl8/',
    'https://leetcode.com/problems/design-in-memory-file-system/',
  ],
  prompt: `Build a small file system that lives entirely in memory.

\`\`\`ts
class FileSystem {
  mkdir(path: string): void
  writeFile(path: string, content: string): void
  appendFile(path: string, content: string): void
  readFile(path: string): string
  ls(path: string): string[]
}
\`\`\`

- Paths are absolute and normalized: \`'/'\` is the root, otherwise \`'/a/b/c'\` (no trailing slash, no \`.\` or \`..\`).
- \`mkdir\` creates every missing directory along the path; an existing directory is fine.
- \`writeFile\` creates the file or **overwrites** it; \`appendFile\` creates it or adds to the end. The parent directory must already exist.
- \`ls\` on a directory returns its child names sorted; on a file it returns \`[name]\`.
- Errors **throw**: a missing path, a missing parent, or a file where a directory is needed (or the reverse).

Example: \`mkdir('/a/b')\`, \`writeFile('/a/b/x.txt', 'hi')\`, then \`ls('/a')\` is \`['b']\` and \`readFile('/a/b/x.txt')\` is \`'hi'\`.`,
  starter: `class FileSystem {
  mkdir(path: string): void {
    // TODO
  }

  writeFile(path: string, content: string): void {
    // TODO
  }

  appendFile(path: string, content: string): void {
    // TODO
  }

  readFile(path: string): string {
    // TODO
    return '';
  }

  ls(path: string): string[] {
    // TODO
    return [];
  }
}
`,
  parts: [
    {
      title: 'Part 1: Directories and files',
      prompt:
        'Start with an empty root directory. `new FileSystem()` takes no arguments for now.',
      tests: [
        {
          name: 'write and read back',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/docs');
fs.writeFile('/docs/a.txt', 'hello');
assertEqual(fs.readFile('/docs/a.txt'), 'hello');
fs.writeFile('/docs/a.txt', 'bye');
assertEqual(fs.readFile('/docs/a.txt'), 'bye', 'overwrite');`,
        },
        {
          name: 'appendFile creates then appends',
          code: String.raw`const fs = new FileSystem();
fs.appendFile('/log', 'a');
fs.appendFile('/log', 'bc');
assertEqual(fs.readFile('/log'), 'abc');
fs.writeFile('/empty', '');
assertEqual(fs.readFile('/empty'), '', 'empty files exist');`,
        },
        {
          name: 'mkdir creates parents and is idempotent',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/a/b/c');
fs.mkdir('/a/b');
fs.mkdir('/');
assertEqual(fs.ls('/'), ['a']);
assertEqual(fs.ls('/a'), ['b']);
assertEqual(fs.ls('/a/b/c'), []);`,
        },
        {
          name: 'ls sorts names and handles files',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/d');
fs.writeFile('/d/zeta', '1');
fs.mkdir('/d/alpha');
fs.writeFile('/d/Mid', '2');
assertEqual(fs.ls('/d'), ['Mid', 'alpha', 'zeta']);
assertEqual(fs.ls('/d/zeta'), ['zeta']);`,
        },
        {
          name: 'missing paths throw',
          code: String.raw`const fs = new FileSystem();
assertThrows(() => fs.readFile('/nope'), 'read missing');
assertThrows(() => fs.ls('/nope'), 'ls missing');
assertThrows(() => fs.writeFile('/no/parent.txt', 'x'), 'parent must exist');
assertThrows(() => fs.appendFile('/no/parent.txt', 'x'), 'append parent must exist');
assertEqual(fs.ls('/'), [], 'failed writes create nothing');`,
        },
        {
          name: 'file vs directory conflicts throw',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/d');
fs.writeFile('/f', 'x');
assertThrows(() => fs.readFile('/d'), 'read a directory');
assertThrows(() => fs.writeFile('/d', 'x'), 'write over a directory');
assertThrows(() => fs.mkdir('/f'), 'mkdir over a file');
assertThrows(() => fs.mkdir('/f/sub'), 'mkdir through a file');
assertThrows(() => fs.writeFile('/f/x', 'y'), 'file as parent');
assertThrows(() => fs.writeFile('/', 'x'), 'root is a directory');
assertEqual(fs.readFile('/f'), 'x');`,
        },
      ],
    },
    {
      title: 'Part 2: Capacity, rm, du and find',
      prompt: `The disk now has a size. A file's size is \`content.length\`; directories are free.

\`\`\`ts
constructor(options?: { capacity?: number })   // bytes; no capacity means unlimited
rm(path: string): void                          // recursive for directories
du(path: string): number                        // total bytes of all files at or under path
find(path: string, filter?: { nameContains?: string; minSize?: number; maxSize?: number }): string[]
\`\`\`

- A write or append that would push the total over \`capacity\` throws and **changes nothing**. Overwriting frees the old content first.
- \`rm\` frees space; removing \`'/'\` or a missing path throws.
- \`find\` returns the full paths of **files** at or under \`path\` that match every given filter (size bounds inclusive), sorted. A missing path throws.`,
      tests: [
        {
          name: 'capacity limits writes',
          code: String.raw`const fs = new FileSystem({ capacity: 10 });
fs.writeFile('/a', '123456');
assertThrows(() => fs.writeFile('/b', '12345'), 'over capacity');
assertThrows(() => fs.readFile('/b'), 'rejected write created nothing');
fs.writeFile('/b', '1234');
assertEqual(fs.du('/'), 10, 'exactly full is fine');`,
        },
        {
          name: 'overwrite and append count correctly',
          code: String.raw`const fs = new FileSystem({ capacity: 10 });
fs.writeFile('/a', '12345678');
fs.writeFile('/a', '1234567890');
assertEqual(fs.du('/a'), 10, 'overwrite frees old bytes first');
assertThrows(() => fs.appendFile('/a', 'x'), 'append over capacity');
assertEqual(fs.readFile('/a'), '1234567890', 'failed append changed nothing');`,
        },
        {
          name: 'rm is recursive and frees space',
          code: String.raw`const fs = new FileSystem({ capacity: 6 });
fs.mkdir('/a/b');
fs.writeFile('/a/b/x', '123');
fs.writeFile('/a/y', '456');
fs.rm('/a');
assertEqual(fs.ls('/'), []);
assertThrows(() => fs.readFile('/a/b/x'));
fs.writeFile('/z', '123456');
assertEqual(fs.du('/'), 6);`,
        },
        {
          name: 'rm errors',
          code: String.raw`const fs = new FileSystem();
fs.writeFile('/f', 'x');
assertThrows(() => fs.rm('/missing'), 'missing');
assertThrows(() => fs.rm('/'), 'root');
fs.rm('/f');
assertThrows(() => fs.rm('/f'), 'already removed');`,
        },
        {
          name: 'du sums a subtree',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/a/b');
fs.mkdir('/c');
fs.writeFile('/a/one', '1');
fs.writeFile('/a/b/two', '22');
fs.writeFile('/c/three', '333');
assertEqual(fs.du('/'), 6);
assertEqual(fs.du('/a'), 3);
assertEqual(fs.du('/a/b/two'), 2);
assertEqual(fs.du('/c'), 3);
assertThrows(() => fs.du('/nope'));`,
        },
        {
          name: 'find with filters',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/src/lib');
fs.writeFile('/src/main.ts', '12345');
fs.writeFile('/src/lib/util.ts', '12');
fs.writeFile('/src/lib/readme.md', '1234567890');
fs.writeFile('/top.ts', '1');
assertEqual(fs.find('/src'), ['/src/lib/readme.md', '/src/lib/util.ts', '/src/main.ts']);
assertEqual(fs.find('/', { nameContains: '.ts' }), ['/src/lib/util.ts', '/src/main.ts', '/top.ts']);
assertEqual(fs.find('/', { minSize: 2, maxSize: 5 }), ['/src/lib/util.ts', '/src/main.ts']);
assertEqual(fs.find('/src/main.ts', { nameContains: 'main' }), ['/src/main.ts'], 'a file path');
assertEqual(fs.find('/src', { nameContains: 'lib' }), [], 'directories are not results');
assertThrows(() => fs.find('/nope'));`,
        },
      ],
    },
    {
      title: 'Part 3: Owners, quotas and mv',
      prompt: `Add users. Every mutating call takes an optional last argument \`user\` (default \`'root'\`); reads stay open to everyone.

\`\`\`ts
constructor(options?: { capacity?: number; quotas?: Record<string, number> })
mkdir(path, user?) / writeFile(path, content, user?) / appendFile(path, content, user?) / rm(path, user?)
mv(src: string, dst: string, user?: string): void
owner(path: string): string     // who owns this file or directory
usage(user: string): number     // bytes in files owned by user
\`\`\`

- Anything a call creates (including parents made by \`mkdir\`) is owned by the caller. The root directory is owned by \`'root'\`. Anyone may create new entries anywhere.
- Only a file's owner may overwrite or append to it. Only the owner may \`rm\` a file; \`rm\` of a directory needs the caller to own it **and** everything inside it. \`'root'\` may do all of these.
- A user with a quota cannot own more than that many bytes; the quota is checked **in addition to** total capacity, and the bytes count against the file's owner. A failing call throws and changes nothing.
- \`mv\` moves a file or directory tree with the same permission rule as \`rm\`. Ownership (and so usage) is preserved. It throws without changing anything if \`src\` is missing or \`'/'\`, \`dst\` already exists, the parent of \`dst\` is missing, or \`dst\` is inside \`src\`.`,
      tests: [
        {
          name: 'creator owns new entries',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/home/alice', 'alice');
fs.writeFile('/home/alice/notes', 'hi', 'alice');
fs.writeFile('/sys', 'x');
assertEqual(fs.owner('/home'), 'alice', 'parents too');
assertEqual(fs.owner('/home/alice/notes'), 'alice');
assertEqual(fs.owner('/sys'), 'root');
assertEqual(fs.owner('/'), 'root');`,
        },
        {
          name: 'only the owner or root can write',
          code: String.raw`const fs = new FileSystem();
fs.writeFile('/a', 'mine', 'alice');
assertThrows(() => fs.writeFile('/a', 'yours', 'bob'), 'overwrite');
assertThrows(() => fs.appendFile('/a', '!', 'bob'), 'append');
assertEqual(fs.readFile('/a'), 'mine', 'anyone can read');
fs.appendFile('/a', '!', 'alice');
fs.writeFile('/a', 'fixed', 'root');
assertEqual(fs.readFile('/a'), 'fixed');
assertEqual(fs.owner('/a'), 'alice', 'root writing keeps the owner');`,
        },
        {
          name: 'rm permissions',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/shared', 'alice');
fs.writeFile('/shared/a', '1', 'alice');
fs.writeFile('/shared/b', '2', 'bob');
assertThrows(() => fs.rm('/shared/a', 'bob'), 'not your file');
assertThrows(() => fs.rm('/shared', 'alice'), 'dir holds a file alice does not own');
assertEqual(fs.ls('/shared'), ['a', 'b'], 'failed rm removed nothing');
fs.rm('/shared/b', 'bob');
fs.rm('/shared', 'alice');
fs.mkdir('/x/y', 'carol');
fs.rm('/x', 'root');
assertEqual(fs.ls('/'), []);`,
        },
        {
          name: 'per-user quotas',
          code: String.raw`const fs = new FileSystem({ quotas: { alice: 5 } });
fs.writeFile('/a1', '123', 'alice');
assertThrows(() => fs.writeFile('/a2', '123', 'alice'), 'alice over quota');
fs.writeFile('/a2', '12', 'alice');
assertEqual(fs.usage('alice'), 5);
fs.writeFile('/b', '1234567890', 'bob');
assertEqual(fs.usage('bob'), 10, 'no quota means unlimited');
assertThrows(() => fs.appendFile('/a1', 'x', 'root'), 'bytes count against the owner');
fs.rm('/a1', 'alice');
assertEqual(fs.usage('alice'), 2);
assertEqual(fs.usage('nobody'), 0);`,
        },
        {
          name: 'quota and capacity both apply',
          code: String.raw`const fs = new FileSystem({ capacity: 8, quotas: { alice: 6 } });
fs.writeFile('/b', '12345', 'bob');
assertThrows(() => fs.writeFile('/a', '1234', 'alice'), 'within quota but over capacity');
assertEqual(fs.usage('alice'), 0);
assertThrows(() => fs.ls('/a'), 'nothing created');
fs.writeFile('/a', '123', 'alice');
assertEqual(fs.du('/'), 8);`,
        },
        {
          name: 'mv moves trees and keeps owners',
          code: String.raw`const fs = new FileSystem({ quotas: { alice: 4 } });
fs.mkdir('/src/deep', 'alice');
fs.writeFile('/src/deep/f', '1234', 'alice');
fs.mkdir('/dst', 'bob');
fs.mv('/src', '/dst/moved', 'alice');
assertEqual(fs.ls('/'), ['dst']);
assertEqual(fs.readFile('/dst/moved/deep/f'), '1234');
assertEqual(fs.owner('/dst/moved/deep/f'), 'alice');
assertEqual(fs.owner('/dst/moved'), 'alice');
assertEqual(fs.usage('alice'), 4);
fs.mv('/dst/moved/deep/f', '/g', 'alice');
assertEqual(fs.ls('/dst/moved/deep'), []);
assertEqual(fs.readFile('/g'), '1234');`,
        },
        {
          name: 'mv fails cleanly',
          code: String.raw`const fs = new FileSystem();
fs.mkdir('/a/b', 'alice');
fs.writeFile('/a/f', 'x', 'alice');
fs.writeFile('/taken', 'y', 'bob');
assertThrows(() => fs.mv('/a/f', '/taken', 'alice'), 'dst exists');
assertThrows(() => fs.mv('/a/f', '/no/where', 'alice'), 'dst parent missing');
assertThrows(() => fs.mv('/a', '/a/b/inside', 'alice'), 'into itself');
assertThrows(() => fs.mv('/missing', '/m', 'alice'), 'src missing');
assertThrows(() => fs.mv('/', '/r'), 'root');
assertThrows(() => fs.mv('/taken', '/mine', 'alice'), 'not the owner');
assertEqual(fs.readFile('/a/f'), 'x');
assertEqual(fs.readFile('/taken'), 'y');
assertEqual(fs.ls('/'), ['a', 'taken']);
assertEqual(fs.ls('/a'), ['b', 'f']);`,
        },
      ],
    },
  ],
  solution: String.raw`type Dir = { kind: 'dir'; name: string; owner: string; children: Map<string, Entry> };
type File = { kind: 'file'; name: string; owner: string; content: string };
type Entry = Dir | File;
type Filter = { nameContains?: string; minSize?: number; maxSize?: number };

class FileSystem {
  private root: Dir = { kind: 'dir', name: '', owner: 'root', children: new Map() };
  private capacity: number;
  private quotas: Record<string, number>;
  private used = 0;
  private usedBy = new Map<string, number>();

  constructor(options: { capacity?: number; quotas?: Record<string, number> } = {}) {
    this.capacity = options.capacity ?? Infinity;
    this.quotas = options.quotas ?? {};
  }

  mkdir(path: string, user = 'root'): void {
    let dir = this.root;
    for (const part of this.parts(path)) {
      const next = dir.children.get(part);
      if (!next) {
        const created: Dir = { kind: 'dir', name: part, owner: user, children: new Map() };
        dir.children.set(part, created);
        dir = created;
      } else if (next.kind === 'file') {
        throw new Error('not a directory: ' + path);
      } else {
        dir = next;
      }
    }
  }

  writeFile(path: string, content: string, user = 'root'): void {
    this.put(path, content, user, false);
  }

  appendFile(path: string, content: string, user = 'root'): void {
    this.put(path, content, user, true);
  }

  readFile(path: string): string {
    const node = this.get(path);
    if (node.kind !== 'file') throw new Error('is a directory: ' + path);
    return node.content;
  }

  ls(path: string): string[] {
    const node = this.get(path);
    return node.kind === 'file' ? [node.name] : [...node.children.keys()].sort();
  }

  rm(path: string, user = 'root'): void {
    const { dir, name } = this.parentOf(path);
    const node = dir.children.get(name);
    if (!node) throw new Error('no such path: ' + path);
    this.checkTree(node, user);
    for (const f of this.files(node, '')) this.charge(f.file.owner, -f.file.content.length);
    dir.children.delete(name);
  }

  du(path: string): number {
    return this.files(this.get(path), '').reduce((sum, f) => sum + f.file.content.length, 0);
  }

  find(path: string, filter: Filter = {}): string[] {
    const node = this.get(path);
    const base = path === '/' ? '' : path.slice(0, path.length - node.name.length - 1);
    return this.files(node, base)
      .filter(({ file }) => {
        const size = file.content.length;
        if (filter.nameContains !== undefined && !file.name.includes(filter.nameContains)) return false;
        if (filter.minSize !== undefined && size < filter.minSize) return false;
        if (filter.maxSize !== undefined && size > filter.maxSize) return false;
        return true;
      })
      .map((f) => f.path)
      .sort();
  }

  mv(src: string, dst: string, user = 'root'): void {
    const from = this.parentOf(src);
    const node = from.dir.children.get(from.name);
    if (!node) throw new Error('no such path: ' + src);
    this.checkTree(node, user);
    if (dst === src || dst.startsWith(src + '/')) throw new Error('cannot move into itself');
    const to = this.parentOf(dst);
    if (to.dir.children.has(to.name)) throw new Error('already exists: ' + dst);
    from.dir.children.delete(from.name);
    node.name = to.name;
    to.dir.children.set(to.name, node);
  }

  owner(path: string): string {
    return this.get(path).owner;
  }

  usage(user: string): number {
    return this.usedBy.get(user) ?? 0;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private parts(path: string): string[] {
    if (!path.startsWith('/')) throw new Error('path must be absolute: ' + path);
    return path.split('/').filter((p) => p !== '');
  }

  private get(path: string): Entry {
    let node: Entry = this.root;
    for (const part of this.parts(path)) {
      const next: Entry | undefined = node.kind === 'dir' ? node.children.get(part) : undefined;
      if (!next) throw new Error('no such path: ' + path);
      node = next;
    }
    return node;
  }

  // The existing parent directory of path, and the last path component.
  private parentOf(path: string): { dir: Dir; name: string } {
    const parts = this.parts(path);
    const name = parts.pop();
    if (name === undefined) throw new Error('not allowed on the root');
    const parent = this.get('/' + parts.join('/'));
    if (parent.kind !== 'dir') throw new Error('not a directory: ' + path);
    return { dir: parent, name };
  }

  private put(path: string, content: string, user: string, append: boolean): void {
    const { dir, name } = this.parentOf(path);
    const existing = dir.children.get(name);
    if (existing && existing.kind === 'dir') throw new Error('is a directory: ' + path);
    if (existing && user !== 'root' && existing.owner !== user) throw new Error('permission denied: ' + path);
    const owner = existing ? existing.owner : user;
    const next = append && existing ? existing.content + content : content;
    this.charge(owner, next.length - (existing ? existing.content.length : 0));
    if (existing) existing.content = next;
    else dir.children.set(name, { kind: 'file', name, owner, content: next });
  }

  // Validates before mutating, so a rejected write changes nothing.
  private charge(owner: string, delta: number): void {
    const mine = this.usedBy.get(owner) ?? 0;
    if (delta > 0) {
      if (this.used + delta > this.capacity) throw new Error('disk full');
      const quota = this.quotas[owner];
      if (quota !== undefined && mine + delta > quota) throw new Error('quota exceeded for ' + owner);
    }
    this.used += delta;
    this.usedBy.set(owner, mine + delta);
  }

  private checkTree(node: Entry, user: string): void {
    if (user === 'root') return;
    if (node.owner !== user) throw new Error('permission denied');
    if (node.kind === 'dir') for (const child of node.children.values()) this.checkTree(child, user);
  }

  private files(node: Entry, prefix: string): { path: string; file: File }[] {
    const path = node === this.root ? '' : prefix + '/' + node.name;
    if (node.kind === 'file') return [{ path, file: node }];
    return [...node.children.values()].flatMap((child) => this.files(child, path));
  }
}
`,
};
