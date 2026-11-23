import type { DesignQuestion } from '../types';

const rateLimiter: DesignQuestion = {
  kind: 'design',
  id: 'design-rate-limiter',
  title: 'Design a Distributed Rate Limiter',
  tags: ['rate limiting', 'counters', 'API gateway'],
  summary:
    'Enforce per-customer and global request limits across a fleet of API gateways with sub-ms overhead.',
  companies: ['stripe', 'amazon', 'google', 'netflix'],
  sources: [
    'https://www.techinterview.net/questions/stripe-system-design-interview-questions',
  ],
  prompt:
    'A public API is fronted by about 100 stateless gateway nodes. Design the rate limiting layer that enforces per-customer limits (for example 100 requests/sec per API key, with a higher tier for enterprise plans) and global limits per endpoint, rejecting excess traffic with HTTP 429. Rules are configured by an internal team and change without redeploys.',
  functional: [
    'Enforce per-API-key limits and per-endpoint global limits, each with its own window and burst allowance.',
    'Rejected requests get 429 with Retry-After and X-RateLimit-Limit / Remaining / Reset headers; allowed requests carry the same headers.',
    'Rules (key, endpoint, tier, limit, window) are managed through a config API and take effect within seconds.',
    'Support temporary overrides for a single customer (raise during a migration, lower during abuse).',
  ],
  nonFunctional: [
    'Under 1 ms added latency at p99 on the request path.',
    'Limits enforced within a few percent of the configured value across the whole fleet, not per node.',
    'An explicit, per-rule choice of fail-open or fail-closed when the counter store is unavailable.',
    'Highly available; the limiter must never be the reason the API is down.',
  ],
  scale: [
    '1M requests/sec total across ~100 gateway nodes (~10K/sec per node).',
    '~5M active API keys; a handful of keys produce 5-10% of all traffic.',
    'Deployed in 3 regions; a customer may hit any region.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies limit types, windows and accuracy needs; estimates counter ops/sec (about 1M+ increments/sec), memory for ~5M keys x rules, and per-node QPS, and lets those numbers drive the design.',
    },
    {
      id: 'algorithm',
      label: 'Algorithm choice',
      detail:
        'Compares fixed window (boundary bursts), sliding log (memory heavy), sliding window counter (approximation by weighting two buckets) and token bucket (burst plus refill); picks one with reasons and states its exact state per key (e.g. tokens + last refill timestamp).',
    },
    {
      id: 'counter-placement',
      label: 'Shared vs local counters',
      detail:
        'Where counters live: central store (Redis cluster sharded by key) with atomic ops or a Lua script, vs local in-memory counters with periodic sync or pre-allocated quota leases per node; quantifies the accuracy vs latency trade, and keeps the hot path to one round trip or zero.',
    },
    {
      id: 'hot-keys',
      label: 'Hot keys and global limits',
      detail:
        'Handles the few keys with huge traffic: local pre-check or lease-based batching, splitting a key across shards and summing, or local token buckets with a share of the global budget; explains how a per-endpoint global limit avoids a single hot counter.',
    },
    {
      id: 'failure-modes',
      label: 'Failure modes',
      detail:
        'Counter store slow or down: short timeouts, fall back to local approximate limiting, fail-open for normal traffic and fail-closed for expensive or abuse-sensitive endpoints; circuit breaker so the limiter does not add latency during an outage; clock skew between nodes.',
    },
    {
      id: 'config-multiregion',
      label: 'Rule config and multi-region',
      detail:
        'Rules stored centrally, pushed or polled and cached in each gateway with versioning; per-region counters with a budget split or async cross-region reconciliation, and an honest statement of how far over the limit a customer can get by spraying regions.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Explicitly weighs exactness vs latency, central vs local counting, fail-open vs fail-closed, and memory per key, and justifies each choice against the requirements.',
    },
  ],
  followUps: [
    'The Redis cluster holding counters loses a shard. What do customers on that shard see?',
    'One customer suddenly sends 200K requests/sec. Walk through what happens on each gateway.',
    'How do you limit by concurrent in-flight requests instead of requests per second?',
    'A customer complains they got 429s while under their limit. How do you debug it?',
    'How would you rate limit by cost (e.g. weighted endpoints) rather than by request count?',
  ],
};

