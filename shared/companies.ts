// How each company interviews, compiled from public candidate reports (Blind,
// Glassdoor, LeetCode Discuss, interviewing.io, prep-site write-ups and the
// companies' own guides). Weights are our reading of those reports, not
// anything a company publishes. Used by the company pages, the coding page's
// readiness score and the design grader's prompt.

export const COMPANY_IDS = [
  'openai',
  'anthropic',
  'google',
  'meta',
  'amazon',
  'microsoft',
  'apple',
  'netflix',
  'stripe',
  'uber',
  'airbnb',
] as const;
export type CompanyId = (typeof COMPANY_IDS)[number];

export interface Emphasis {
  area: string;
  /** Percent; each list sums to 100. */
  weight: number;
  detail: string;
}

export interface Company {
  id: CompanyId;
  name: string;
  /** One sentence, used as the company page's meta description lead. */
  tagline: string;
  /** How the coding rounds run. */
  coding: string;
  /** How the system design rounds run. */
  design: string;
  /** What the design grader weights for this company. */
  designEmphasis: Emphasis[];
  /** Things that sink candidates here. */
  redFlags: string[];
  /** Coding readiness score: how this company's coding bar is weighted. */
  codingScore: {
    /** Minutes a candidate is expected to need for one multi-part question. */
    budgetMin: number;
    /** Whether the interview lets you run code. When false, reruns cost more. */
    runsCode: boolean;
    /** Weights (sum 100): tests passing, time vs budget, few runs to green. */
    weights: { correctness: number; speed: number; firstTry: number };
  };
  sources: string[];
}

