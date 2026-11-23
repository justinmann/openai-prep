import type { PythonVersion } from '../types';
import { py as bankSystem } from './bank-system';
import { py as stackTraceEvents } from './stack-trace-events';
import { py as lruCacheTtl } from './lru-cache-ttl';
import { py as rateLimiter } from './rate-limiter';
import { py as invoiceMatching } from './invoice-matching';
import { py as inMemoryFs } from './in-memory-fs';
import { py as kClosestDrivers } from './k-closest-drivers';
import { py as wordLadder } from './word-ladder';
import { py as allocator } from './memory-allocator';
import { py as cdSymlinks } from './cd-symlinks';
import { py as gpuCredits } from './gpu-credits';
import { py as inMemoryDb } from './in-memory-db';
import { py as kvSerialize } from './kv-serialize';
import { py as resumableIterator } from './resumable-iterator';
import { py as spreadsheet } from './spreadsheet';
import { py as versionedKv } from './versioned-kv';
import { py as webCrawler } from './web-crawler';

export const pythonVersions: Record<string, PythonVersion> = {
  'kv-serialize': kvSerialize,
  'versioned-kv': versionedKv,
  'resumable-iterator': resumableIterator,
  'in-memory-db': inMemoryDb,
  'spreadsheet': spreadsheet,
  'gpu-credits': gpuCredits,
  'cd-symlinks': cdSymlinks,
  'web-crawler': webCrawler,
  'memory-allocator': allocator,
  'bank-system': bankSystem,
  'stack-trace-events': stackTraceEvents,
  'lru-cache-ttl': lruCacheTtl,
  'rate-limiter': rateLimiter,
  'invoice-matching': invoiceMatching,
  'in-memory-fs': inMemoryFs,
  'k-closest-drivers': kClosestDrivers,
  'word-ladder': wordLadder,
};