const paymentLedger: DesignQuestion = {
  kind: 'design',
  id: 'design-payment-ledger',
  title: 'Design a Payment Ledger',
  tags: ['double-entry', 'idempotency', 'consistency'],
  summary:
    'A double-entry ledger for charges, refunds and balances where money is never created or lost.',
  companies: ['stripe', 'amazon'],
  sources: [
    'https://www.aced.io/blog/stripe-system-design-interview',
    'https://itcareergym.tech/blog/stripe-system-design/',
  ],
  prompt:
    'Design the ledger at the heart of a payments platform. Merchants charge customers, issue refunds and receive payouts; every movement of money is recorded as balanced double-entry postings, and merchant balances are derived from them. Card network calls happen in a separate service, but the ledger must record their outcomes correctly even when calls are retried or time out.',
  functional: [
    'Record a charge, refund or payout as a transaction made of postings that debit and credit accounts.',
    'Read the current and historical balance of any account (merchant available, pending, fees, platform cash).',
    'Charge and refund APIs are idempotent: retrying with the same idempotency key never moves money twice.',
    'Partial refunds, and reversal of a transaction by a compensating transaction rather than an update.',
    'Produce an audit trail and statements for any account over any date range.',
  ],
  nonFunctional: [
    'Invariant: postings in every transaction sum to zero; money is never created or lost.',
    'Strong consistency on balances; a payout can never take an account negative.',
    'Immutable, append-only records retained for 7 years and auditable.',
    'High availability for writes; clear error semantics when the outcome is unknown.',
  ],
  scale: [
    '10K transactions/sec at peak, ~3 postings each (~30K posting writes/sec).',
    '~300B postings over 7 years of retention; tens of millions of accounts.',
    'A few platform accounts (fees, settlement) touched by nearly every transaction.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies transaction types and consistency needs; estimates postings/sec, row size and 7-year storage (on the order of tens of TB), and identifies hot accounts from the numbers.',
    },
    {
      id: 'data-model',
      label: 'Double-entry data model and invariants',
      detail:
        'Accounts, transactions and postings tables; amounts as integer minor units with currency; each transaction balanced (sum = 0) enforced at write time in one DB transaction; append-only with corrections as reversing entries; balance as derived state with versioning.',
    },
    {
      id: 'idempotency',
      label: 'Idempotency and exactly-once effects',
      detail:
        'Idempotency key table with a unique constraint written in the same transaction as the postings; stores the original response to replay it; states that delivery is at-least-once and exactly-once effect comes from dedupe; handles concurrent retries with the same key.',
    },
    {
      id: 'api-errors',
      label: 'API shape and error semantics',
      detail:
        'Defines charge/refund/balance APIs; distinguishes success, definite failure and unknown outcome (timeout from the card network); a pending state resolved by status polling or webhook; refunds validated against the remaining refundable amount.',
    },
    {
      id: 'balances-sharding',
      label: 'Balances and sharding',
      detail:
        'Shards by account id; avoids cross-shard transactions for the common path; hot platform accounts handled by sub-accounts summed on read or by async rollup; overdraft checks with row locks or conditional updates (balance >= amount) on the debited account.',
    },
    {
      id: 'reconciliation',
      label: 'Reconciliation and audit',
      detail:
        'Daily reconciliation against processor/bank settlement files; continuous checks that all postings sum to zero and balances equal the sum of postings; discrepancy queue for humans; snapshots for fast historical balance; tiered cold storage for old postings.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs relational DB vs distributed SQL vs event log, sync vs async balance updates, and strictness vs throughput on hot accounts, with justification.',
    },
  ],
  followUps: [
    'The card network call times out. Did the customer get charged? What does the ledger record?',
    'Two refund requests for the same charge arrive at once with different idempotency keys. What stops an over-refund?',
    'The platform fee account is written by every transaction and is now the bottleneck. What do you do?',
    'Reconciliation finds a 0.03 USD mismatch with the bank file. How do you find and fix it?',
    'How do you support multi-currency charges with FX conversion?',
  ],
};

