# Architecture

## How a record flows through the system

1. A cron schedule (`src/services/scheduler.ts`) or a manual trigger (`POST /connectors/:id/trigger`) adds a job to the `atlas-ingest` BullMQ queue via `addIngestJob()`.
2. The worker (`src/queues/ingest.worker.ts`) picks the job up and calls the matching connector's `fetchBatch()`.
3. The connector returns raw records from its source in whatever shape that source uses.
4. The connector's `normalize()` maps that raw shape into the canonical `NormalizedRecord` shape shared by every source.
5. The worker calls `validate()` on each normalized record. Anything that fails validation is logged and skipped, not silently dropped and not allowed to break the batch.
6. Valid records are deduplicated by `dedupHash` (a hash of source id plus external id). A record seen before updates its `lastSeenAt` timestamp. A new record is written to `raw_payloads` (the untouched original payload) and `signals` (the canonical, searchable entity), inside a MongoDB transaction so the two writes succeed or fail together.
7. If the source has more pages, the worker enqueues the next page as a new job, spaced according to that connector's own rate limit policy.
8. Connector state (last run, last success, last error, totals, consecutive errors) is written to `connector_states` after every run, whether it succeeded or failed.
9. Clients read signals through the versioned REST API (`/api/v1/signals`), which is authenticated, permission checked, cached, and paginated.

## Why a connector abstraction

The brief is explicit that this system must not be designed around any single source. Concretely, that means:

- There is no `upwork_jobs` table and no `UpworkService`. There is one `Signal` model and one `SourceConnector` interface.
- Adding a new source is: write a class that implements `SourceConnector`, register it once in `src/connectors/index.ts`. Nothing else in the database, queue, worker, or API layer changes. See `docs/CONNECTORS.md` for the walkthrough.
- Four real connectors currently prove this: GitHub, RSS, Remotive, and HackerNews. Four more (Upwork, LinkedIn, Freelancer, Product Hunt) exist as stub connectors, ready to have their `fetchBatch()` filled in once credentials are available, without touching anything else.

## Why a queue instead of synchronous fetching

Scraping and API calls to external sources are slow, rate limited, and occasionally fail. None of that can happen inside an HTTP request or the API becomes unusable. Every fetch happens in a background worker, triggered by either a schedule or a manual action, and the worker is horizontally scalable — running more worker processes increases throughput without any code change.

## Why MongoDB with a canonical schema instead of one table per source

Signals from GitHub, job boards, and RSS feeds do not share a natural relational shape. A single `Signal` collection with a fixed canonical set of fields (title, description, category, tags, technologies, company, location, budget) covers what every source has in common. Anything source-specific that does not fit the canonical shape is preserved untouched in `raw_payloads`, linked by `rawPayloadId`, so no information is lost even though the searchable layer stays uniform.

## Why cursor pagination instead of offset pagination

Offset pagination (`skip`/`limit`) gets slower as the offset grows, because the database still has to walk past every skipped row. At the scale this system is meant to reach (100,000 to 1,000,000+ signals), that cost becomes real. Cursor pagination (`discoveredAt` plus `_id` as a tie-breaker) stays fast regardless of how deep into the result set a client pages, because it is a direct indexed lookup rather than a walk.

## Where the current design would start to strain

A single MongoDB instance with the indexes described in `docs/DATABASE.md` comfortably handles the 100 to 1,000,000 record range this sprint targets. Past several million records, or once query patterns diversify beyond what the current indexes cover, the next steps would be: read replicas for the API's read-heavy traffic, and a dedicated search engine such as OpenSearch or Elasticsearch for the free-text search endpoint, which MongoDB's built-in text index is a reasonable but not permanent answer for. Neither is needed at this sprint's scale, and building them now would be premature.

## Authentication and authorization

Authentication is JWT based: a short-lived access token and a longer-lived refresh token, issued on login. Authorization is role based and implemented as data, not as scattered if-statements: `src/middleware/auth.ts` holds a single `ROLE_PERMISSIONS` map from role to a list of named permissions (`signals:read`, `signals:write`, `connectors:write`, `users:manage`, and so on). Every write endpoint checks a specific permission through `requirePermission()`, which looks the caller's role up in that map. Adding a new role or changing what a role can do is a change to that one map, not a hunt through every controller.

## Observability

Every request gets a request id (from the client if provided, generated otherwise), attached to `req.requestId` and threaded through to every log line the request produces, including inside the async queue worker that eventually processes any job that request triggered. That is what makes it possible to trace one request end to end across the HTTP-to-queue-to-worker boundary. See `docs/RUNBOOK.md` for how to use this when diagnosing an issue.
