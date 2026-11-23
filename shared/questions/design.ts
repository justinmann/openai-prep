import { moreDesign } from './more';
import type { DesignQuestion } from './types';

const chatgpt: DesignQuestion = {
  kind: 'design',
  id: 'design-chatgpt',
  title: 'Design ChatGPT',
  tags: ['streaming', 'storage', 'LLM serving'],
  summary:
    'A chat product: conversations, streamed model replies, history across devices.',
  companies: ['openai', 'anthropic'],
  sources: [
    'https://www.coditioning.com/blog/16/openai-system-design-interview-questions',
    'https://www.datainterview.com/blog/anthropic-software-engineer-interview',
  ],
  prompt:
    'Design the backend for a ChatGPT-style chat product. Users hold multi-turn conversations with a model; replies stream token by token; history syncs across devices. Assume a separate team owns the model inference fleet and exposes it as an internal streaming RPC.',
  functional: [
    'Create a conversation, send a message, receive the reply streamed token by token.',
    'List past conversations and reopen one with its full history on any device.',
    'Stop a reply mid-stream; regenerate the last reply.',
    'Conversations longer than the model context window still work.',
  ],
  nonFunctional: [
    'First token in under ~1 s at p50; streaming must survive flaky mobile networks.',
    'Messages are durable once acknowledged; no lost or duplicated turns.',
    'Per-user rate limits and fair use of scarce GPU capacity.',
    'High availability; graceful degradation when inference capacity is short.',
  ],
  scale: [
    '100M weekly users, ~10M concurrent at peak.',
    '~1B messages a day; average reply ~500 tokens.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope, states assumptions, does back-of-envelope QPS / storage / concurrent stream estimates and uses them.',
    },
    {
      id: 'api',
      label: 'API and streaming protocol',
      detail:
        'Defines send/list/get APIs; picks SSE or WebSockets for streaming with reasons; idempotency keys for sends; resume or reconnect for a dropped stream.',
    },
    {
      id: 'data-model',
      label: 'Data model and storage',
      detail:
        'Conversation and message schema, partitioned by user or conversation id; a store suited to append-heavy writes; ordering of messages; tree of messages for regenerate/edit branches.',
    },
    {
      id: 'inference-path',
      label: 'Inference orchestration',
      detail:
        'A chat service that builds the prompt (system prompt, history, truncation or summarization for long context), calls the inference RPC, relays tokens, persists the final reply. Handles cancel. Queueing and admission control in front of GPUs.',
    },
    {
      id: 'reliability',
      label: 'Reliability and failure handling',
      detail:
        'What happens when a stream server, inference node or DB fails mid-reply; partial replies; retries without duplicate turns; multi-region.',
    },
    {
      id: 'scale-capacity',
      label: 'Scaling and capacity',
      detail:
        'Horizontal stateless gateways with sticky stream connections; rate limiting and priority tiers (paid vs free); load shedding; caching where it helps.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Explicitly weighs alternatives (SSE vs WS, SQL vs wide-column, summarize vs truncate) and explains choices.',
    },
  ],
  followUps: [
    'A user has two tabs open and sends from both. What happens?',
    'How do you resume a stream after the phone switches from Wi-Fi to LTE?',
    'Inference capacity drops by 40%. What does the system do?',
    'How would you add conversation search?',
  ],
};