const chatApp: DesignQuestion = {
  kind: 'design',
  id: 'design-chat-app',
  title: 'Design a Team Chat App',
  tags: ['WebSockets', 'fan-out', 'ordering'],
  summary:
    'Slack-style chat with channels, DMs, presence, unread counts and offline sync across devices.',
  companies: ['microsoft', 'openai', 'uber', 'meta'],
  sources: [
    'https://www.coditioning.com/blog/16/openai-system-design-interview-questions',
    'https://interviewkickstart.com/blogs/articles/microsoft-system-design-interview-questions',
  ],
  prompt:
    'Design a team chat product for companies. Members of a workspace talk in channels (some with tens of thousands of members) and direct messages, see who is online, and pick up exactly where they left off on any of their devices.',
  functional: [
    'Send and receive messages in channels and DMs in real time.',
    'Scroll back through full message history of any channel the user belongs to.',
    'Presence (online / away) for workspace members.',
    'Per-channel unread counts and mentions, consistent across a user’s devices.',
    'A device that was offline catches up on everything it missed when it reconnects.',
  ],
  nonFunctional: [
    'Delivery to online recipients in under 200 ms at p99 within a region.',
    'Messages in a channel appear in the same order for every member.',
    'No message lost once the sender sees it acknowledged.',
    'Highly available; presence may be approximate.',
  ],
  scale: [
    '20M DAU, ~10M concurrent connections at peak.',
    '1B messages/day (~12K/sec average, ~50K/sec peak); median channel 20 members, largest 100K.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope; estimates messages/sec, fan-out deliveries/sec (messages x online members), concurrent connections and gateway count, and storage per year, and uses them.',
    },
    {
      id: 'connections',
      label: 'Connection layer',
      detail:
        'Persistent WebSocket gateways with a session registry mapping user/device to gateway; heartbeat and reconnect; load balancing; how a message reaches the gateways that hold recipients (pub/sub per channel or routing by user).',
    },
    {
      id: 'ordering-storage',
      label: 'Message storage and ordering',
      detail:
        'Messages keyed by (channel id, sequence) in a wide-column or sharded store; per-channel monotonic sequence assigned by a single writer or channel shard owner; client message ids for idempotent sends; paginated history reads.',
    },
    {
      id: 'fanout',
      label: 'Fan-out strategy',
      detail:
        'Write once, deliver to online members via pub/sub; distinguishes small channels from 100K-member channels (fan out only to subscribed gateways, lazy fetch, rate-limited notifications); push notifications for offline users.',
    },
    {
      id: 'sync-unreads',
      label: 'Offline sync and unread counts',
      detail:
        'Per-user per-channel read cursor (last read sequence) stored server side and synced to devices; unread = latest seq minus cursor; reconnecting device sends its last seen seq per channel and pulls the gap; mention counts tracked separately.',
    },
    {
      id: 'presence',
      label: 'Presence',
      detail:
        'Heartbeat-driven presence in an in-memory store with TTL; only push presence to users who are viewing that person; batching and coarse updates to avoid N^2 fan-out in large workspaces.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs push vs pull for large channels, per-channel total order vs throughput, SQL vs wide-column, and exact vs approximate presence, with reasons.',
    },
  ],
  followUps: [
    'A CEO posts in a 100K-member announcement channel. Walk through the delivery.',
    'A gateway holding 200K connections dies. What happens to those users and in-flight messages?',
    'How do you keep a channel ordered if two users send at the same millisecond from different regions?',
    'How would you add message edits, deletes and reactions without breaking sync?',
    'How do you add full-text search over message history?',
  ],
};

