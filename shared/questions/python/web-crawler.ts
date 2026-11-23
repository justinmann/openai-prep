import type { PythonVersion } from '../types';

export const py: PythonVersion = {
  prompt: `Write an async crawler:

\`\`\`python
async def crawl(
    start_url: str,
    fetch_links: Callable[[str], Awaitable[list[str]]],
    max_concurrency: int,
) -> list[str]
\`\`\`

Return every URL reachable from \`start_url\` that has the **same hostname**, including \`start_url\`, sorted. Fetch each URL at most once, never run more than \`max_concurrency\` fetches at a time, and do use the concurrency you are given. Use \`asyncio\` (there are no threads).`,
  starter: String.raw`import asyncio
from typing import Awaitable, Callable


async def crawl(
    start_url: str,
    fetch_links: Callable[[str], Awaitable[list[str]]],
    max_concurrency: int,
) -> list[str]:
    # TODO
    return [start_url]
`,
  parts: [
    {
      prompt:
        'Links to other hostnames are not followed or returned. Links may be relative to the page they appear on (resolve them with `urllib.parse.urljoin(page, link)`).',
      tests: [
        {
          name: 'same-host crawl',
          code: String.raw`graph = {
    'https://a.com/': ['https://a.com/x', 'https://b.com/', '/y'],
    'https://a.com/x': ['https://a.com/', 'https://a.com/z'],
    'https://a.com/y': [],
    'https://a.com/z': ['https://a.com/x'],
}
fetched = []
async def fetch(u):
    fetched.append(u)
    await asyncio.sleep(0.002)
    return graph.get(u, [])
result = await crawl('https://a.com/', fetch, 2)
assert_equal(result, ['https://a.com/', 'https://a.com/x', 'https://a.com/y', 'https://a.com/z'])
assert_equal(len(fetched), 4, 'each URL fetched once')`,
        },
        {
          name: 'respects and uses maxConcurrency',
          code: String.raw`import time
links = ['https://h.com/p' + str(i) for i in range(20)]
active = 0
peak = 0
async def fetch(u):
    nonlocal active, peak
    active += 1
    peak = max(peak, active)
    await asyncio.sleep(0.015)
    active -= 1
    return links if u == 'https://h.com/' else []
t0 = time.perf_counter()
out = await crawl('https://h.com/', fetch, 4)
assert_equal(len(out), 21)
assert peak <= 4, 'peak concurrency ' + str(peak)
assert peak == 4, 'never reached 4 parallel fetches (peak ' + str(peak) + ')'
assert time.perf_counter() - t0 < 0.2, 'too slow: looks serial'`,
        },
      ],
    },
    {
      prompt:
        'If `fetch_links` raises, keep the URL in the result but do not follow it, and keep crawling. Strip `#fragments` so `/a#top` and `/a` count as the same URL.',
      tests: [
        {
          name: 'failed fetches do not stop the crawl',
          code: String.raw`graph = {'https://s.com/': ['https://s.com/bad', 'https://s.com/ok'], 'https://s.com/ok': ['https://s.com/deep']}
async def fetch(u):
    if u.endswith('/bad'):
        raise RuntimeError('500')
    return graph.get(u, [])
out = await crawl('https://s.com/', fetch, 3)
assert_equal(out, ['https://s.com/', 'https://s.com/bad', 'https://s.com/deep', 'https://s.com/ok'])`,
        },
        {
          name: 'fragments are stripped',
          code: String.raw`calls = []
async def fetch(u):
    calls.append(u)
    return ['/a#top', '/a', '/a#bottom'] if u == 'https://f.com/' else []
out = await crawl('https://f.com/', fetch, 2)
assert_equal(out, ['https://f.com/', 'https://f.com/a'])
assert_equal(len(calls), 2)`,
        },
      ],
    },
  ],
  solution: String.raw`import asyncio
from typing import Awaitable, Callable
from urllib.parse import urldefrag, urljoin, urlparse


async def crawl(
    start_url: str,
    fetch_links: Callable[[str], Awaitable[list[str]]],
    max_concurrency: int,
) -> list[str]:
    host = urlparse(start_url).hostname
    start = urldefrag(start_url).url
    seen = {start}
    queue: asyncio.Queue[str] = asyncio.Queue()
    queue.put_nowait(start)

    async def worker() -> None:
        while True:
            url = await queue.get()
            try:
                links = await fetch_links(url)
            except Exception:
                links = []
            try:
                for link in links:
                    try:
                        absolute = urldefrag(urljoin(url, link)).url
                        same_host = urlparse(absolute).hostname == host
                    except ValueError:
                        continue
                    if same_host and absolute not in seen:
                        seen.add(absolute)
                        queue.put_nowait(absolute)
            finally:
                queue.task_done()

    workers = [asyncio.create_task(worker()) for _ in range(max_concurrency)]
    await queue.join()
    for w in workers:
        w.cancel()
    await asyncio.gather(*workers, return_exceptions=True)
    return sorted(seen)
`,
};
