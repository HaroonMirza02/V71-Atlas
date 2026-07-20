# Adding a new source connector

This is the proof that the plug-in claim in the architecture document actually holds. Adding a source is two steps.

## Step 1: implement the interface

Create a new file in `src/connectors/`, extending `BaseConnector`:

```ts
import { BaseConnector } from './base.connector';
import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';

export class MyNewConnector extends BaseConnector {
    readonly sourceId = 'my-new-source';
    readonly displayName = 'My New Source';

    async fetchBatch(cursor?: string): Promise<FetchResult> {
        // Call the source's API or feed, using `cursor` to know where you
        // left off. Return the raw records plus a nextCursor if there is
        // more to fetch, or hasMore: false when done.
    }

    normalize(raw: RawRecord): NormalizedRecord {
        // Map the source's own field names into the canonical shape.
        // this.inferCategory(text) and this.extractTechnologies(text) are
        // available from BaseConnector if useful.
    }

    getRateLimitPolicy(): RateLimitPolicy {
        // Whatever the source's own documented limit is.
    }

    async healthCheck(): Promise<ConnectorHealth> {
        // A cheap call that proves the source is reachable right now.
    }
}
```

`BaseConnector` already provides default field validation (`validate()`), so most connectors do not need to override it unless the source needs stricter checks.

## Step 2: register it

In `src/connectors/index.ts`:

```ts
import { MyNewConnector } from './my-new.connector';
registry.register(new MyNewConnector());
```

That is the entire integration. Nothing in the database schema, the queue, the worker, the scheduler, or the API layer changes. The worker calls whatever connector the registry hands it through the same interface every other connector uses. The scheduler picks it up automatically once its `ConnectorState` document is created on next boot (`registry.syncStatesToDB()` runs at startup and creates a state document for any connector that does not already have one).

## Reference implementations

- `src/connectors/github.connector.ts` — REST API with a bearer token, cursor is a page number.
- `src/connectors/rss.connector.ts` — feed parsing, cursor steps through a list of configured feed URLs.
- `src/connectors/remotive.connector.ts` — REST API with no auth, cursor steps through job categories.
- `src/connectors/hn.connector.ts` — REST API with no auth, cursor is a page number.
- `src/connectors/stubs.ts` — four connectors (Upwork, LinkedIn, Freelancer, Product Hunt) with the interface fully wired but `fetchBatch()` returning empty until real credentials and API access are available. Filling in the stub is the entire remaining task for each of those sources.

## Credentials

Never hardcode a source's API key or client secret. Add it to `.env.example` as a placeholder and to `.env` with the real value, read it through `src/config/index.ts`, and if it needs to be stored (not just read from environment at request time), encrypt it first with `encryptSecret()` from `src/lib/encryption.ts` before writing it to the database.