const rideDispatch: DesignQuestion = {
  kind: 'design',
  id: 'design-ride-dispatch',
  title: 'Design Ride-Hailing Dispatch',
  tags: ['geospatial', 'matching', 'state machine'],
  summary:
    'Match riders to nearby drivers in seconds from live GPS, with a trip state machine and surge pricing.',
  companies: ['uber'],
  sources: [
    'https://systemdr.systemdrd.com/p/design-uber-dispatch-the-senior-walkthrough',
    'https://www.techinterview.org/post/3233460273/uber-interview-guide-2026-dispatch-systems-geospatial-algorithms-and-marketplace-engineering/',
  ],
  prompt:
    'Design the dispatch system for a ride-hailing service. Drivers stream their GPS location while online; riders request a ride and should be matched to a good nearby driver within seconds. Cover the trip lifecycle from request to drop-off and how prices rise when demand outstrips supply.',
  functional: [
    'Ingest live location updates from online drivers.',
    'On a ride request, find candidate drivers nearby and offer the trip to one; reassign if they decline or time out.',
    'Track each trip through its states (requested, offered, accepted, arrived, in progress, completed, cancelled).',
    'Compute a surge multiplier per area from current supply and demand.',
  ],
  nonFunctional: [
    'A match offered within a few seconds of the request.',
    'Driver location may be eventually consistent (seconds stale is fine).',
    'Trip state is strongly consistent: a driver is never assigned two trips, a trip never gets two drivers.',
    'Survives the loss of a node or a zone without stranding trips in progress.',
  ],
  scale: [
    '~1M online drivers sending GPS every 4 s (~250K updates/sec).',
    '~20K ride requests/sec at global peak, heavily concentrated in a few dense cities.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope; derives ~250K location writes/sec from 1M drivers / 4 s, request rate, bytes per update and memory for the live index; notes city-level hotspots.',
    },
    {
      id: 'location-index',
      label: 'Location ingest and geospatial index',
      detail:
        'Updates go to an in-memory index (geohash, S2 or H3 cells) sharded by region/cell, overwriting last position with TTL; not written synchronously to a durable DB; nearby search by expanding rings of cells; raw stream to a log for analytics.',
    },
    {
      id: 'matching',
      label: 'Matching',
      detail:
        'Candidate set by cell lookup, ranked by ETA (road network, not straight-line distance), driver rating or acceptance rate; offer to one driver with a short timeout then next; mentions batch matching over a short window for global optimality vs greedy nearest.',
    },
    {
      id: 'trip-state',
      label: 'Trip state machine and no double assignment',
      detail:
        'Explicit states and allowed transitions; driver assignment via conditional write / compare-and-set on driver status (available -> reserved) or a lock with lease; trip records in a strongly consistent store; idempotent transitions from retried client calls.',
    },
    {
      id: 'surge',
      label: 'Surge pricing',
      detail:
        'Aggregates open requests and available drivers per cell over a sliding window via stream processing; smoothed multiplier with caps; price quoted and locked at request time so it does not change mid-booking.',
    },
    {
      id: 'reliability',
      label: 'Reliability and partitioning',
      detail:
        'Shard by city/region so a failure is contained; location index rebuilt quickly from the next round of GPS pings after a node loss; trip state survives because it is durable; driver app keeps trip state locally and resyncs.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs greedy vs batched matching, geohash vs H3/S2, freshness vs write load, and consistency where it matters (trips) vs availability where it does not (locations).',
    },
  ],
  followUps: [
    'Two dispatch servers pick the same driver for two riders at the same moment. What prevents a double assignment?',
    'A stadium concert ends and 30K people request rides from one cell. What breaks first?',
    'How do you handle drivers near a shard boundary between two regions?',
    'The driver accepts but their phone loses connectivity for a minute. What does the rider see?',
    'How would you support pooled rides with multiple riders per trip?',
  ],
};