const inferenceApi: DesignQuestion = {
  kind: 'design',
  id: 'design-inference-api',
  title: 'Design an LLM Inference API',
  tags: ['GPU', 'batching', 'rate limiting'],
  summary:
    'A public completions API over a GPU fleet: routing, batching, quotas, multiple models.',
  companies: ['anthropic', 'openai'],
  sources: [
    'https://prachub.com/interview-questions/design-a-batched-llm-inference-service-assuming-each-batch-takes-100-ms',
    'https://prachub.com/companies/anthropic/categories/system-design',
  ],
  prompt:
    'Design a public API that serves completions from several large language models running on a GPU fleet. Customers authenticate with API keys, call a completions endpoint (optionally streaming), and are billed per token.',
  functional: [
    'POST a completion request for a named model; optional streaming.',
    'Per-organization rate limits in requests/min and tokens/min, by tier.',
    'Usage is metered per request (input + output tokens) for billing.',
    'Rolling out a new model version without downtime.',
  ],
  nonFunctional: [
    'Maximize GPU utilization while meeting latency targets (time to first token, tokens/sec).',
    'Isolation: one customer cannot starve others.',
    'High availability across regions; requests never billed twice.',
  ],
  scale: [
    '~50k requests/sec at peak, mixed short and very long prompts.',
    'Thousands of GPUs across several regions; GPU memory is the binding constraint.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Scope, assumptions, rough GPU math (tokens/sec per GPU, concurrent sequences) driving fleet size.',
    },
    {
      id: 'request-path',
      label: 'Request path',
      detail:
        'Gateway: auth, API key lookup (cached), validation, token counting; router to a model pool; streaming back to the client.',
    },
    {
      id: 'rate-limiting',
      label: 'Rate limiting and quotas',
      detail:
        'Distributed token-bucket or sliding window per org for RPM and TPM; estimating output tokens up front and reconciling later; where counters live (Redis etc.) and consistency trade-offs.',
    },
    {
      id: 'scheduling',
      label: 'Scheduling and batching',
      detail:
        'Queue per model; continuous batching; KV-cache memory as the constraint; prefill vs decode; fairness across tenants; priority tiers; load shedding with 429s.',
    },
    {
      id: 'metering',
      label: 'Metering and billing',
      detail:
        'Emit usage events after completion to a durable log; idempotent aggregation; reconcile with partial or cancelled streams.',
    },
    {
      id: 'deploys',
      label: 'Model rollout and capacity',
      detail:
        'Weights loading time, canary/shadow traffic, autoscaling limits for GPUs, multi-region failover.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Latency vs throughput (batch size), strict vs approximate limits, cost of over-provisioning.',
    },
  ],
  followUps: [
    'A customer sends 200k-token prompts. How does that affect batching and fairness?',
    'Rate-limit counters live in one Redis. It goes down. What happens?',
    'How do you avoid billing a request whose stream the client cancelled?',
  ],
};

const webhooks: DesignQuestion = {
  kind: 'design',
  id: 'design-webhooks',
  title: 'Design a Webhook Delivery System',
  tags: ['queues', 'retries', 'at-least-once'],
  summary:
    'Deliver events to customer endpoints reliably, with retries, ordering and isolation.',
  companies: ['openai', 'stripe'],
  sources: [
    'https://prachub.com/interview-questions/design-webhook-poi-chat-ci-cd-payments',
    'https://www.techinterview.net/questions/stripe-system-design-interview-questions',
  ],
  prompt:
    'Internal services emit events (for example "fine-tuning job finished"). Customers register HTTPS endpoints and subscribe to event types. Design the system that delivers each event to every subscribed endpoint.',
  functional: [
    'Register, update and delete endpoints with event-type filters.',
    'Deliver events with a signed payload; retry failures with backoff for up to 3 days.',
    'Customers can see delivery attempts and manually replay an event.',
  ],
  nonFunctional: [
    'At-least-once delivery; no event lost once accepted.',
    'A slow or dead customer endpoint must not delay other customers.',
    'Delivery within seconds in the normal case.',
  ],
  scale: [
    '~20k events/sec at peak, fan-out up to 10 endpoints per event.',
    'Some endpoints take 30 s to respond or are down for days.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Delivery semantics clarified; throughput and retry-storage estimates.',
    },
    {
      id: 'ingest',
      label: 'Ingestion and durability',
      detail:
        'Producers write to a durable log/queue (e.g. Kafka) or transactional outbox; events persisted before ack.',
    },
    {
      id: 'fanout',
      label: 'Fan-out and dispatch',
      detail:
        'Subscription lookup (cached), per-delivery records, workers that POST with timeouts, HMAC signatures with timestamps to prevent replay.',
    },
    {
      id: 'retries',
      label: 'Retries and backoff',
      detail:
        'Exponential backoff with jitter, delayed-retry scheduling (delay queues or a scheduled store), dead-lettering after max age, endpoint auto-disable.',
    },
    {
      id: 'isolation',
      label: 'Isolation (noisy neighbours)',
      detail:
        'Per-endpoint queues or concurrency limits, circuit breakers, separating slow endpoints so head-of-line blocking does not spread.',
    },
    {
      id: 'idempotency',
      label: 'Idempotency and ordering',
      detail:
        'Event ids for receiver dedupe; explains ordering is not guaranteed or how per-key ordering could be offered and at what cost.',
    },
    {
      id: 'observability',
      label: 'Observability and replay',
      detail:
        'Attempt log, customer-facing dashboard, manual replay, alerting.',
    },
  ],
  followUps: [
    'One big customer endpoint goes down for a day. Trace what happens to their backlog and to everyone else.',
    'How does a receiver verify a webhook really came from you?',
    'Customer asks for strict ordering per job id. What changes?',
  ],
};