export const companies: Company[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    tagline:
      'Practical, progressive coding in a real editor and infrastructure-heavy system design.',
    coding:
      'One practical problem that grows over several parts (a KV store, an iterator, a spreadsheet), in a shared editor where code runs. OpenAI asks for well-designed solutions, high-quality code, good performance and test coverage. Policy on AI tools varies by round.',
    design:
      'Infrastructure-heavy prompts that rotate every few months: chat serving, inference APIs, webhooks, sandboxes, CI. Interviewers push on async work, retries, isolation and how the design adapts when requirements change.',
    designEmphasis: [
      {
        area: 'Depth on the hard path',
        weight: 30,
        detail:
          'Async processing, retries, isolation and back-pressure worked through concretely, not named.',
      },
      {
        area: 'Correct, extensible architecture',
        weight: 25,
        detail:
          'Components and data flow that hold up and extend cleanly when the next requirement lands.',
      },
      {
        area: 'Performance and capacity',
        weight: 20,
        detail:
          'Latency budgets (time to first token, p99) and capacity math once the basic design works.',
      },
      {
        area: 'Reliability and testing mindset',
        weight: 15,
        detail:
          'Failure modes, observability and how you would verify the system works.',
      },
      {
        area: 'Communication and adaptability',
        weight: 10,
        detail:
          'Clear narration and graceful pivots when the interviewer changes a constraint.',
      },
    ],
    redFlags: [
      'Spending early time on cosmetic refactors instead of working code.',
      'Naming technologies without explaining the failure handling.',
    ],
    codingScore: {
      budgetMin: 60,
      runsCode: true,
      weights: { correctness: 60, speed: 25, firstTry: 15 },
    },
    sources: [
      'https://openai.com/interview-guide/',
      'https://www.tryexponent.com/blog/openai-system-design-interview',
      'https://www.coditioning.com/blog/14/open-ai-swe-coding-interviewquestions-actual-questions-real-candidates',
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline:
      'Multi-level coding under time pressure and design rounds that demand real numbers for GPUs, batching and latency.',
    coding:
      'A multi-level CodeSignal assessment (about 90 minutes, four levels that build on each other), then live coding in Colab or CodeSignal, usually in Python. Follow-ups push on concurrency, failure modes and memory. AI tools are not allowed unless the round says so.',
    design:
      'Resource reasoning with concrete numbers: GPU batching, inference serving, token metering, sandboxes for model-written code. Expect "what happens when a GPU dies mid-batch?"',
    designEmphasis: [
      {
        area: 'Capacity math',
        weight: 30,
        detail:
          'GPU counts, batch sizes, tokens per second and latency budgets derived from the stated numbers.',
      },
      {
        area: 'Failure handling',
        weight: 25,
        detail:
          'Partial failures (a GPU or node dying mid-request), retries, idempotency and graceful degradation.',
      },
      {
        area: 'Concurrency and correctness',
        weight: 20,
        detail: 'Races, ordering and back-pressure handled explicitly.',
      },
      {
        area: 'Safety and isolation',
        weight: 15,
        detail:
          'Isolation of untrusted or model-generated work, abuse limits, blast radius.',
      },
      {
        area: 'Clarity',
        weight: 10,
        detail: 'A design a teammate could build from, with trade-offs stated.',
      },
    ],
    redFlags: [
      'Hand-waving capacity ("we add more GPUs") without numbers.',
      'Ignoring what happens to in-flight work on failure.',
    ],
    codingScore: {
      budgetMin: 60,
      runsCode: true,
      weights: { correctness: 55, speed: 35, firstTry: 10 },
    },
    sources: [
      'https://www.interviewquery.com/guides/anthropic-software-engineer',
      'https://prachub.com/companies/anthropic/categories/system-design',
      'https://prepare.sh/articles/anthropic-interview-process-2026',
    ],
  },
  {
    id: 'google',
    name: 'Google',
    tagline:
      'Algorithmic coding without a compiler and design rounds that reward handling ambiguity and scale.',
    coding:
      'Algorithm problems in a shared doc with no way to run code, yet code is expected to be correct. Interviewers weight the process: brute force first, then optimal, with complexity analysis. Constraints are added mid-problem. A hiring committee decides hire and level.',
    design:
      'High-level and low-level design. Many prompts hinge on an assumption you only discover by asking clarifying questions. Scalability is expected to be reasoned from first principles.',
    designEmphasis: [
      {
        area: 'Handling ambiguity',
        weight: 25,
        detail:
          'Clarifying questions that surface the assumptions the design depends on, stated before designing.',
      },
      {
        area: 'Scalability from first principles',
        weight: 25,
        detail:
          'Back-of-envelope math that drives partitioning, replication and caching choices.',
      },
      {
        area: 'Component depth',
        weight: 20,
        detail:
          'At least one component designed at a low level: data structures, algorithms, consistency.',
      },
      {
        area: 'Trade-offs',
        weight: 20,
        detail: 'Alternatives compared with reasons, not a single path.',
      },
      {
        area: 'Adapting to follow-ups',
        weight: 10,
        detail: 'Revising the design cleanly when constraints change.',
      },
    ],
    redFlags: [
      'Designing before asking any clarifying questions.',
      'No complexity or capacity analysis.',
    ],
    codingScore: {
      budgetMin: 45,
      runsCode: false,
      weights: { correctness: 50, speed: 15, firstTry: 35 },
    },
    sources: [
      'https://interviewing.io/guides/hiring-process/google',
      'https://prachub.com/companies/google/categories/system-design',
      'https://thedesignround.com/interviews/google-system-design',
    ],
  },
  {
    id: 'meta',
    name: 'Meta',
    tagline:
      'Fast coding (two problems in 35-45 minutes) and a choice of system design or product architecture.',
    coding:
      'Two medium problems per round, about 20 minutes each, with code execution off: speed and near bug-free code matter. Newer loops add an AI-enabled round in CoderPad (fix a bug, build a feature, optimize) where you must review what the AI writes.',
    design:
      'The recruiter assigns system design (scale, storage, partitioning) or product architecture (API, data model, client flow). Design rounds mostly decide level.',
    designEmphasis: [
      {
        area: 'Scale and data',
        weight: 30,
        detail:
          'Partitioning, caching, hot keys and storage choices sized to the numbers (system design track).',
      },
      {
        area: 'APIs and data model',
        weight: 25,
        detail:
          'Precise endpoints, payloads and schemas (weighted heavily on the product architecture track).',
      },
      {
        area: 'Quantified scope',
        weight: 20,
        detail:
          'Numbers for traffic, storage and latency that the design actually uses.',
      },
      {
        area: 'Trade-offs and bottlenecks',
        weight: 15,
        detail:
          'Identifies the bottleneck and explains how the design relieves it.',
      },
      {
        area: 'Driving the conversation',
        weight: 10,
        detail:
          'Leads the interview with a clear structure, especially at E5 and above.',
      },
    ],
    redFlags: [
      'Accepting AI-written code without reading or testing it.',
      'Missing interviewer hints.',
    ],
    codingScore: {
      budgetMin: 35,
      runsCode: false,
      weights: { correctness: 45, speed: 35, firstTry: 20 },
    },
    sources: [
      'https://interviewing.io/guides/hiring-process/meta-facebook',
      'https://www.coditioning.com/blog/13/meta-ai-enabled-coding-interview-guide',
      'https://www.teamblind.com/post/meta-e6-system-design-interview-questions-qquump5y',
    ],
  },
  {
    id: 'amazon',
    name: 'Amazon',
    tagline:
      'Medium coding, practical design weighted toward operations, and Leadership Principles in every round.',
    coding:
      'Medium algorithm problems (graphs and BFS are common); code is usually not run. Every round also asks one or two Leadership Principle questions.',
    design:
      "Practical prompts, often from the team's domain. Resiliency and operational excellence count more than raw scale. A Bar Raiser can veto, and weak Leadership Principle answers sink otherwise strong candidates.",
    designEmphasis: [
      {
        area: 'Operational excellence',
        weight: 30,
        detail:
          'Monitoring, alarms, failure modes, runbooks, deployment safety and cost.',
      },
      {
        area: 'Customer-driven trade-offs',
        weight: 25,
        detail:
          'Choices justified by their effect on customers (latency, correctness, availability).',
      },
      {
        area: 'Resiliency',
        weight: 20,
        detail:
          'Redundancy, graceful degradation and recovery, worked through.',
      },
      {
        area: 'Ownership (Leadership Principles)',
        weight: 15,
        detail:
          'Takes ownership of the whole lifecycle; dives deep when asked; frugal with resources.',
      },
      {
        area: 'Clear narration',
        weight: 10,
        detail: 'Structured explanation a Bar Raiser can follow.',
      },
    ],
    redFlags: [
      'No monitoring or on-call story.',
      'Vague, unowned answers ("we decided") in Leadership Principle questions.',
    ],
    codingScore: {
      budgetMin: 45,
      runsCode: false,
      weights: { correctness: 55, speed: 20, firstTry: 25 },
    },
    sources: [
      'https://interviewing.io/guides/hiring-process/amazon',
      'https://www.aced.io/blog/amazon-system-design-interview',
      'https://designgurus.substack.com/p/amazon-vs-google-vs-meta-the-2026',
    ],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    tagline:
      'Classic coding, object-oriented design, and system design from SDE II up.',
    coding:
      'Classic problems (LRU cache, intervals, trees) plus object-oriented design such as a parking lot or file system. Clean decomposition matters as much as the algorithm.',
    design:
      'Mostly for SDE II and above. Expect trade-offs on cost and performance and a collaborative, discussion-style round.',
    designEmphasis: [
      {
        area: 'Decomposition',
        weight: 30,
        detail:
          'Breaks the system into clear components with well-defined responsibilities.',
      },
      {
        area: 'Cost and performance trade-offs',
        weight: 25,
        detail: 'Compares options on cost, latency and complexity.',
      },
      {
        area: 'Data model and interfaces',
        weight: 20,
        detail: 'Clean class or service interfaces and a sensible schema.',
      },
      {
        area: 'Reliability',
        weight: 15,
        detail: 'Failure handling and consistency where it matters.',
      },
      {
        area: 'Collaboration',
        weight: 10,
        detail: 'Invites input and builds on interviewer suggestions.',
      },
    ],
    redFlags: ['Monolithic designs with no clear boundaries.'],
    codingScore: {
      budgetMin: 45,
      runsCode: true,
      weights: { correctness: 60, speed: 20, firstTry: 20 },
    },
    sources: [
      'https://www.coditioning.com/blog/405/microsoft-swe-system-design-interview',
      'https://getsdeready.com/top-microsoft-interview-questions-2025/',
    ],
  },
  {
    id: 'apple',
    name: 'Apple',
    tagline:
      'Team-run loops with a high code-quality bar, domain depth, and attention to privacy and device limits.',
    coding:
      'Each team runs its own loop and the hiring manager drives the decision. Medium problems with a high bar for idiomatic, clean code. Platform teams may expect Swift or Objective-C.',
    design:
      "Depth in the team's domain. Prep reports stress privacy, on-device processing and battery, memory and bandwidth limits.",
    designEmphasis: [
      {
        area: 'Domain depth',
        weight: 25,
        detail:
          'Detailed knowledge of the problem space and its real constraints.',
      },
      {
        area: 'Privacy and threat model',
        weight: 25,
        detail:
          'Data minimization, encryption, key management and what the server never sees.',
      },
      {
        area: 'Device constraints',
        weight: 20,
        detail: 'Battery, memory, bandwidth and offline behavior.',
      },
      {
        area: 'Correctness and sync',
        weight: 20,
        detail: 'Conflict resolution and consistency across devices.',
      },
      {
        area: 'Quality bar',
        weight: 10,
        detail: 'Polish: staged rollout, testing and edge cases.',
      },
    ],
    redFlags: ['Collecting user data the feature does not need.'],
    codingScore: {
      budgetMin: 45,
      runsCode: true,
      weights: { correctness: 60, speed: 15, firstTry: 25 },
    },
    sources: [
      'https://spacecomplexity.ai/blog/apple-software-engineer-interview',
      'https://customcareer.miami.edu/blog/2026/03/11/apple-system-design-interview-2026-guide/',
    ],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    tagline:
      'Senior-leaning practical coding and design rounds that feel like a design review, heavy on resilience.',
    coding:
      'Practical problems such as a rate limiter or a TTL cache, aimed at senior engineers.',
    design:
      'Feels like a design review with peers. Failure-mode depth decides it: candidates have been rejected for shallow answers on timeouts and degradation. Culture is probed mostly in other rounds.',
    designEmphasis: [
      {
        area: 'Resilience',
        weight: 35,
        detail:
          'Timeouts, retries with backoff, circuit breakers, bulkheads and graceful degradation.',
      },
      {
        area: 'Caching correctness',
        weight: 20,
        detail: 'Stampedes, TTLs, invalidation and cold starts.',
      },
      {
        area: 'Senior judgment',
        weight: 20,
        detail: 'Picks the simplest design that works and owns its risks.',
      },
      {
        area: 'Observability',
        weight: 15,
        detail:
          'Metrics, tracing and how you would find a regional failure fast.',
      },
      {
        area: 'Candor',
        weight: 10,
        detail: 'States weaknesses of the design openly.',
      },
    ],
    redFlags: ['No answer for a dependency that is slow rather than down.'],
    codingScore: {
      budgetMin: 45,
      runsCode: true,
      weights: { correctness: 60, speed: 20, firstTry: 20 },
    },
    sources: [
      'https://designgurus.substack.com/p/netflix-system-design-interview-how',
      'https://ophyai.com/blog/company-guides/netflix-interview-guide',
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    tagline:
      'Practical coding where code runs, a bug-bash round, and design where money must never be lost.',
    coding:
      'One practical question with an unknown number of parts; code is run against tests. Other rounds: a bug bash (fix failing tests in an unfamiliar repo) and an integration round (read real API docs and ship a working feature).',
    design:
      'The bar is correctness on money: invariants, idempotency and retries, raised before the interviewer asks. API design and error semantics are weighted heavily.',
    designEmphasis: [
      {
        area: 'Correctness and invariants',
        weight: 30,
        detail:
          'Money is never created or lost; rounding, double-entry and reconciliation are explicit.',
      },
      {
        area: 'Idempotency and retries',
        weight: 25,
        detail:
          'Idempotency keys and safe retries designed in without prompting.',
      },
      {
        area: 'API design',
        weight: 25,
        detail:
          'Resource model, versioning, pagination and precise error semantics.',
      },
      {
        area: 'Consistency',
        weight: 10,
        detail: 'Where strong consistency is required and how it is achieved.',
      },
      {
        area: 'Clarity',
        weight: 10,
        detail: 'Clear reasoning and precise language.',
      },
    ],
    redFlags: [
      'A retry path that can double-charge.',
      'Vague error handling in the API.',
    ],
    codingScore: {
      budgetMin: 45,
      runsCode: true,
      weights: { correctness: 70, speed: 15, firstTry: 15 },
    },
    sources: [
      'https://www.techinterview.net/questions/stripe-system-design-interview-questions',
      'https://www.teamblind.com/post/stripe-onsite-interview-bug-squash-bqug02mq',
      'https://spacecomplexity.ai/blog/stripe-onsite-interview',
    ],
  },
  {
    id: 'uber',
    name: 'Uber',
    tagline:
      'General and domain coding, machine-coding rounds, and real-time geospatial system design.',
    coding:
      'An online assessment, then general and domain-specific coding. A low-level design or machine-coding round (build a working system in about an hour) is common at L5.',
    design:
      'Real-time and geospatial: dispatch, location ingest, surge. Justify your geo index at L5; handle consistency and GPS dropouts at L6.',
    designEmphasis: [
      {
        area: 'Real-time and geospatial',
        weight: 30,
        detail:
          'Geo indexing (H3, geohash, quadtrees) chosen with reasons; streaming location updates.',
      },
      {
        area: 'Consistency split',
        weight: 25,
        detail:
          'Eventually consistent location data versus strongly consistent state (no double assignment).',
      },
      {
        area: 'Scale and sharding',
        weight: 20,
        detail: 'City or region sharding, hot cells, peak events.',
      },
      {
        area: 'Failure handling',
        weight: 15,
        detail: 'GPS dropouts, partitions and retries.',
      },
      {
        area: 'Collaboration',
        weight: 10,
        detail: 'Works through the problem with the interviewer.',
      },
    ],
    redFlags: ['Scanning every driver for each request.'],
    codingScore: {
      budgetMin: 45,
      runsCode: true,
      weights: { correctness: 60, speed: 25, firstTry: 15 },
    },
    sources: [
      'https://www.aced.io/guides/uber-software-engineer-interview',
      'https://systemdr.systemdrd.com/p/design-uber-dispatch-the-senior-walkthrough',
      'https://techscreen.app/articles/uber-technical-interview-process-2026',
    ],
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    tagline:
      'Code that must compile and pass tests, product-framed design, and a core values round that can veto.',
    coding:
      'Code must run and pass tests in CoderPad; pseudocode does not count. There is also a code-review round.',
    design:
      'Product-framed around guests and hosts: search, booking, calendars. Correctness (no double booking) and product reasoning both count. The core values round can veto an otherwise strong loop.',
    designEmphasis: [
      {
        area: 'Product reasoning',
        weight: 25,
        detail: 'Requirements framed around guest and host experience.',
      },
      {
        area: 'Booking correctness',
        weight: 25,
        detail: 'No double booking: holds, locks or transactions, explained.',
      },
      {
        area: 'Search and data design',
        weight: 20,
        detail:
          'Index and availability filtering that meet the latency target.',
      },
      {
        area: 'Reliability',
        weight: 15,
        detail: 'Payment and booking flow failures handled.',
      },
      {
        area: 'Communication',
        weight: 15,
        detail: 'Clear, collaborative explanation.',
      },
    ],
    redFlags: ['Pseudocode in the coding round.', 'Ignoring the host side.'],
    codingScore: {
      budgetMin: 45,
      runsCode: true,
      weights: { correctness: 70, speed: 15, firstTry: 15 },
    },
    sources: [
      'https://interviewlegend.com/guides/companies/airbnb/overview/process-overview',
      'https://www.interviewquery.com/guides/airbnb-software-engineer',
    ],
  },
];

export const findCompany = (id: string | undefined): Company | undefined =>
  companies.find((c) => c.id === id);

export interface ReadinessInput {
  passed: number;
  total: number;
  /** Minutes from opening the question to this run. */
  minutes: number;
  /** Test runs so far, including this one. */
  runs: number;
}

/**
 * A 0-10 readiness score for one coding attempt, weighted the way the company
 * weights its coding bar. Speed is full marks within the budget and falls to 0
 * at twice it; first-try is full marks for green within 2 runs (or 1 when the
 * company's interview cannot run code) and falls by a step per extra run.
 */
export function codingReadiness(
  c: Company,
  r: ReadinessInput,
): { score: number; correctness: number; speed: number; firstTry: number } {
  const correctness = r.total > 0 ? r.passed / r.total : 0;
  const b = c.codingScore.budgetMin;
  const speed = r.minutes <= b ? 1 : Math.max(0, 1 - (r.minutes - b) / b);
  const free = c.codingScore.runsCode ? 2 : 1;
  const step = c.codingScore.runsCode ? 0.1 : 0.2;
  const firstTry = Math.max(0, 1 - Math.max(0, r.runs - free) * step);
  const w = c.codingScore.weights;
  const raw =
    (correctness * w.correctness + speed * w.speed + firstTry * w.firstTry) /
    (w.correctness + w.speed + w.firstTry);
  // Speed and first-try only count once the solution actually works.
  const score =
    correctness < 1 ? correctness * 10 * (w.correctness / 100) : raw * 10;
  return {
    score: Math.round(score * 10) / 10,
    correctness,
    speed,
    firstTry,
  };
}