const bookingSearch: DesignQuestion = {
  kind: 'design',
  id: 'design-booking-search',
  title: 'Design Vacation Rental Search and Booking',
  tags: ['search', 'availability', 'transactions'],
  summary:
    'Search rentals by place, dates and filters, then book them with no double-bookings.',
  companies: ['airbnb'],
  sources: [
    'https://oavoservice.com/en/articles/airbnb-interview-process-complete-guide-coderpad-system-design',
  ],
  prompt:
    'Design search and booking for a vacation rental marketplace. Guests search for homes in an area for specific dates with filters such as price, guests and amenities, then book one. Hosts manage a calendar of available nights and prices, and may also list the same home on other sites.',
  functional: [
    'Search listings by map area or place name, check-in/check-out dates, guest count and filters, sorted by relevance.',
    'Show only listings actually available for every night in the requested range.',
    'Book a listing for a date range; payment is authorized and the stay confirmed or declined.',
    'Hosts block nights, set nightly prices and import external calendars.',
  ],
  nonFunctional: [
    'Search p99 under 300 ms.',
    'Bookings favour correctness over availability: never double-book a night.',
    'Search results may be slightly stale on availability but booking always checks the truth.',
    'Highly available search even during a booking-path incident.',
  ],
  scale: [
    '7M active listings; availability for each over the next 365+ days.',
    '100K searches/sec at peak; ~10K booking attempts/min (search to book ratio around 1000:1).',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope; estimates listing x night availability rows (~2.5B), index size, search QPS vs booking QPS, and notes the read-heavy ratio drives separating the two paths.',
    },
    {
      id: 'search-index',
      label: 'Search index and geo queries',
      detail:
        'Listings in a search engine (Elasticsearch/OpenSearch or custom) with geo fields (geohash or bounding-box) and filter fields; sharded by geography or listing id with scatter-gather; ranking stage after retrieval; caching of popular queries.',
    },
    {
      id: 'availability',
      label: 'Availability in search',
      detail:
        'How date-range availability is filtered: per-night bitmaps or blocked-range lists indexed with the listing, updated from calendar events via CDC/stream; accepts seconds of staleness; re-checks top results against the source of truth before showing or at booking.',
    },
    {
      id: 'booking',
      label: 'Booking without double-booking',
      detail:
        'Source-of-truth calendar in a relational store keyed by (listing, night); booking reserves all nights in one transaction with unique constraints or row locks, or a short-held hold with expiry; payment authorization after the hold, release on failure; idempotency key on the booking request.',
    },
    {
      id: 'calendar-sync',
      label: 'Host calendar and external sync',
      detail:
        'Host edits write to the calendar store and propagate to the index; iCal or channel-manager imports polled periodically; acknowledges the window where an external booking can conflict and how it is resolved (cancellation policy, faster sync).',
    },
    {
      id: 'reliability',
      label: 'Isolation and reliability',
      detail:
        'Search and booking deployed and scaled independently; search degrades (stale cache, fewer filters) rather than failing; booking path fails closed; multi-region read replicas for search, single-writer per listing for bookings.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs freshness vs search latency, optimistic vs pessimistic locking, holds vs direct commit, and geo sharding vs id sharding, with justification.',
    },
  ],
  followUps: [
    'Two guests click Book on the same listing for overlapping dates at the same instant. Walk through it.',
    'A guest searches all of Paris for a weekend. How do you keep that under 300 ms?',
    'A host also lists on another site and gets booked there. How quickly does your calendar know?',
    'Payment authorization takes 8 seconds. Do you hold the nights? What if it fails?',
    'How would you add flexible-date search ("any weekend in June")?',
  ],
};

const adClickAggregator: DesignQuestion = {
  kind: 'design',
  id: 'design-ad-click-aggregator',
  title: 'Design an Ad Click Aggregator',
  tags: ['stream processing', 'aggregation', 'exactly-once'],
  summary:
    'Count ad clicks per ad per minute at billing-grade accuracy, with top-K queries and replay.',
  companies: ['meta', 'amazon', 'google'],
  sources: [
    'https://evanking1.medium.com/top-meta-software-engineer-system-design-product-architecture-interview-questions-cd0bb56777c0',
    'https://www.teamblind.com/post/meta-e6-system-design-interview-questions-qquump5y',
  ],
  prompt:
    'When a user clicks an ad, the click is logged and the user is redirected to the advertiser. Design the system that turns raw click events into per-ad, per-minute counts that advertisers see in dashboards and that billing uses to charge them, plus top-K ads by clicks over recent windows.',
  functional: [
    'Record every click and redirect the user to the advertiser URL.',
    'Per-ad click counts at minute granularity, queryable for any time range and rolled up to hour/day.',
    'Top-K ads by clicks over the last minute, hour and day, optionally per advertiser or country.',
    'Filter invalid traffic (duplicate clicks, bots) before counts are billed.',
  ],
  nonFunctional: [
    'Billing-grade accuracy: counts must eventually be exact, with no double counting.',
    'Dashboard freshness of about 1 minute.',
    'Raw events retained so any window can be recomputed (replayable).',
    'The click redirect stays fast and available even if aggregation is behind.',
  ],
  scale: [
    '10B clicks/day (~115K/sec average, ~400K/sec at peak).',
    '~10M active ads; minute-level counts retained for 2 years.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies accuracy vs freshness; computes average events/sec from 10B/day and sizes for peak, raw event storage per day (~1-2 TB), and aggregate row count (ads x minutes x retention), and lets those numbers drive partition counts and store choice.',
    },
    {
      id: 'ingest',
      label: 'Click capture and ingest',
      detail:
        'Redirect service logs a click with a unique click id (or signed impression id) to a durable log (Kafka/Kinesis) partitioned by ad id, then redirects; never blocks redirect on aggregation; raw events also land in object storage.',
    },
    {
      id: 'stream-aggregation',
      label: 'Stream aggregation',
      detail:
        'Stream processor (Flink or similar) with tumbling one-minute windows keyed by ad id, event-time with watermarks and allowed lateness; checkpointed state; outputs to an OLAP store (Druid/Pinot/ClickHouse) or a wide-column table keyed by (ad, minute).',
    },
    {
      id: 'exactly-once',
      label: 'Dedupe and exactly-once counts',
      detail:
        'Dedupe by click id within a window; exactly-once via checkpointed processing plus transactional or idempotent sinks (upsert by (ad, minute)); explains that at-least-once delivery plus idempotent writes gives exact counts.',
    },
    {
      id: 'top-k',
      label: 'Top-K',
      detail:
        'Per-partition top-K merged globally, or count-min sketch plus heap for approximate real-time top-K with exact batch results later; precomputed for fixed windows rather than computed at query time.',
    },
    {
      id: 'reconciliation',
      label: 'Batch reconciliation and replay',
      detail:
        'Lambda-style or kappa-style: periodic batch job over raw events recomputes counts and corrects the serving store; fraud filtering applied before billing; replay from the log or object storage after a bug fix; hot ads split across partitions with key salting.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs freshness vs accuracy, lambda vs kappa, exact vs approximate top-K, and partitioning by ad id vs random with a second-stage merge, with reasons.',
    },
  ],
  followUps: [
    'A Super Bowl ad receives 30% of all clicks for five minutes. What happens to its partition?',
    'A bug double-counted clicks for six hours yesterday. How do you correct the bills?',
    'Clicks arrive from mobile devices up to an hour late. How do your windows handle them?',
    'How do you detect and exclude a botnet clicking one competitor’s ads?',
  ],
};

