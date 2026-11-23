import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Implement the path resolution behind a shell's \`cd\`:

\`\`\`python
def cd(cwd: str, target: str, symlinks: dict[str, str] | None = None) -> str | None
\`\`\`

\`cwd\` is an absolute, normalized path. Return the absolute, normalized directory you end up in (no trailing slash except for \`/\`).`,
  starter: String.raw`def cd(cwd: str, target: str, symlinks: dict[str, str] | None = None) -> str | None:
    # TODO
    return cwd
`,
  parts: [
    {
      tests: [
        {
          name: 'relative and absolute',
          code: String.raw`assert_equal(cd('/home/user', 'docs'), '/home/user/docs')
assert_equal(cd('/home/user', '/etc'), '/etc')`,
        },
        {
          name: 'dot and dot-dot',
          code: String.raw`assert_equal(cd('/a/b/c', '../../x/./y'), '/a/x/y')
assert_equal(cd('/a', '.'), '/a')
assert_equal(cd('/a/b', '..'), '/a')`,
        },
        {
          name: 'dot-dot past root',
          code: String.raw`assert_equal(cd('/', '..'), '/')
assert_equal(cd('/a', '../../../b'), '/b')`,
        },
        {
          name: 'messy slashes',
          code: String.raw`assert_equal(cd('/a', 'b//c///'), '/a/b/c')
assert_equal(cd('/a', '///'), '/')
assert_equal(cd('/', ''), '/')`,
        },
      ],
    },
    {
      prompt: `\`symlinks\` maps an absolute path to an absolute target. Resolve one component at a time, like a real filesystem: after stepping into a component, if the path so far is a symlink, replace it with its (normalized) target and keep resolving. \`..\` applies to the resolved path. If following links loops forever, return \`None\`.`,
      tests: [
        {
          name: 'link in the middle of a path',
          code: String.raw`assert_equal(cd('/', 'foo/bar', {'/foo': '/real'}), '/real/bar')`,
        },
        {
          name: 'link to a link',
          code: String.raw`assert_equal(cd('/', 'a', {'/a': '/b', '/b': '/c/d'}), '/c/d')`,
        },
        {
          name: 'dot-dot after following a link',
          code: String.raw`assert_equal(cd('/', 'lnk/..', {'/lnk': '/x/y'}), '/x')`,
        },
        {
          name: 'cwd-relative into a link',
          code: String.raw`assert_equal(cd('/home', 'proj/src', {'/home/proj': '/srv/proj'}), '/srv/proj/src')`,
        },
        {
          name: 'loops return null',
          code: String.raw`assert_equal(cd('/', 'a', {'/a': '/b', '/b': '/a'}), None)
assert_equal(cd('/', 'self/x', {'/self': '/self'}), None)`,
        },
        {
          name: 'link target containing another link',
          code: String.raw`assert_equal(cd('/', 'p', {'/p': '/q/r', '/q': '/z'}), '/z/r')`,
        },
      ],
    },
  ],
  solution: String.raw`MAX_HOPS = 64


def cd(cwd: str, target: str, symlinks: dict[str, str] | None = None) -> str | None:
    start = [] if target.startswith('/') else [p for p in cwd.split('/') if p]
    return _walk(start, target, symlinks or {}, 0)


def _walk(stack: list[str], path: str, links: dict[str, str], hops: int) -> str | None:
    parts = list(stack)
    for p in path.split('/'):
        if p in ('', '.'):
            continue
        if p == '..':
            if parts:
                parts.pop()
            continue
        parts.append(p)
        link = links.get('/' + '/'.join(parts))
        if link is not None:
            if hops >= MAX_HOPS:
                return None
            resolved = _walk([], link, links, hops + 1)
            if resolved is None:
                return None
            parts = [x for x in resolved.split('/') if x]
    return '/' + '/'.join(parts)
`,
};