const meteringBilling: DesignQuestion = {
  kind: 'design',
  id: 'design-usage-billing',
  title: 'Design Usage Metering and Billing',
  tags: ['event streaming', 'aggregation', 'correctness'],
  summary:
    'Count API usage accurately at high volume and turn it into invoices and spend limits.',
  companies: ['anthropic', 'stripe', 'openai'],
  sources: [
    'https://extrabrain.app/interview-questions/anthropic-system-design-interview-extrabrain/',
    'https://ophyai.com/blog/company-guides/stripe-interview-guide',
  ],
  prompt:
    'Every API request produces usage (model, input tokens, output tokens, org). Design the system that records usage, shows customers near-real-time spend, enforces hard spend limits, and produces correct monthly invoices.',
  functional: [
    'Record usage for every request.',
    'Usage dashboard per org, per model, per day, fresh within ~1 minute.',
    'Hard monthly spend limits: block requests once exceeded.',
    'Monthly invoices; price changes take effect at a given time.',
  ],
  nonFunctional: [
    'Invoices are exact: no double counting, no lost usage.',
    'Spend-limit checks add negligible latency to the request path.',
    'Tolerates late and duplicate events.',
  ],
  scale: ['~100k usage events/sec.', 'Millions of orgs.'],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Event volume and storage math; separates real-time view from billing of record.',
    },
    {
      id: 'capture',
      label: 'Event capture',
      detail:
        'Usage events with unique ids emitted to a durable log; outbox or local buffer so a log outage does not drop usage.',
    },
    {
      id: 'aggregation',
      label: 'Aggregation pipeline',
      detail:
        'Stream processing into per-org/per-model/per-window aggregates; dedupe by event id; handling late data via windows and watermarks; batch recompute as source of truth.',
    },
    {
      id: 'limits',
      label: 'Spend limit enforcement',
      detail:
        'Fast cached counter on the request path, accepts small overshoot or reserves budget up front; explains the consistency trade-off.',
    },
    {
      id: 'invoicing',
      label: 'Invoicing and pricing',
      detail:
        'Price versions with effective times applied to raw usage; immutable invoice generation; reconciliation and audit trail.',
    },
    {
      id: 'storage',
      label: 'Storage choices',
      detail:
        'Raw events in cheap columnar/object storage, aggregates in an OLAP or KV store, with reasons.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail: 'Exactness vs latency, approximate real-time vs exact batch.',
    },
  ],
  followUps: [
    'A bug double-emitted events for 2 hours. How do you detect and correct invoices?',
    'An org hits its limit mid-stream on a long completion. What happens?',
  ],
};

const codeSandbox: DesignQuestion = {
  kind: 'design',
  id: 'design-code-sandbox',
  title: 'Design a Code Execution Sandbox',
  tags: ['security', 'isolation', 'scheduling'],
  summary:
    'Run untrusted model-written code safely for many users, with files and stateful sessions.',
  companies: ['openai', 'anthropic'],
  sources: [
    'https://prachub.com/interview-questions/design-a-sandboxed-cloud-ide',
    'https://extrabrain.app/interview-questions/anthropic-system-design-interview-extrabrain/',
  ],
  prompt:
    'The assistant can write and run Python for users (data analysis, plots, file conversion). Design the service that executes this untrusted code. Sessions are stateful: variables and uploaded files persist across several executions in one conversation.',
  functional: [
    'Create a session, execute code, return stdout/stderr, generated files and images.',
    'Upload files into a session; download produced files.',
    'Sessions persist state across executions for up to an hour of inactivity.',
  ],
  nonFunctional: [
    'Strong isolation: code cannot reach other sessions, internal networks or the host.',
    'Cold start for a new session under ~1-2 s.',
    'CPU, memory, disk and wall-time limits per execution.',
  ],
  scale: [
    '~1M sessions a day, ~50k concurrent.',
    'Executions mostly short; some run minutes.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail: 'Concurrency and memory math for the fleet; threat model stated.',
    },
    {
      id: 'isolation',
      label: 'Isolation technology',
      detail:
        'Compares containers, gVisor, Firecracker microVMs; picks one with reasons; seccomp, no privileged access, read-only base images.',
    },
    {
      id: 'network',
      label: 'Network and data exfiltration',
      detail:
        'Egress denied or proxied with allowlists; no metadata endpoint access; per-session network namespace.',
    },
    {
      id: 'lifecycle',
      label: 'Session lifecycle and scheduling',
      detail:
        'Warm pools to hit cold-start targets, session routing to the same sandbox (sticky), idle reaping, state snapshot or loss semantics on host failure.',
    },
    {
      id: 'limits',
      label: 'Resource limits',
      detail:
        'cgroups for CPU/memory, disk quotas, timeouts, killing runaway processes, output size caps.',
    },
    {
      id: 'files',
      label: 'File handling',
      detail:
        'Uploads/outputs via object storage with scoped, expiring URLs; scanning; size limits.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail: 'Isolation strength vs startup latency vs density and cost.',
    },
  ],
  followUps: [
    'A user runs a fork bomb. Walk through what contains it.',
    'The host running a session dies. What does the user see?',
    'How would you support installing pip packages?',
  ],
};