const videoStreaming: DesignQuestion = {
  kind: 'design',
  id: 'design-video-streaming',
  title: 'Design a Video Streaming Service',
  tags: ['CDN', 'transcoding', 'resilience'],
  summary:
    'Ingest and transcode a catalog, stream it adaptively worldwide and stay up through regional failures.',
  companies: ['netflix', 'google'],
  sources: [
    'https://designgurus.substack.com/p/netflix-system-design-interview-how',
    'https://prepfully.com/interview-guides/google-software-engineer-system-design-interview',
  ],
  prompt:
    'Design a subscription video streaming service. Studios upload high-quality source files; the service prepares them for every kind of device and network; subscribers browse, press play and watch with adaptive quality, and resume where they left off on another device.',
  functional: [
    'Upload a source video and produce renditions for many resolutions, bitrates and codecs.',
    'Play a title with adaptive bitrate that adjusts to the viewer’s bandwidth.',
    'Save and sync playback position so a viewer can resume on any device.',
    'Browse the catalog and personalized rows on the home screen.',
  ],
  nonFunctional: [
    'Playback starts in under 2 s at p90; rebuffering is rare.',
    'Playback keeps working through the loss of a whole cloud region.',
    'Non-critical features (recommendations, ratings) may degrade without stopping playback.',
    'Cost-efficient egress at very high bandwidth.',
  ],
  scale: [
    '200M subscribers; tens of millions of concurrent streams at evening peak.',
    'Average stream ~5 Mbps, so peak egress on the order of 100+ Tbps; catalog of ~20K titles x ~100 renditions.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope; estimates peak egress (concurrent streams x bitrate), storage per title across renditions, and transcode compute, and concludes egress must be served from edge caches, not origin.',
    },
    {
      id: 'transcoding',
      label: 'Upload and transcoding pipeline',
      detail:
        'Chunked resumable upload to object storage; source split into segments transcoded in parallel by a worker fleet orchestrated as a DAG; encoding ladder per title; packaging into HLS/DASH with manifests; DRM; idempotent, retryable steps.',
    },
    {
      id: 'delivery',
      label: 'CDN and adaptive playback',
      detail:
        'Edge caches inside ISPs or a commercial CDN, pre-positioned with popular content off-peak; playback API returns a manifest and ranked CDN URLs; client ABR algorithm picks bitrate per segment from throughput and buffer; small initial segments and low starting bitrate for fast start.',
    },
    {
      id: 'playback-state',
      label: 'Playback position and metadata',
      detail:
        'Client sends position heartbeats every few seconds to a write-heavy store (wide-column keyed by user + title) with last-write-wins; catalog metadata cached heavily; personalization precomputed offline and served from cache.',
    },
    {
      id: 'resilience',
      label: 'Resilience: timeouts, circuit breakers, degradation',
      detail:
        'Tight timeouts and bounded retries with jitter on every service call; circuit breakers and bulkheads so a failing dependency is isolated; fallbacks (static or cached home rows when recommendations fail); multi-region active-active control plane with traffic evacuation; chaos testing to prove it.',
    },
    {
      id: 'scale-cost',
      label: 'Scaling and cost',
      detail:
        'Control plane stateless and autoscaled; edge capacity planning and cache hit ratio as the key cost lever; per-title encoding to cut bitrate; load shedding of low-priority requests at peak.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs own CDN vs commercial, storage of more renditions vs on-the-fly packaging, startup time vs initial quality, and consistency of watch position vs availability.',
    },
  ],
  followUps: [
    'An entire region hosting the playback API goes dark at 8 pm. What do viewers notice?',
    'A new season of a hit show drops at midnight worldwide. How do you prepare the edges?',
    'The recommendations service starts returning errors 20% of the time. What should the home screen do?',
    'How do you get startup under 2 s on a slow mobile network?',
    'How would you add live streaming of a sports event?',
  ],
};

