import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Simulate a heap of \`size\` bytes, addresses \`0 .. size-1\`.

\`\`\`python
class Allocator:
    def __init__(self, size: int) -> None: ...
    def malloc(self, n: int) -> int | None: ...   # address of the block, or None if no room
    def free(self, address: int) -> None: ...
\`\`\`

Use **first fit**: return the lowest address where \`n\` contiguous free bytes start.`,
  starter: String.raw`class Allocator:
    def __init__(self, size: int) -> None:
        self.size = size

    def malloc(self, n: int) -> int | None:
        # TODO
        return None

    def free(self, address: int) -> None:
        # TODO
        pass
`,
  parts: [
    {
      prompt: '`malloc(0)` or a negative size returns `None`.',
      tests: [
        {
          name: 'sequential allocations',
          code: String.raw`a = Allocator(100)
assert_equal(a.malloc(10), 0)
assert_equal(a.malloc(20), 10)
assert_equal(a.malloc(70), 30)
assert_equal(a.malloc(1), None, 'heap is full')`,
        },
        {
          name: 'reuse a freed hole',
          code: String.raw`a = Allocator(100)
x = a.malloc(10)
y = a.malloc(10)
a.malloc(10)
a.free(y)
assert_equal(a.malloc(5), 10, 'first fit picks the hole at 10')
assert_equal(a.malloc(5), 15)
assert_equal(x, 0)`,
        },
        {
          name: 'invalid sizes',
          code: String.raw`a = Allocator(10)
assert_equal(a.malloc(0), None)
assert_equal(a.malloc(-1), None)
assert_equal(a.malloc(11), None)`,
        },
      ],
    },
    {
      prompt:
        'Adjacent free blocks must merge, so freeing everything lets you allocate the whole heap again. `free` of an address that is not the start of a live block raises an exception (this catches double frees).',
      tests: [
        {
          name: 'neighbours merge',
          code: String.raw`a = Allocator(30)
x = a.malloc(10)
y = a.malloc(10)
z = a.malloc(10)
a.free(x)
a.free(z)
a.free(y)
assert_equal(a.malloc(30), 0)`,
        },
        {
          name: 'fragmentation without merge would fail',
          code: String.raw`a = Allocator(40)
blocks = [a.malloc(10), a.malloc(10), a.malloc(10), a.malloc(10)]
a.free(blocks[1])
a.free(blocks[2])
assert_equal(a.malloc(20), 10)`,
        },
        {
          name: 'bad frees throw',
          code: String.raw`a = Allocator(20)
x = a.malloc(10)
a.free(x)
assert_raises(lambda: a.free(x), 'double free')
y = a.malloc(10)
assert_raises(lambda: a.free(y + 1), 'middle of a block')
assert_raises(lambda: a.free(15), 'never allocated')`,
        },
      ],
    },
  ],
  solution: String.raw`from dataclasses import dataclass


@dataclass
class Block:
    start: int
    size: int
    free: bool


class Allocator:
    def __init__(self, size: int) -> None:
        self.blocks: list[Block] = [Block(0, size, True)]

    def malloc(self, n: int) -> int | None:
        if n <= 0:
            return None
        for i, b in enumerate(self.blocks):
            if not b.free or b.size < n:
                continue
            if b.size > n:
                self.blocks.insert(i + 1, Block(b.start + n, b.size - n, True))
            b.size = n
            b.free = False
            return b.start
        return None

    def free(self, address: int) -> None:
        i = next((i for i, b in enumerate(self.blocks) if b.start == address and not b.free), -1)
        if i == -1:
            raise ValueError('invalid free at ' + str(address))
        block = self.blocks[i]
        block.free = True
        if i + 1 < len(self.blocks) and self.blocks[i + 1].free:
            block.size += self.blocks[i + 1].size
            del self.blocks[i + 1]
        if i > 0 and self.blocks[i - 1].free:
            self.blocks[i - 1].size += block.size
            del self.blocks[i]
`,
};
