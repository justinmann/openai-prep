import { pyodidePackages, pythonStdlib } from './pythonModules';
import type { LanguageGuide } from './types';

// Python language guide: the features and idioms you can rely on in a coding
// interview, plus the traps. Every snippet without `run: false` is executed in
// Pyodide by tests/unit/guide.test.ts, as the body of an async function.

export const pythonGuide: LanguageGuide = {
  language: 'python',
  tabs: [
    {
      id: 'basics',
      label: 'Basics',
      intro:
        'Core syntax you will use in every answer. Type hints are documentation only: nothing checks them at runtime.',
      entries: [
        {
          title: 'Variables and type hints',
          code: String.raw`count: int = 0
name: str = "ada"
scores: list[int] = [3, 1, 2]
lookup: dict[str, int | None] = {"a": 1, "b": None}
count = "oops"          # allowed: hints are never enforced
type(count).__name__    # → 'str'`,
          note: 'Use built-in generics (list[int], dict[str, int]) and X | None; no typing import needed in 3.10+.',
        },
        {
          title: 'int, float, bool, None',
          code: String.raw`x = 7
y = 2.5
ok = True
nothing = None
isinstance(True, int)   # → True (bool is a subclass of int)
True + True             # → 2
nothing is None         # → True
0.1 + 0.2 == 0.3        # → False
abs(0.1 + 0.2 - 0.3) < 1e-9  # → True`,
          note: 'Compare to None with "is". Never compare floats with == when the result came from arithmetic.',
        },
        {
          title: 'Integer division and modulo',
          code: String.raw`7 // 2        # → 3
7 / 2         # → 3.5 (always a float)
7 % 2         # → 1
-7 // 2       # → -4 (floors toward negative infinity)
-7 % 3        # → 2 (result has the sign of the divisor)
int(-7 / 2)   # → -3 (truncate toward zero, like C or JS)
divmod(17, 5) # → (3, 2)`,
          note: 'Python floors, so negative numbers differ from C/Java/JS. Negative modulo is handy for wrapping indexes: (i - 1) % n.',
        },
        {
          title: 'Big ints and infinity',
          code: String.raw`2 ** 100        # → 1267650600228229401496703205376
big = 10 ** 30 + 1
big % 7         # → 2
best = float("inf")
best = min(best, 42)
best            # → 42
-float("inf") < -10**100  # → True
import math
math.inf == float("inf")  # → True`,
          note: 'Ints never overflow, so no long/BigInt dance. float("inf") (or math.inf) is the usual starting value for a min.',
        },
        {
          title: 'f-strings',
          code: String.raw`name, n, ratio = "gpu", 3, 0.4567
f"{name} x{n}"        # → 'gpu x3'
f"{ratio:.2f}"        # → '0.46'
f"{n:03d}"            # → '003'
f"{name!r}"           # → "'gpu'"
f"{n=}"               # → 'n=3'
f"{{literal}}"        # → '{literal}'`,
          note: 'Prefix the string with f and put expressions in braces. Double the braces to print a literal brace.',
        },
        {
          title: 'Conditional expression and truthiness',
          code: String.raw`n = 5
parity = "even" if n % 2 == 0 else "odd"
parity               # → 'odd'
[bool(v) for v in (0, "", [], {}, None, 0.0)]  # → [False, False, False, False, False, False]
bool([0])            # → True
items = []
first = items[0] if items else None
first                # → None`,
          note: 'Empty containers, 0 and None are falsy. Use "if x is None" when 0 or "" are valid values.',
        },
        {
          title: 'Walrus operator :=',
          code: String.raw`data = [1, 5, 9, 2]
if (n := len(data)) > 3:
    msg = f"{n} items"
msg                  # → '4 items'
stack = [1, 2, 3]
total = 0
while (top := stack.pop() if stack else None) is not None:
    total += top
total                # → 6`,
          note: 'Assigns and returns a value inside an expression. Wrap it in parentheses; it is handy in while loops and comprehensions.',
        },
        {
          title: 'Unpacking and starred unpacking',
          code: String.raw`a, b = 1, 2
a, b = b, a          # swap
(a, b)               # → (2, 1)
first, *rest = [10, 20, 30]
rest                 # → [20, 30]
*init, last = "abc"
(init, last)         # → (['a', 'b'], 'c')
(x, y), z = (1, 2), 3
x + y + z            # → 6`,
          note: 'Starred targets always collect into a list, even from a string or tuple.',
        },
        {
          title: 'Functions: defaults, *args, **kwargs, keyword-only',
          code: String.raw`def f(a, b=2, *args, key=None, **kwargs):
    return (a, b, args, key, kwargs)

f(1)                       # → (1, 2, (), None, {})
f(1, 3, 4, 5, key="k", x=9) # → (1, 3, (4, 5), 'k', {'x': 9})

def put(key, value, *, ttl=None):  # ttl must be passed by name
    return (key, value, ttl)
put("a", 1, ttl=5)         # → ('a', 1, 5)
args = [1, 2]
f(*args, **{"key": "z"})   # → (1, 2, (), 'z', {})`,
          note: 'A bare * makes the following parameters keyword-only, which keeps call sites readable. Never use a mutable default (see Gotchas).',
        },
        {
          title: 'lambda',
          code: String.raw`square = lambda x: x * x
square(4)                  # → 16
pairs = [("b", 2), ("a", 2), ("c", 1)]
sorted(pairs, key=lambda p: (p[1], p[0]))  # → [('c', 1), ('a', 2), ('b', 2)]
max(["aa", "b", "ccc"], key=len)           # → 'ccc'`,
          note: 'A single expression, mostly used as a key= function. Use def for anything with statements.',
        },
      ],
    },
    {
      id: 'loops',
      label: 'Loops',
      intro:
        'Python loops iterate over things; reach for enumerate and zip instead of index arithmetic.',
      entries: [
        {
          title: 'range: start, stop, step, reversed',
          code: String.raw`list(range(5))          # → [0, 1, 2, 3, 4]
list(range(2, 8, 2))    # → [2, 4, 6]
list(range(5, 0, -1))   # → [5, 4, 3, 2, 1]
list(reversed(range(3)))  # → [2, 1, 0]
for i in range(len("abc") - 1, -1, -1):
    pass
i                       # → 0`,
          note: 'stop is exclusive. To count down to 0 inclusive, the stop is -1. reversed(range(n)) is easier to read.',
        },
        {
          title: 'enumerate and zip',
          code: String.raw`names = ["a", "b", "c"]
[(i, n) for i, n in enumerate(names)]     # → [(0, 'a'), (1, 'b'), (2, 'c')]
[i for i, _ in enumerate(names, start=1)] # → [1, 2, 3]
ages = [30, 40]
list(zip(names, ages))   # → [('a', 30), ('b', 40)] (stops at the shortest)
try:
    list(zip(names, ages, strict=True))
except ValueError:
    print("lengths differ")  # prints: lengths differ`,
          note: 'zip silently truncates. Pass strict=True when unequal lengths would be a bug.',
        },
        {
          title: 'Iterating a dict',
          code: String.raw`stock = {"apple": 3, "pear": 0, "fig": 5}
list(stock)              # → ['apple', 'pear', 'fig'] (keys)
sum(stock.values())      # → 8
[k for k, v in stock.items() if v > 0]  # → ['apple', 'fig']
for key in list(stock):  # copy the keys if you will delete
    if stock[key] == 0:
        del stock[key]
stock                    # → {'apple': 3, 'fig': 5}`,
          note: 'Iteration follows insertion order. Deleting while iterating the dict itself raises RuntimeError, so iterate over list(d).',
        },
        {
          title: 'while, break, continue',
          code: String.raw`n, steps = 27, 0
while n != 1:
    n = n // 2 if n % 2 == 0 else 3 * n + 1
    steps += 1
steps                    # → 111
odds = []
for x in range(10):
    if x % 2 == 0:
        continue
    if x > 7:
        break
    odds.append(x)
odds                     # → [1, 3, 5, 7]`,
        },
        {
          title: 'for/else',
          code: String.raw`def find_index(items, target):
    for i, v in enumerate(items):
        if v == target:
            break
    else:
        return -1        # runs only if the loop did not break
    return i

find_index([4, 5, 6], 5)  # → 1
find_index([4, 5, 6], 9)  # → -1`,
          note: 'The else runs when the loop finishes without break. Many interviewers find it surprising, so a comment helps.',
        },
        {
          title: 'Breaking out of nested loops',
          code: String.raw`grid = [[1, 2], [3, 4], [5, 6]]

def find(grid, target):
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if v == target:
                return (r, c)   # return exits both loops
    return None

find(grid, 4)            # → (1, 1)
found = False
for row in grid:
    for v in row:
        if v == 3:
            found = True
            break
    if found:
        break`,
          note: 'Python has no labeled break. Move the loops into a function and return, or use a flag.',
        },
        {
          title: 'Comprehensions',
          code: String.raw`squares = [x * x for x in range(5)]       # → [0, 1, 4, 9, 16]
evens = [x for x in range(10) if x % 2 == 0]  # → [0, 2, 4, 6, 8]
index = {c: i for i, c in enumerate("abc")}  # → {'a': 0, 'b': 1, 'c': 2}
lengths = {len(w) for w in ["hi", "yo", "hey"]}  # → {2, 3}
flat = [x for row in [[1, 2], [3]] for x in row]  # → [1, 2, 3]
labels = ["big" if x > 2 else "small" for x in [1, 3]]  # → ['small', 'big']`,
          note: 'Nested for clauses read left to right like nested loops. A filter if goes at the end; an if/else expression goes at the front.',
        },
        {
          title: 'Generator expressions',
          code: String.raw`total = sum(x * x for x in range(4))   # → 14
any(c.isdigit() for c in "ab3")       # → True
all(x > 0 for x in [])                # → True (vacuously)
gen = (x for x in range(3))
list(gen)                             # → [0, 1, 2]
list(gen)                             # → [] (already consumed)`,
          note: 'Lazy and memory-free, perfect inside sum/any/all/max. A generator can be consumed only once.',
        },
        {
          title: 'Two pointers',
          code: String.raw`def pair_sum(sorted_nums, target):
    lo, hi = 0, len(sorted_nums) - 1
    while lo < hi:
        s = sorted_nums[lo] + sorted_nums[hi]
        if s == target:
            return (lo, hi)
        if s < target:
            lo += 1
        else:
            hi -= 1
    return None

pair_sum([1, 3, 4, 6, 9], 10)  # → (0, 4)`,
          note: 'Use a while loop when two indexes move independently; for loops cannot do that cleanly.',
        },
      ],
    },
    {
      id: 'collections',
      label: 'Collections',
      intro:
        'list, dict, set and tuple are built in; deque, Counter, defaultdict, heapq and bisect cover almost every other interview need.',
      entries: [
        {
          title: 'List operations and their costs',
          code: String.raw`xs = [1, 2, 3]
xs.append(4)        # O(1)
xs.pop()            # → 4, O(1) from the end
xs.pop(0)           # → 1, O(n): shifts every element
xs.insert(0, 9)     # O(n)
xs.extend([7, 8])
xs                  # → [9, 2, 3, 7, 8]
xs.index(3)         # → 2, O(n) scan
3 in xs             # → True, O(n): use a set for membership
xs.remove(7)        # first occurrence, O(n)
xs                  # → [9, 2, 3, 8]`,
          note: 'A list is a stack, not a queue: pop(0) and insert(0) are linear. Use collections.deque for FIFO.',
        },
        {
          title: 'Slicing',
          code: String.raw`xs = [0, 1, 2, 3, 4, 5]
xs[1:4]          # → [1, 2, 3]
xs[:2]           # → [0, 1]
xs[-2:]          # → [4, 5]
xs[::2]          # → [0, 2, 4]
xs[::-1]         # → [5, 4, 3, 2, 1, 0]
xs[10:]          # → [] (slices never raise)
copy = xs[:]     # shallow copy
xs[1:3] = []     # delete a range in place
xs               # → [0, 3, 4, 5]`,
          note: 'Slices copy, so xs[1:] inside a recursive call is O(n) per call. Pass indexes instead when it matters.',
        },
        {
          title: 'sort vs sorted, key= and reverse=',
          code: String.raw`words = ["pear", "Fig", "apple"]
sorted(words)                    # → ['Fig', 'apple', 'pear'] (uppercase first)
sorted(words, key=str.lower)     # → ['apple', 'Fig', 'pear']
sorted(words, key=len, reverse=True)  # → ['apple', 'pear', 'Fig']
result = words.sort()            # sorts in place and returns None
result                           # → None
words                            # → ['Fig', 'apple', 'pear']`,
          note: 'list.sort() mutates and returns None; sorted() returns a new list and works on any iterable.',
        },
        {
          title: 'Sorting by multiple keys',
          code: String.raw`jobs = [("b", 2, 5.0), ("a", 2, 9.0), ("c", 1, 9.0)]
sorted(jobs, key=lambda j: (j[1], j[0]))    # → [('c', 1, 9.0), ('a', 2, 9.0), ('b', 2, 5.0)]
sorted(jobs, key=lambda j: (-j[2], j[0]))   # → [('a', 2, 9.0), ('c', 1, 9.0), ('b', 2, 5.0)]
by_name = sorted(jobs, key=lambda j: j[0], reverse=True)
sorted(by_name, key=lambda j: j[2])         # → [('b', 2, 5.0), ('c', 1, 9.0), ('a', 2, 9.0)]`,
          note: 'Return a tuple from key=; negate numbers for descending. For descending strings, sort twice (stable sort) from least to most important key.',
        },
        {
          title: '2D lists (the shared-row trap)',
          code: String.raw`bad = [[0] * 3] * 2
bad[0][0] = 1
bad                     # → [[1, 0, 0], [1, 0, 0]] (same row twice)
grid = [[0] * 3 for _ in range(2)]
grid[0][0] = 1
grid                    # → [[1, 0, 0], [0, 0, 0]]
rows, cols = len(grid), len(grid[0])
transposed = [list(col) for col in zip(*grid)]
transposed              # → [[1, 0], [0, 0], [0, 0]]`,
          note: 'Multiplying a list copies references. Build each row in a comprehension.',
        },
        {
          title: 'dict: get, setdefault, order, items',
          code: String.raw`d = {"b": 1}
d["a"] = 2
d.get("zzz")            # → None
d.get("zzz", 0)         # → 0
d.setdefault("lst", []).append(5)
d                       # → {'b': 1, 'a': 2, 'lst': [5]} (insertion order)
d.pop("b")              # → 1
d.pop("missing", None)  # → None
"a" in d                # → True (O(1))
list(d.items())         # → [('a', 2), ('lst', [5])]
merged = d | {"a": 9}   # → {'a': 9, 'lst': [5]}`,
          note: 'd[key] raises KeyError for a missing key; get() does not. Dicts keep insertion order, and re-assigning a key keeps its old position.',
        },
        {
          title: 'Sets',
          code: String.raw`a, b = {1, 2, 3}, {2, 3, 4}
a | b          # → {1, 2, 3, 4}
a & b          # → {2, 3}
a - b          # → {1}
a ^ b          # → {1, 4}
seen = set()   # {} is an empty dict, not a set
seen.add("x")
seen.discard("nope")   # no error, unlike remove()
{1, 2} <= a    # → True (subset)`,
          note: 'O(1) membership. Elements must be hashable: use tuples or frozenset, not lists.',
        },
        {
          title: 'Tuples as dict keys',
          code: String.raw`grid = {}
grid[(0, 1)] = "#"
grid[2, 3] = "."               # parentheses optional
grid.get((0, 1))               # → '#'
visited = {(0, 0), (0, 1)}
(0, 1) in visited              # → True
key = tuple(sorted([3, 1, 2])) # → (1, 2, 3)
try:
    {[1, 2]: "x"}
except TypeError as e:
    str(e)                     # → "unhashable type: 'list'"`,
          note: 'Coordinates and composite keys are tuples. Convert a list with tuple() before using it as a key.',
        },
        {
          title: 'collections.deque (queues)',
          code: String.raw`from collections import deque
q = deque([1, 2])
q.append(3)          # right end
q.appendleft(0)      # left end, O(1)
q.popleft()          # → 0
q.pop()              # → 3
q                    # → deque([1, 2])
recent = deque(maxlen=2)
for x in range(5):
    recent.append(x)
list(recent)         # → [3, 4]`,
          note: 'The BFS queue. maxlen gives a sliding window that drops old items. Indexing the middle is O(n).',
        },
        {
          title: 'Counter and defaultdict',
          code: String.raw`from collections import Counter, defaultdict
c = Counter("banana")
c["a"], c["z"]           # → (3, 0) (missing keys count 0)
c.most_common(2)         # → [('a', 3), ('n', 2)]
Counter("ab") + Counter("b")  # → Counter({'b': 2, 'a': 1})
groups = defaultdict(list)
for word in ["ant", "bee", "asp"]:
    groups[word[0]].append(word)
dict(groups)             # → {'a': ['ant', 'asp'], 'b': ['bee']}
adj = defaultdict(set)
adj[1].add(2)`,
          note: 'defaultdict creates the value on first read, so even a lookup like groups["x"] inserts a key. Use "x in groups" to test.',
        },
        {
          title: 'heapq: min-heap, max-heap, tuples',
          code: String.raw`import heapq
h = []
for x in [5, 1, 4]:
    heapq.heappush(h, x)
heapq.heappop(h)          # → 1 (smallest)
h[0]                      # → 4 (peek)
maxh = [-x for x in [5, 1, 4]]
heapq.heapify(maxh)       # O(n)
-heapq.heappop(maxh)      # → 5
tasks = []
heapq.heappush(tasks, (2, "write"))
heapq.heappush(tasks, (1, "read"))
heapq.heappop(tasks)      # → (1, 'read')
heapq.nsmallest(2, [7, 3, 9, 1])  # → [1, 3]`,
          note: 'Only a min-heap exists: negate for max. When priorities tie, tuples compare the next field, so add a counter (priority, seq, item) if items are not comparable.',
        },
        {
          title: 'bisect: binary search on a sorted list',
          code: String.raw`import bisect
xs = [1, 3, 3, 7]
bisect.bisect_left(xs, 3)    # → 1 (first index >= 3)
bisect.bisect_right(xs, 3)   # → 3 (first index > 3)
bisect.insort(xs, 5)
xs                           # → [1, 3, 3, 5, 7]
times = [10, 20, 30]
i = bisect.bisect_right(times, 25) - 1
times[i]                     # → 20 (latest time <= 25)
bisect.bisect_left([("a", 1), ("c", 2)], "b", key=lambda p: p[0])  # → 1`,
          note: 'The "latest version at or before timestamp t" pattern is bisect_right(...) - 1; check for -1. insort is O(n) because it shifts.',
        },
        {
          title: 'copy and deepcopy',
          code: String.raw`import copy
state = {"rows": [[1, 2]], "n": 1}
shallow = dict(state)        # or state.copy()
deep = copy.deepcopy(state)
state["rows"][0].append(3)
shallow["rows"]              # → [[1, 2, 3]] (shares the inner list)
deep["rows"]                 # → [[1, 2]]`,
          note: 'Snapshots (transactions, versioned stores) need deepcopy or immutable values; a shallow copy shares nested lists and dicts.',
        },
      ],
    },
    {
      id: 'strings',
      label: 'Strings',
      intro:
        'Strings are immutable sequences of Unicode code points. Most parsing questions need only split, join, strip and slicing.',
      entries: [
        {
          title: 'Indexing, slicing, reversing',
          code: String.raw`s = "python"
s[0], s[-1]      # → ('p', 'n')
s[1:4]           # → 'yth'
s[::-1]          # → 'nohtyp'
s == s[::-1]     # → False (palindrome check)
try:
    s[0] = "P"
except TypeError:
    s = "P" + s[1:]
s                # → 'Python'`,
          note: 'You cannot assign into a string. Build a new one, or work on list(s) and join at the end.',
        },
        {
          title: 'split, join, strip',
          code: String.raw`"a,b,,c".split(",")        # → ['a', 'b', '', 'c']
"  two   words ".split()   # → ['two', 'words'] (any whitespace, no empties)
"k=v=w".split("=", 1)      # → ['k', 'v=w']
"k=v".partition("=")       # → ('k', '=', 'v')
"-".join(["a", "b", "c"])  # → 'a-b-c'
",".join(map(str, [1, 2])) # → '1,2'
"  hi\n".strip()           # → 'hi'
"xxhixx".strip("x")        # → 'hi'
"line1\nline2".splitlines()  # → ['line1', 'line2']`,
          note: 'join only accepts strings, so map(str, ...) numbers first. split() with no argument is the one that collapses whitespace.',
        },
        {
          title: 'Searching: startswith, find, index, count',
          code: String.raw`path = "/usr/local/bin"
path.startswith("/")         # → True
path.endswith(("bin", "sbin"))  # → True (tuple of options)
path.find("local")           # → 5
path.find("zzz")             # → -1
path.count("/")              # → 3
"sub" in "substring"         # → True
try:
    path.index("zzz")
except ValueError:
    pass                     # index raises, find returns -1
"v1.2".removeprefix("v")     # → '1.2'`,
        },
        {
          title: 'Character tests, ord and chr',
          code: String.raw`"123".isdigit(), "12a".isdigit()   # → (True, False)
"abc".isalpha(), "a1".isalnum()     # → (True, True)
"-5".isdigit()                      # → False (sign is not a digit)
" ".isspace(), "A".isupper()        # → (True, True)
ord("a"), chr(98)                   # → (97, 'b')
ord("c") - ord("a")                 # → 2 (letter index)
"Hello".lower(), "hello".title()    # → ('hello', 'Hello')`,
          note: 'isdigit rejects "-5" and "1.5"; to parse numbers, try int(s) / float(s) and catch ValueError.',
        },
        {
          title: 'Building strings efficiently',
          code: String.raw`parts = []
for i in range(5):
    parts.append(str(i))
"".join(parts)          # → '01234'
chars = list("hello")
chars[0] = "j"
"".join(chars)          # → 'jello'
"ab" * 3                # → 'ababab'
"-" * 10                # → '----------'`,
          note: 'Collect pieces in a list and join once. Repeated s += piece can be quadratic.',
        },
        {
          title: 'Formatting numbers',
          code: String.raw`x = 1234567.891
f"{x:,.2f}"       # → '1,234,567.89'
f"{0.256:.1%}"    # → '25.6%'
f"{42:>6}"        # → '    42' (right-align, width 6)
f"{'ab':<4}|"     # → 'ab  |'
f"{5:b}", f"{255:x}"  # → ('101', 'ff')
round(2.675, 2)   # → 2.67 (binary float, not 2.68)
str(3.0), str(10**20)  # → ('3.0', '100000000000000000000')`,
          note: 'Format specs go after the colon. For money, use integer cents rather than floats.',
        },
        {
          title: 'int(s, base), bin, hex',
          code: String.raw`int("42")            # → 42
int(" 7 ")           # → 7 (whitespace is fine)
int("ff", 16)        # → 255
int("1010", 2)       # → 10
bin(10), hex(255)    # → ('0b1010', '0xff')
bin(10)[2:]          # → '1010'
(10).bit_count()     # → 2 (set bits)
try:
    int("3.5")
except ValueError:
    float("3.5")     # → 3.5`,
        },
        {
          title: 'string module constants',
          code: String.raw`import string
string.ascii_lowercase       # → 'abcdefghijklmnopqrstuvwxyz'
string.digits                # → '0123456789'
string.ascii_letters[:3]     # → 'abc'
"!" in string.punctuation    # → True
alphabet = string.ascii_lowercase + string.digits
len(alphabet)                # → 36`,
        },
        {
          title: 're basics',
          code: String.raw`import re
re.fullmatch(r"\d{3}-\d{4}", "555-1234") is not None  # → True
m = re.match(r"(\w+)=(\d+)", "x=42; y=7")
m.group(1), int(m.group(2))     # → ('x', 42)
re.search(r"\d+", "abc 123 def").group()  # → '123'
re.findall(r"(\w)=(\d)", "a=1 b=2")       # → [('a', '1'), ('b', '2')]
re.sub(r"\s+", " ", "too   many  spaces")  # → 'too many spaces'
re.split(r"[,;]", "a,b;c")                # → ['a', 'b', 'c']`,
          note: 'match anchors at the start only; fullmatch anchors both ends; search scans. Always use raw strings r"..." for patterns.',
        },
        {
          title: 'len counts code points',
          code: String.raw`len("héllo")              # → 5
len("🙂")                 # → 1 (one code point)
"🙂"[0] == "🙂"           # → True
len("🙂".encode("utf-8")) # → 4 bytes
len("👍🏽")                # → 2 (thumb + skin tone modifier)`,
          note: 'Unlike JavaScript, most emoji are length 1. Combined emoji (skin tones, flags, families) are still several code points.',
        },
      ],
    },
    {
      id: 'classes',
      label: 'Classes',
      intro:
        'Most design questions (KV stores, ledgers, databases) want a small class or two. @dataclass removes most of the boilerplate.',
      entries: [
        {
          title: '__init__ and __repr__',
          code: String.raw`class Account:
    def __init__(self, owner: str, balance: int = 0):
        self.owner = owner
        self.balance = balance

    def __repr__(self):
        return f"Account({self.owner!r}, {self.balance})"

a = Account("ada", 5)
a.balance += 10
a                    # → Account('ada', 15)
str(a)               # → "Account('ada', 15)" (falls back to __repr__)`,
          note: 'A __repr__ makes print() debugging and failed asserts readable. Every method takes self explicitly.',
        },
        {
          title: '__eq__, __lt__ and total_ordering',
          code: String.raw`from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, major, minor):
        self.key = (major, minor)
    def __eq__(self, other):
        return self.key == other.key
    def __lt__(self, other):
        return self.key < other.key
    def __hash__(self):
        return hash(self.key)

Version(1, 2) >= Version(1, 1)   # → True
max([Version(1, 9), Version(2, 0)]).key  # → (2, 0)`,
          note: 'Defining __eq__ sets __hash__ to None, so define __hash__ too if instances go in sets or dict keys.',
        },
        {
          title: '@property',
          code: String.raw`class Range:
    def __init__(self, lo, hi):
        self.lo, self.hi = lo, hi

    @property
    def size(self):
        return self.hi - self.lo

r = Range(3, 10)
r.size               # → 7 (no parentheses)
r.hi = 4
r.size               # → 1`,
          note: 'Computed attributes stay in sync with the fields. Without a setter, assigning r.size raises AttributeError.',
        },
        {
          title: '@staticmethod and @classmethod',
          code: String.raw`class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    @classmethod
    def parse(cls, text):          # alternative constructor
        x, y = map(int, text.split(","))
        return cls(x, y)

    @staticmethod
    def manhattan(a, b):
        return abs(a.x - b.x) + abs(a.y - b.y)

Point.manhattan(Point.parse("1,2"), Point(4, 6))  # → 7`,
        },
        {
          title: '@dataclass',
          code: String.raw`from dataclasses import dataclass, field

@dataclass
class Order:
    id: int
    items: list[str] = field(default_factory=list)
    total: float = 0.0

o = Order(1)
o.items.append("gpu")
o.items, o.total        # → (['gpu'], 0.0)
repr(o).endswith("Order(id=1, items=['gpu'], total=0.0)")  # → True
Order(1, ["gpu"]) == o  # → True (__eq__ compares fields)`,
          note: 'Mutable defaults must use field(default_factory=list); a plain = [] raises ValueError at class creation.',
        },
        {
          title: 'dataclass order=True and frozen=True',
          code: String.raw`from dataclasses import dataclass, replace

@dataclass(order=True, frozen=True)
class Event:
    time: int
    name: str

events = [Event(5, "b"), Event(2, "z"), Event(5, "a")]
[e.name for e in sorted(events)]   # → ['z', 'a', 'b']
e = events[0]
later = replace(e, time=9)         # frozen: make a modified copy
(later.time, later.name, e.time)   # → (9, 'b', 5)
len({e, Event(5, "b")})            # → 1 (frozen instances are hashable)`,
          note: 'order=True compares fields in declaration order, so put the sort key first. frozen=True makes instances immutable and hashable.',
        },
        {
          title: 'Enum',
          code: String.raw`from enum import Enum, auto

class Status(Enum):
    PENDING = auto()
    DONE = auto()

s = Status.PENDING
s is Status.PENDING          # → True
s.name                       # → 'PENDING'
Status["DONE"].value         # → 2
[m.name for m in Status]     # → ['PENDING', 'DONE']`,
        },
        {
          title: 'typing: Optional and generics',
          code: String.raw`from typing import Optional, TypeVar, Generic

def find(xs: list[int], t: int) -> Optional[int]:   # same as int | None
    return xs.index(t) if t in xs else None

T = TypeVar("T")
class Stack(Generic[T]):
    def __init__(self) -> None:
        self.items: list[T] = []

class Box[T]:                 # PEP 695 syntax, Python 3.12+
    def __init__(self, value: T):
        self.value = value

find([4, 5], 5), Box("x").value   # → (1, 'x')`,
          note: 'Hints are for readers and editors only; nothing checks them here. Either generic style is fine in 3.13.',
        },
        {
          title: 'Custom exceptions',
          code: String.raw`class InsufficientFunds(Exception):
    def __init__(self, needed: int):
        super().__init__(f"need {needed} more")
        self.needed = needed

def spend(balance, cost):
    if cost > balance:
        raise InsufficientFunds(cost - balance)
    return balance - cost

try:
    spend(3, 10)
except InsufficientFunds as e:
    (str(e), e.needed)      # → ('need 7 more', 7)`,
          note: 'Subclass Exception (or ValueError/KeyError when one fits). Catch the specific type, never a bare except.',
        },
        {
          title: 'Iterators: __iter__ and __next__',
          code: String.raw`class Countdown:
    def __init__(self, n):
        self.n = n
    def __iter__(self):
        return self
    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        self.n -= 1
        return self.n + 1

list(Countdown(3))           # → [3, 2, 1]
it = iter([1, 2])
next(it), next(it), next(it, "done")  # → (1, 2, 'done')`,
          note: 'Signal the end with StopIteration. next(it, default) avoids the exception when you just want a sentinel.',
        },
        {
          title: 'Generators: yield and yield from',
          code: String.raw`def flatten(nested):
    for x in nested:
        if isinstance(x, list):
            yield from flatten(x)
        else:
            yield x

list(flatten([1, [2, [3, 4]], 5]))  # → [1, 2, 3, 4, 5]

class Tree:
    def __init__(self, items):
        self.items = items
    def __iter__(self):          # a generator makes __iter__ trivial
        yield from sorted(self.items)

list(Tree([3, 1, 2]))        # → [1, 2, 3]`,
          note: 'Writing __iter__ as a generator is the quickest way to make a class iterable; a fresh generator is created on each iteration.',
        },
        {
          title: 'Context managers',
          code: String.raw`from contextlib import contextmanager

log = []

@contextmanager
def transaction(name):
    log.append(f"begin {name}")
    try:
        yield name
        log.append("commit")
    except ValueError:
        log.append("rollback")

with transaction("t1"):
    pass
with transaction("t2"):
    raise ValueError("bad")
log    # → ['begin t1', 'commit', 'begin t2', 'rollback']`,
          note: 'Code after yield runs on exit. Catching the exception inside the generator suppresses it; re-raise if callers should see it.',
        },
      ],
    },
    {
      id: 'async',
      label: 'Async',
      intro:
        'This sandbox has no threads, so concurrency means asyncio. Snippets and tests already run inside an event loop: never call asyncio.run(), just await.',
      entries: [
        {
          title: 'async def, await, asyncio.sleep',
          code: String.raw`import asyncio

async def fetch(url: str) -> str:
    await asyncio.sleep(0.01)    # stand-in for network I/O
    return f"<html {url}>"

page = await fetch("a.com")
page                     # → '<html a.com>'
coro = fetch("b.com")    # calling does not run it yet
await coro               # → '<html b.com>'`,
          note: 'Calling an async function returns a coroutine; nothing happens until you await it (or wrap it in a task).',
        },
        {
          title: 'asyncio.gather',
          code: String.raw`import asyncio, time

async def work(n):
    await asyncio.sleep(0.05)
    return n * n

t0 = time.perf_counter()
results = await asyncio.gather(*(work(n) for n in range(5)))
results                  # → [0, 1, 4, 9, 16] (input order)
time.perf_counter() - t0 < 0.2   # → True (ran concurrently)`,
          note: 'Results come back in argument order, not completion order. Remember the * to unpack a list of coroutines.',
        },
        {
          title: 'gather with return_exceptions=True',
          code: String.raw`import asyncio

async def get(n):
    await asyncio.sleep(0)
    if n == 2:
        raise ValueError(f"bad {n}")
    return n

out = await asyncio.gather(*(get(n) for n in range(4)), return_exceptions=True)
[type(r).__name__ for r in out]   # → ['int', 'int', 'ValueError', 'int']
ok = [r for r in out if not isinstance(r, Exception)]
ok                                # → [0, 1, 3]`,
          note: 'Without it, the first exception propagates and you lose the other results. With it, errors are returned in place.',
        },
        {
          title: 'create_task',
          code: String.raw`import asyncio

async def tick(name, delay, log):
    await asyncio.sleep(delay)
    log.append(name)

log = []
t1 = asyncio.create_task(tick("slow", 0.03, log))
t2 = asyncio.create_task(tick("fast", 0.01, log))
await t1
await t2
log                      # → ['fast', 'slow']
t2.done()                # → True`,
          note: 'A task starts running at the next await, in the background. Keep a reference and await it, or errors are lost.',
        },
        {
          title: 'Semaphore: limit concurrency',
          code: String.raw`import asyncio

limit = asyncio.Semaphore(2)
active = peak = 0

async def fetch(i):
    nonlocal active, peak
    async with limit:
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.01)
        active -= 1
    return i

await asyncio.gather(*(fetch(i) for i in range(6)))  # → [0, 1, 2, 3, 4, 5]
peak                     # → 2`,
          note: 'The standard answer to "at most N requests in flight". Create the semaphore inside the running loop, not at import time in older Pythons.',
        },
        {
          title: 'Worker pool with asyncio.Queue',
          code: String.raw`import asyncio

async def crawl(start, links, workers=3):
    q, seen = asyncio.Queue(), {start}
    await q.put(start)
    async def worker():
        while True:
            url = await q.get()
            try:
                await asyncio.sleep(0)            # fetch(url) goes here
                for nxt in links.get(url, []):
                    if nxt not in seen:
                        seen.add(nxt)             # mark before enqueueing
                        q.put_nowait(nxt)
            finally:
                q.task_done()
    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    await q.join()                                # every item processed
    for t in tasks:
        t.cancel()
    return sorted(seen)

await crawl("a", {"a": ["b", "c"], "b": ["c", "d"]})  # → ['a', 'b', 'c', 'd']`,
          note: 'q.join() waits until task_done() was called for every put; cancel the idle workers afterwards. The try/finally keeps join() from hanging when a fetch fails.',
        },
        {
          title: 'asyncio.wait_for timeouts',
          code: String.raw`import asyncio

async def slow():
    await asyncio.sleep(10)

try:
    await asyncio.wait_for(slow(), timeout=0.05)
except TimeoutError:
    result = "timed out"
result                   # → 'timed out'
async with asyncio.timeout(1):
    await asyncio.sleep(0)`,
          note: 'The timed-out coroutine is cancelled. asyncio.TimeoutError is the same class as the built-in TimeoutError since 3.11.',
        },
        {
          title: 'Handling errors around awaits',
          code: String.raw`import asyncio

async def fetch(url):
    await asyncio.sleep(0)
    if "bad" in url:
        raise ConnectionError(url)
    return 200

async def safe_fetch(url):
    try:
        return await fetch(url)
    except ConnectionError:
        return None
    finally:
        pass                 # cleanup runs either way

await asyncio.gather(safe_fetch("ok"), safe_fetch("bad"))  # → [200, None]`,
          note: 'Exceptions raise at the await, so ordinary try/except works. Do not swallow asyncio.CancelledError (it is a BaseException, so except Exception does not catch it).',
        },
      ],
    },
    {
      id: 'libraries',
      label: 'Libraries',
      intro:
        'The whole standard library is available here; collections, heapq, bisect, itertools and functools solve most interview problems. In a real interview the stdlib is almost always fine, while third-party packages (numpy, pandas) usually are not unless the interviewer says so.',
      entries: [
        {
          title: 'collections',
          code: String.raw`from collections import Counter, defaultdict, deque, OrderedDict
cache = OrderedDict()
for k in "abc":
    cache[k] = True
cache.move_to_end("a")        # mark as recently used
cache.popitem(last=False)     # → ('b', True) (evict least recent)
list(cache)                   # → ['c', 'a']
Counter("aab").most_common(1) # → [('a', 2)]`,
          note: 'OrderedDict.move_to_end plus popitem(last=False) is a complete LRU cache.',
        },
        {
          title: 'heapq and bisect',
          code: String.raw`import heapq, bisect
streams = [[1, 4, 9], [2, 3, 10]]
list(heapq.merge(*streams))       # → [1, 2, 3, 4, 9, 10]
heapq.nlargest(2, {"a": 5, "b": 9, "c": 1}.items(), key=lambda kv: kv[1])  # → [('b', 9), ('a', 5)]
"FDCBA"[bisect.bisect([70, 80, 90, 100], 85)]  # → 'C'`,
        },
        {
          title: 'itertools',
          code: String.raw`from itertools import permutations, combinations, product, accumulate, groupby, pairwise, chain
list(permutations("abc", 2))[:3]   # → [('a', 'b'), ('a', 'c'), ('b', 'a')]
list(combinations([1, 2, 3], 2))   # → [(1, 2), (1, 3), (2, 3)]
list(product([0, 1], repeat=2))    # → [(0, 0), (0, 1), (1, 0), (1, 1)]
list(accumulate([1, 2, 3, 4]))     # → [1, 3, 6, 10] (prefix sums)
[(k, len(list(g))) for k, g in groupby("aaabcc")]  # → [('a', 3), ('b', 1), ('c', 2)]
list(pairwise([1, 4, 9]))          # → [(1, 4), (4, 9)]
list(chain([1], [2, 3]))           # → [1, 2, 3]`,
          note: 'groupby only groups consecutive equal keys, so sort first when you want all of them together.',
        },
        {
          title: 'functools',
          code: String.raw`from functools import cache, lru_cache, reduce, cmp_to_key, partial

@cache
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
fib(80)                                # → 23416728348467685

reduce(lambda a, b: a * b, [1, 2, 3, 4])  # → 24
cmp = lambda a, b: -1 if a + b > b + a else 1
"".join(sorted(["3", "30", "34"], key=cmp_to_key(cmp)))  # → '34330'
int2 = partial(int, base=2)
int2("101")                            # → 5`,
          note: '@cache (or @lru_cache(maxsize=None)) memoizes in one line; arguments must be hashable. Deep memoized recursion can still hit the recursion limit.',
        },
        {
          title: 'math',
          code: String.raw`import math
math.gcd(12, 18), math.lcm(4, 6)   # → (6, 12)
math.isqrt(17)                     # → 4 (exact integer sqrt)
math.comb(5, 2), math.perm(5, 2)   # → (10, 20)
math.ceil(7 / 2), math.floor(-0.5) # → (4, -1)
math.inf > 10**100                 # → True
math.isclose(0.1 + 0.2, 0.3)       # → True
math.log2(1024)                    # → 10.0`,
          note: 'Use isqrt, not int(math.sqrt(n)), for big integers. Ceil division without floats: -(-a // b).',
        },
        {
          title: 'dataclasses and typing',
          code: String.raw`from dataclasses import dataclass, asdict, field
from typing import Any, Callable, Iterator, Protocol

@dataclass
class Cell:
    formula: str = ""
    deps: set[str] = field(default_factory=set)

asdict(Cell("=A1", {"A1"}))   # → {'formula': '=A1', 'deps': {'A1'}}
Handler = Callable[[str], int]
def count(xs: list[Any]) -> Iterator[int]:
    yield len(xs)
next(count([1, 2]))           # → 2`,
        },
        {
          title: 're',
          code: String.raw`import re
TOKEN = re.compile(r"\s*(\d+|[A-Z]+\d+|[-+*/()])")
TOKEN.findall("A1 + 23*(B2)")   # → ['A1', '+', '23', '*', '(', 'B2', ')']
m = re.fullmatch(r"(?P<col>[A-Z]+)(?P<row>\d+)", "AB12")
m["col"], int(m["row"])         # → ('AB', 12)`,
          note: 'Compile once when a pattern is reused. Named groups (?P<name>...) make parsing code self-explanatory.',
        },
        {
          title: 'json',
          code: String.raw`import json
s = json.dumps({"b": 1, "a": [1, None, True]})
s                          # → '{"b": 1, "a": [1, null, true]}'
json.dumps({"b": 1, "a": 2}, sort_keys=True, separators=(",", ":"))  # → '{"a":2,"b":1}'
json.loads('{"k": [1, 2]}')["k"]   # → [1, 2]
json.loads(json.dumps({1: "x"}))   # → {'1': 'x'} (keys become strings)
json.loads(json.dumps((1, 2)))     # → [1, 2] (tuples become lists)`,
          note: 'JSON round-trips change int keys to strings and tuples to lists, which matters when you serialize a store.',
        },
        {
          title: 'time and random',
          code: String.raw`import time, random
t0 = time.perf_counter()        # for measuring durations
now = time.time()               # wall clock seconds since epoch
time.perf_counter() >= t0       # → True
random.seed(42)                 # deterministic for tests
a = [random.randint(1, 6) for _ in range(3)]
random.seed(42)
a == [random.randint(1, 6) for _ in range(3)]  # → True
random.choice("xyz") in "xyz"   # → True
xs = [1, 2, 3]; random.shuffle(xs); sorted(xs)  # → [1, 2, 3]`,
          note: 'Use time.monotonic() or perf_counter() for timeouts and TTLs; time.time() can jump. Seed random for reproducible output.',
        },
        {
          title: 'string and operator',
          code: String.raw`import string, operator
string.ascii_uppercase[:5]     # → 'ABCDE'
ops = {"+": operator.add, "-": operator.sub, "*": operator.mul}
ops["*"](6, 7)                 # → 42
rows = [("b", 2), ("a", 1)]
sorted(rows, key=operator.itemgetter(1))  # → [('a', 1), ('b', 2)]`,
          note: 'An operator lookup table is the cleanest way to evaluate a parsed expression.',
        },
        {
          title: 'urllib.parse',
          code: String.raw`from urllib.parse import urlparse, urljoin, urldefrag, parse_qs
u = urlparse("https://ex.com/a/b?x=1&x=2#top")
u.scheme, u.netloc, u.path     # → ('https', 'ex.com', '/a/b')
parse_qs(u.query)              # → {'x': ['1', '2']}
urljoin("https://ex.com/a/b", "../c")   # → 'https://ex.com/c'
urldefrag("https://ex.com/p#s").url     # → 'https://ex.com/p'`,
          note: 'A crawler should resolve relative links with urljoin, strip fragments, and compare netloc to stay on one host.',
        },
        {
          title: 'uuid',
          code: String.raw`import uuid
uid = uuid.uuid4()
len(str(uid))            # → 36
len(uid.hex)             # → 32
uuid.UUID(str(uid)) == uid   # → True`,
          note: 'uuid4 is random. In tests, a simple incrementing counter is easier to assert on.',
        },
        {
          title: 'numpy (Pyodide package)',
          code: String.raw`import numpy as np          # first import downloads it (a few seconds)
a = np.arange(6).reshape(2, 3)
a.sum(axis=0)              # → array([3, 5, 7])
(a * 2).tolist()           # → [[0, 2, 4], [6, 8, 10]]`,
          note: 'Pyodide packages load on import, which takes a few seconds the first time. Interviews rarely allow numpy, so prefer the stdlib.',
          run: false,
        },
      ],
      modules: [
        { heading: 'Standard library', names: pythonStdlib },
        {
          heading: 'Pyodide packages (load on import)',
          note: 'Fetched from the Pyodide CDN the first time you import them, which takes a few seconds. Most interviews do not allow third-party packages.',
          names: pyodidePackages,
        },
      ],
    },
    {
      id: 'gotchas',
      label: 'Gotchas',
      intro:
        'The bugs that cost the most time in a live interview. Each one runs without an error message, which is what makes it dangerous.',
      entries: [
        {
          title: 'Mutable default arguments',
          code: String.raw`def add_bad(x, items=[]):
    items.append(x)
    return items
add_bad(1); add_bad(2)    # → [1, 2] (the same list both times)

def add(x, items=None):
    if items is None:
        items = []
    items.append(x)
    return items
add(1); add(2)            # → [2]`,
          note: 'Defaults are evaluated once, when def runs. Use None and create the list inside the function.',
        },
        {
          title: '[[]] * n shares one list',
          code: String.raw`buckets = [[]] * 3
buckets[0].append("x")
buckets                   # → [['x'], ['x'], ['x']]
buckets = [[] for _ in range(3)]
buckets[0].append("x")
buckets                   # → [['x'], [], []]`,
          note: 'Same for dicts and sets. Only immutable values like [0] * n are safe to multiply.',
        },
        {
          title: 'Late-binding closures in loops',
          code: String.raw`fns = [lambda: i for i in range(3)]
[f() for f in fns]        # → [2, 2, 2]
fns = [lambda i=i: i for i in range(3)]
[f() for f in fns]        # → [0, 1, 2]`,
          note: 'A closure reads the variable when called, not when created. Bind the current value with a default argument.',
        },
        {
          title: 'is vs ==',
          code: String.raw`a = [1, 2]
b = [1, 2]
a == b                    # → True (same value)
a is b                    # → False (different objects)
x = None
x is None                 # → True (the right way to test None)
int("1000") is int("1000")  # → False (do not use is for numbers)`,
          note: 'Use is only for None, True/False and sentinels. Small ints and short strings are cached, so is "works" in tests and then fails.',
        },
        {
          title: 'Modifying a collection while iterating',
          code: String.raw`nums = [1, 2, 2, 3]
for n in nums:
    if n == 2:
        nums.remove(n)
nums                      # → [1, 2, 3] (skipped one)
nums = [1, 2, 2, 3]
nums = [n for n in nums if n != 2]
nums                      # → [1, 3]
d = {"a": 1, "b": 2}
try:
    for k in d:
        del d[k]
except RuntimeError as e:
    str(e)                # → 'dictionary changed size during iteration'`,
          note: 'Build a new list, or iterate over a copy (list(d), nums[:]).',
        },
        {
          title: 'Integer vs float division',
          code: String.raw`6 / 2                     # → 3.0 (float, even when exact)
items = [10, 20, 30]
mid = len(items) // 2     # use // for indexes
items[mid]                # → 20
try:
    items[len(items) / 2]
except TypeError:
    pass                  # list indices must be integers
10**20 // 3 == int(10**20 / 3)  # → False (float lost precision)`,
          note: '/ always returns a float, which cannot index a list and loses precision on big ints.',
        },
        {
          title: "round() is banker's rounding",
          code: String.raw`round(0.5), round(1.5), round(2.5)   # → (0, 2, 2)
round(2.675, 2)           # → 2.67
import math
math.floor(2.5 + 0.5)     # → 3 (round half up, positives)
from decimal import Decimal, ROUND_HALF_UP
Decimal("2.675").quantize(Decimal("0.01"), ROUND_HALF_UP)  # → Decimal('2.68')`,
          note: 'Halves round to the even neighbour. For ledgers, store integer cents and use Decimal if a spec demands half-up.',
        },
        {
          title: 'Recursion limit',
          code: String.raw`import sys
def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)
try:
    depth(10_000)
except RecursionError:
    hit = True
hit                       # → True

def depth_iter(n):        # explicit stack instead
    stack, deepest = [(n, 0)], 0
    while stack:
        k, d = stack.pop()
        deepest = max(deepest, d)
        if k > 0:
            stack.append((k - 1, d + 1))
    return deepest
depth_iter(100_000)       # → 100000`,
          note: 'The default limit is 1000 frames, in Pyodide too. Long chains (linked lists, deep DFS, cycle detection) need an explicit stack; raising sys.setrecursionlimit can crash the page.',
        },
        {
          title: 'Sort stability and mixed types',
          code: String.raw`people = [("bo", 30), ("al", 25), ("cy", 30)]
sorted(people, key=lambda p: p[1])  # → [('al', 25), ('bo', 30), ('cy', 30)] (ties keep input order)
try:
    sorted([3, "a", 1])
except TypeError as e:
    str(e)    # → "'<' not supported between instances of 'str' and 'int'"
sorted([3, None, 1], key=lambda x: (x is None, x or 0))  # → [1, 3, None]`,
          note: 'Sorting is stable, so you can sort in passes. Mixed types (including None) raise; give key= a tuple that orders them.',
        },
        {
          title: 'Dict ordering',
          code: String.raw`d = {"b": 1, "a": 2}
list(d)                   # → ['b', 'a'] (insertion, not sorted)
d["b"] = 9
list(d)                   # → ['b', 'a'] (update keeps position)
del d["b"]; d["b"] = 9
list(d)                   # → ['a', 'b'] (re-insert moves to end)
sorted(d)                 # → ['a', 'b']
{"a": 1, "b": 2} == {"b": 2, "a": 1}  # → True (order ignored)`,
          note: 'If output must be sorted, sort explicitly. Sets have no reliable order at all.',
        },
        {
          title: 'Shadowing builtins',
          code: String.raw`def broken(items):
    list = sorted(items)       # shadows the builtin in this function
    return list(items)

try:
    broken([2, 1])
except TypeError as e:
    str(e)                     # → "'list' object is not callable"

def fixed(items):
    ordered = sorted(items)    # pick a descriptive name instead
    return list(ordered)
fixed([2, 1])                  # → [1, 2]`,
          note: 'Watch out for list, dict, set, str, id, sum, min, max, input, type, hash and iter as variable names.',
        },
        {
          title: 'String concatenation in a loop',
          code: String.raw`words = ["w"] * 1000
out = ""
for w in words:
    out += w + " "         # may copy the whole string each time
joined = " ".join(words)
len(joined)                # → 1999
out.rstrip() == joined     # → True`,
          note: 'CPython sometimes optimizes +=, but do not rely on it; join is linear and also avoids a trailing separator.',
        },
        {
          title: 'nonlocal and global',
          code: String.raw`def make_counter():
    count = 0
    def inc():
        nonlocal count      # without this: UnboundLocalError
        count += 1
        return count
    return inc

inc = make_counter()
inc(); inc()                # → 2
totals = {"n": 0}
def bump():
    totals["n"] += 1        # mutating needs no declaration
bump()
totals["n"]                 # → 1`,
          note: 'Assigning to a name anywhere in a function makes it local. Use nonlocal for an enclosing function and global for a module-level variable; mutation does not need either.',
        },
      ],
    },
    {
      id: 'sandbox',
      label: 'Sandbox',
      intro:
        'Your code runs in Python 3.13 (Pyodide) inside the browser. Tests import nothing: they call your top-level functions and classes by name. The first run loads Python, which takes a few seconds.',
      entries: [
        {
          title: 'Tests call your top-level names',
          code: String.raw`class KVStore:                 # the test does: s = KVStore()
    def __init__(self):
        self.data = {}
    def set(self, key, value):
        self.data[key] = value
    def get(self, key):
        return self.data.get(key)

s = KVStore()
s.set("a", 1)
s.get("a"), s.get("b")         # → (1, None)`,
          note: 'Keep the exact function, class and method names from the prompt, at the top level of your file. Each test runs your file fresh, so state does not leak between tests.',
        },
        {
          title: 'print() goes to the Console tab',
          code: String.raw`def solve(xs):
    print("debug:", xs)        # shows in the Console tab
    return sum(xs)

solve([1, 2, 3])               # → 6`,
          note: 'Printing is fine while debugging and does not affect pass or fail.',
        },
        {
          title: 'Errors point at solution.py',
          code: String.raw`def parse(s):
    return int(s)

try:
    parse("x")
except ValueError as e:
    str(e)     # → "invalid literal for int() with base 10: 'x'"`,
          note: 'A failing test shows the exception and the line in your code, labelled solution.py. A syntax error stops every test until it is fixed.',
        },
        {
          title: 'Infinite loops and timeouts',
          code: String.raw`import asyncio
n = 0
while n < 10:          # forgetting n += 1 here would hang
    n += 1
async def ok():
    await asyncio.sleep(0.01)
    return "done"
await ok()             # → 'done'`,
          note: 'A run that loops forever is stopped after 5 s. An async test that has not finished after 4 s fails with a timeout, often a missing await or a queue nobody drains.',
        },
        {
          title: 'Running tests and type hints',
          code: String.raw`def area(w: int, h: int) -> int:
    return w * h

area(2.5, 2)           # → 5.0 (hints are not checked)`,
          note: 'Cmd/Ctrl+Enter runs the tests. Type hints are never checked, so a wrong type fails only where it is used.',
        },
      ],
    },
  ],
};