const collaborativeDocs: DesignQuestion = {
  kind: 'design',
  id: 'design-collaborative-docs',
  title: 'Design a Collaborative Document Editor',
  tags: ['OT', 'CRDT', 'real-time'],
  summary:
    'Google Docs-style real-time co-editing with cursors, version history and offline edits that converge.',
  companies: ['google', 'microsoft'],
  sources: [
    'https://thedesignround.com/interviews/google-system-design',
    'https://prachub.com/companies/google/categories/system-design',
  ],
  prompt:
    'Design a rich-text document editor where many people edit the same document at once. Everyone sees each other’s changes and cursors within moments, users can edit while offline and merge later, and anyone with access can browse and restore earlier versions.',
  functional: [
    'Multiple users edit the same document concurrently and see each other’s changes live.',
    'Show collaborators’ cursors and selections.',
    'Version history: browse named and automatic snapshots and restore one.',
    'Edit offline; changes merge when the device reconnects.',
  ],
  nonFunctional: [
    'All replicas converge to the same document.',
    'Local edits echo in under 100 ms (never wait for the server to type).',
    'No acknowledged edit is ever lost.',
    'Remote changes visible to collaborators within ~500 ms.',
  ],
  scale: [
    'Up to 50 concurrent editors per document; most documents have 1-2.',
    '1B documents total, a few million open at any moment; median document ~50 KB.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope; estimates open documents, ops/sec per document and fleet-wide, storage for documents plus operation history, and notes most documents are cold.',
    },
    {
      id: 'concurrency-model',
      label: 'OT vs CRDT',
      detail:
        'Explains operational transformation (server-ordered ops, transform against concurrent ops) and CRDTs (unique ids per character, commutative merge); compares server dependence, metadata overhead, offline support and implementation complexity; picks one and justifies it.',
    },
    {
      id: 'session-routing',
      label: 'Collaboration session routing',
      detail:
        'Each open document assigned to one session server (consistent hashing or a lease in a coordination service) that orders and broadcasts ops; clients connect over WebSockets; reassignment when that server dies, and how clients rejoin with their last acknowledged revision.',
    },
    {
      id: 'persistence',
      label: 'Persistence and durability',
      detail:
        'Ops appended to a durable log keyed by (doc id, revision) before ack; periodic snapshots so loading does not replay all history; client keeps unacknowledged ops and resends them idempotently with ids; storage tiering for cold documents.',
    },
    {
      id: 'offline-history',
      label: 'Offline edits and version history',
      detail:
        'Offline ops queued locally against a base revision and transformed or merged on reconnect; long divergence handled (large rebase, conflict highlighting); version history from snapshots plus op log; restore as a new forward edit, not a rewrite.',
    },
    {
      id: 'presence',
      label: 'Cursors and presence',
      detail:
        'Cursor positions as ephemeral, non-persisted messages, throttled and transformed with ops so they stay in the right place; presence list per document on the session server.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs OT vs CRDT, single session owner vs peer-to-peer, snapshot frequency vs load time, and op granularity, with reasons.',
    },
  ],
  followUps: [
    'User A deletes a paragraph while user B, offline for a day, edits a sentence inside it. What happens on reconnect?',
    'The session server for a busy document crashes mid-burst. Walk through recovery.',
    'A 500-page document takes 10 s to open. How do you fix it?',
    'How do you add comments anchored to text that keeps changing?',
    'How would permissions changes (revoking an editor) take effect on open sessions?',
  ],
};

