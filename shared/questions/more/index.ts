import type { CodingQuestion } from '../types';
import { question as bankSystem } from './bank-system';
import { question as stackTraceEvents } from './stack-trace-events';
import { question as lruCacheTtl } from './lru-cache-ttl';
import { question as rateLimiter } from './rate-limiter';
import { question as invoiceMatching } from './invoice-matching';
import { question as inMemoryFs } from './in-memory-fs';
import { question as kClosestDrivers } from './k-closest-drivers';
import { question as wordLadder } from './word-ladder';
export { moreDesign } from './design';

/** Questions added for companies beyond OpenAI. */
export const moreCoding: CodingQuestion[] = [
  bankSystem,
  stackTraceEvents,
  lruCacheTtl,
  rateLimiter,
  invoiceMatching,
  inMemoryFs,
  kClosestDrivers,
  wordLadder,
];