const cicd: DesignQuestion = {
  kind: 'design',
  id: 'design-ci-cd',
  title: 'Design a CI/CD System',
  tags: ['scheduling', 'DAGs', 'workers'],
  summary:
    'Run build/test pipelines on every push across a shared worker fleet, then deploy.',
  companies: ['openai', 'microsoft'],
  sources: [
    'https://www.coditioning.com/blog/16/openai-system-design-interview-questions',
    'https://prachub.com/interview-questions/design-webhook-poi-chat-ci-cd-payments',
  ],
  prompt:
    'Design a CI/CD system for a company with a large monorepo. Every push triggers a pipeline: a DAG of jobs (build, unit tests sharded across machines, integration tests, deploy). Engineers watch logs live.',
  functional: [
    'Trigger pipelines on push/PR via webhook; pipeline defined as a DAG in a repo config file.',
    'Schedule jobs onto workers; stream logs live; store artifacts.',
    'Retry flaky jobs, cancel superseded pipelines on the same branch.',
    'Deploy stage with manual approval and rollback.',
  ],
  nonFunctional: [
    'Queue time under a minute at peak.',
    'A worker crash never loses a pipeline; jobs are retried elsewhere.',
    'Efficient fleet usage (autoscaling, caching).',
  ],
  scale: [
    '~5k engineers, ~20k pipelines a day, ~500k jobs a day.',
    'Peak 3x average during work hours.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail: 'Jobs/sec, concurrent workers needed, log and artifact volume.',
    },
    {
      id: 'orchestration',
      label: 'Pipeline orchestration',
      detail:
        'Parses config into a DAG, state machine per job persisted in a DB, dispatch when dependencies succeed, idempotent transitions.',
    },
    {
      id: 'scheduling',
      label: 'Job scheduling and workers',
      detail:
        'Queue with leases/heartbeats so crashed workers release jobs; worker pools by capability; autoscaling; priority (main branch vs PRs).',
    },
    {
      id: 'logs-artifacts',
      label: 'Logs and artifacts',
      detail:
        'Live log streaming via a pub/sub fan-out, chunks persisted to object storage; artifact store; build caches.',
    },
    {
      id: 'deploy',
      label: 'Deployment safety',
      detail:
        'Approvals, progressive rollout or canaries, health checks, automated rollback.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail: 'Push vs pull dispatch, warm pools vs cost, caching correctness.',
    },
  ],
  followUps: [
    'A worker dies 20 minutes into a 30-minute test shard. What happens?',
    'How do you prevent a PR from exfiltrating deploy secrets?',
    'How would you detect and quarantine flaky tests?',
  ],
};