const deviceSync: DesignQuestion = {
  kind: 'design',
  id: 'design-device-sync',
  title: 'Design Private Cross-Device Sync',
  tags: ['end-to-end encryption', 'sync', 'privacy'],
  summary:
    'Sync notes and photos across a user’s devices with optional end-to-end encryption and on-device processing.',
  companies: ['apple'],
  sources: [
    'https://customcareer.miami.edu/blog/2026/03/11/apple-system-design-interview-2026-guide/',
  ],
  prompt:
    'Design the service that keeps a user’s notes and photos in sync across their phone, tablet and laptop. Users can turn on an end-to-end-encrypted mode where the server cannot read their content. Features like photo search and face grouping should run on the device wherever possible, and the service should collect as little data about users as it can.',
  functional: [
    'Create, edit and delete notes and photos on any device; changes appear on the user’s other devices.',
    'Optional end-to-end-encrypted mode per user; account recovery that still works in that mode.',
    'Add a new device to the account and bring it up to date.',
    'On-device features such as photo search and face grouping, with results consistent across devices.',
  ],
  nonFunctional: [
    'In E2EE mode, the server never sees plaintext content or keys.',
    'Data minimization: the server keeps only what sync needs; no content analytics.',
    'Respect battery and bandwidth budgets: sync on Wi-Fi and power for large uploads, small deltas otherwise.',
    'Concurrent edits on two offline devices never silently lose data.',
  ],
  scale: [
    '1B devices across ~400M accounts; ~3 devices per account.',
    'Average 20 GB of photos per account; ~5B small note edits and ~2B photo uploads per day.',
  ],
  rubric: [
    {
      id: 'requirements',
      label: 'Requirements and estimates',
      detail:
        'Clarifies scope and privacy goals; estimates total storage (~8 EB at 20 GB x 400M), metadata ops/sec, upload bandwidth per day, and the push fan-out per change (~2 other devices).',
    },
    {
      id: 'threat-model',
      label: 'Threat model',
      detail:
        'States who is defended against: compromised server or insider, network attacker, stolen device; what metadata the server still sees in E2EE mode (sizes, timestamps, counts) and how to reduce it; what is out of scope.',
    },
    {
      id: 'key-management',
      label: 'Key management and recovery',
      detail:
        'Per-item content keys wrapped by a per-account key hierarchy; keys held in device secure hardware; new device enrollment by approval from an existing trusted device; recovery via recovery key, trusted contact, or an HSM-backed escrow with attempt limits; key rotation when a device is removed.',
    },
    {
      id: 'sync-protocol',
      label: 'Sync protocol',
      detail:
        'Per-account change log with monotonically increasing change tokens; devices pull changes since their token after a silent push notification; content-addressed chunked uploads for photos with dedupe and resumability; metadata and blobs stored separately; encrypted records are opaque blobs to the server.',
    },
    {
      id: 'conflicts',
      label: 'Conflict resolution',
      detail:
        'Version vectors or server revision numbers to detect concurrent edits; client-side merge since the server cannot read E2EE content (field-level LWW, CRDT text for notes, or keeping both copies for photos edits); deletes as tombstones so they win correctly.',
    },
    {
      id: 'on-device-rollout',
      label: 'On-device vs server split and staged rollout',
      detail:
        'ML models shipped to devices and run while charging; derived indexes either recomputed per device or synced encrypted; server limited to storage, routing and push; staged rollout of client protocol and models by percentage with kill switches, versioned schemas so old clients keep working.',
    },
    {
      id: 'tradeoffs',
      label: 'Trade-offs',
      detail:
        'Weighs privacy vs features (server-side search and dedupe lost under E2EE), recovery convenience vs security, battery vs freshness, and recompute vs sync of derived data, with reasons.',
    },
  ],
  followUps: [
    'A user loses all their devices and turned on E2EE. What can they recover, and how?',
    'Two offline devices edit the same note. Walk through the merge when both reconnect.',
    'How do you dedupe identical photos across accounts without learning what users store?',
    'A new face-grouping model ships. How do you roll it out without draining batteries or splitting results across devices?',
    'Law enforcement requests a user’s photos. What can the service hand over in each mode?',
  ],
};

export const moreDesign: DesignQuestion[] = [
  rateLimiter,
  paymentLedger,
  chatApp,
  rideDispatch,
  bookingSearch,
  adClickAggregator,
  videoStreaming,
  collaborativeDocs,
  deviceSync,
];
