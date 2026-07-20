# Database

MongoDB, five collections. All timestamps are UTC.

## signals

The canonical, source-agnostic entity. Every source's data lands here in the same shape, regardless of whether it came from GitHub, RSS, or a future source like government tenders.

| Field | Purpose |
|---|---|
| dedupHash | Unique. SHA-256 of `sourceId::externalId`. This is what prevents the same item from being ingested twice. |
| sourceId | Which connector produced this record. |
| externalId | The source's own identifier for the record. |
| rawPayloadId | Reference to the untouched original payload in `raw_payloads`. |
| title, description | Canonical display fields. |
| category | One of TECHNOLOGY_TREND, BUSINESS_OPPORTUNITY, PAIN_POINT, POTENTIAL_CLIENT, JOB_POSTING, OPEN_SOURCE, PRODUCT_LAUNCH, MARKET_NEWS, FUNDING, OTHER. Inferred from keyword matching at ingestion time. |
| status | PENDING, ENRICHED, REVIEWED, ARCHIVED, or REJECTED. Starts at PENDING, moves to REVIEWED/ARCHIVED/REJECTED through the review endpoint. |
| url | Link back to the original resource. |
| tags, technologies | Arrays used for filtering. |
| company, location, budget, currency | Optional, populated when the source provides them (mainly job postings). |
| publishedAt | The source's own publication date, where available. |
| discoveredAt | When Atlas first saw this record. Drives the default sort order and pagination cursor. |
| lastSeenAt | Updated every time a duplicate of this record is ingested again, so a still-active listing is distinguishable from one that has disappeared from its source. |
| reviewedBy, reviewedAt, reviewNotes | Populated by the review endpoint. |

Indexes: `sourceId`, `discoveredAt` descending, `category`, `status`, `tags`, `technologies`, `publishedAt` descending, a compound `sourceId + status`, a compound `category + status + discoveredAt`, and a text index across `title`, `description`, `tags`, `technologies` for full text search. Every field the API filters or sorts by is indexed; this is what keeps `GET /signals` fast as the collection grows past 100,000 or 1,000,000 records rather than degrading into full collection scans.

## raw_payloads

The untouched original record from the source, exactly as received, before normalization. Kept separately from `signals` so nothing source-specific is ever lost even though the canonical schema is uniform. Unique compound index on `sourceId + externalId`.

## connector_states

One document per connector, tracking operational state: last run, last success, last error and its message, consecutive error count, lifetime fetched and ingested counts, whether the connector is currently enabled, and its schedule interval. This is what the scheduler reads to decide what to run and what `GET /connectors` reports to the API.

## users

Authentication and role data. Passwords are hashed with bcrypt (12 rounds) before storage and are never returned in any API response (`select: false` on the schema field, and stripped again in `toJSON`). Unique index on `email`.

## audit_logs

Append-only record of who did what, when, to which resource, and whether it succeeded. Written for every login attempt (success or failure), registration, user creation, signal review, connector trigger, connector state change, and backup export or restore. Indexed by `userId + timestamp`, `resource + timestamp`, and `requestId` for tracing. Entries expire automatically after 365 days via a TTL index, rather than growing without bound.

## Why this shape scales

The design that makes 100 to 1,000,000+ records work without rebuilding is: a normalized canonical schema instead of one table per source, indexes on every field that filtering or sorting depends on, a unique constraint that makes duplicate ingestion structurally impossible rather than something the application layer has to remember to check, and cursor based pagination that stays a direct indexed lookup no matter how deep into the result set a client pages.