const gpuScheduler: DesignQuestion = {
  kind: 'design',
  id: 'design-gpu-scheduler',
  title: 'Design a GPU Training Job Scheduler',
  tags: ['scheduling', 'fault tolerance', 'quotas'],
  summary:
    'Share a large GPU cluster among research teams, with gang scheduling, quotas and preemption.',
  companies: ['openai', 'google', 'amazon'],
  sources: [
    'https://prachub.com/interview-questions/design-gpu-credit-allocator',
    'https://prachub.com/companies/google/categories/system-design',
    'https://designgurus.substack.com/p/amazon-vs-google-vs-meta-the-2026',
  ],
  prompt:
    'Researchers submit training jobs that need anywhere from 1 to 4,096 GPUs, all at once (gang scheduled). Design the scheduler for a shared cluster used by many teams.',
  functional: [
    'Submit a job with GPU count, priority, and team; see queue position and status.',
    'Gang scheduling: a job starts only when all its GPUs are available.',
    'Team quotas with borrowing of idle capacity; higher priority can preempt.',
    'Jobs checkpoint and resume after preemption or hardware failure.',
  ],
  nonFunctional: [
    'High cluster utilization.',
    'Topology awareness: a job prefers GPUs in the same rack / network domain.',
    'Scheduler itself is highly available.',
  ],
  scale: [
    '~25k GPUs, ~3k nodes; hundreds of queued jobs.',
    'GPU or node failures several times a day at this size.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail: 'Clarifies job mix, failure rate math, what utilization means.',
    },
    {
      id: 'state',
      label: 'Cluster state and API',
      detail:
        'Node inventory with health and topology, job store, submission API; scheduler as a control loop over desired vs actual state.',
    },
    {
      id: 'algorithm',
      label: 'Scheduling algorithm',
      detail:
        'Gang scheduling without deadlock (reserve or all-or-nothing), avoiding starvation of large jobs (backfilling with reservations), topology-aware placement, bin-packing small jobs.',
    },
    {
      id: 'fairness',
      label: 'Quotas, fairness, preemption',
      detail:
        'Team quotas, borrowing idle capacity, preemption policy with grace period for checkpointing.',
    },
    {
      id: 'faults',
      label: 'Fault tolerance',
      detail:
        'Node health checks, draining bad nodes, restart from checkpoint, spare capacity; scheduler HA via leader election and persisted state.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Utilization vs wait time, preemption cost, simplicity vs optimality.',
    },
  ],
  followUps: [
    'A 2,048-GPU job has waited 3 days behind a stream of small jobs. Fix it.',
    'One GPU in a 1,024-GPU job fails. What happens next?',
  ],
};

const crawlerDesign: DesignQuestion = {
  kind: 'design',
  id: 'design-web-crawler',
  title: 'Design a Distributed Web Crawler',
  tags: ['crawling', 'dedupe', 'politeness'],
  summary:
    'Crawl billions of pages for a training corpus, politely and without duplicates.',
  companies: ['anthropic', 'google', 'amazon'],
  sources: [
    'https://www.intervue.io/blog/anthropic-interview-guide',
    'https://prachub.com/companies/google/categories/system-design',
  ],
  prompt:
    'Design a crawler that collects public web pages to build a text dataset. It should discover new pages, re-crawl changed ones, respect site owners, and store cleaned text for downstream processing.',
  functional: [
    'Start from seed URLs, extract links, keep crawling.',
    'Respect robots.txt and a per-domain crawl rate.',
    'Store raw HTML and extracted text; skip duplicate and near-duplicate content.',
    'Re-crawl pages on a schedule based on how often they change.',
  ],
  nonFunctional: [
    'Throughput of billions of pages per month.',
    'Fault tolerant: workers can die without losing or double-processing much work.',
    'Never overload a single site.',
  ],
  scale: ['~10B pages a month (~4k pages/sec).', 'Average page ~100 KB raw.'],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Pages/sec, bandwidth, storage per month; uses them to size the fleet.',
    },
    {
      id: 'frontier',
      label: 'URL frontier',
      detail:
        'Prioritized frontier partitioned by host so one worker owns a host; per-host queues with politeness delays; persisted, not only in memory.',
    },
    {
      id: 'dedupe',
      label: 'Deduplication',
      detail:
        'URL normalization + seen-set (Bloom filter or KV); content hash for exact dupes; SimHash/MinHash for near-dupes.',
    },
    {
      id: 'fetch',
      label: 'Fetching and politeness',
      detail:
        'robots.txt caching, DNS caching, timeouts, crawl-delay, user agent, handling traps (infinite calendars, session ids).',
    },
    {
      id: 'storage',
      label: 'Storage and processing',
      detail:
        'Raw pages to object storage (WARC-like), metadata DB, extraction pipeline decoupled by a queue.',
    },
    {
      id: 'recrawl',
      label: 'Re-crawl and freshness',
      detail:
        'Change-rate estimation, conditional GETs (ETag/If-Modified-Since), scheduling.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Freshness vs coverage, exact vs probabilistic dedupe, BFS vs priority.',
    },
  ],
  followUps: [
    'How do you stop the crawler getting stuck in an infinite URL space?',
    'A worker owning 50k hosts dies. What happens to those hosts?',
  ],
};

export const designQuestions: DesignQuestion[] = [
  chatgpt,
  inferenceApi,
  webhooks,
  meteringBilling,
  codeSandbox,
  cicd,
  gpuScheduler,
  crawlerDesign,
  ...moreDesign,
];
