import type { PythonVersion } from '../types';
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
};
