import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';
import { BaseConnector } from './base.connector';

/**
 * A minimal fake connector used only to prove the registry contract in
 * isolation, without pulling in a real network-calling connector or a
 * database connection.
 */
class FakeConnector extends BaseConnector {
    readonly sourceId: string = 'fake-source';
    readonly displayName: string = 'Fake Source (Test Only)';

    async fetchBatch(): Promise<FetchResult> {
        return { records: [], hasMore: false, fetchedAt: new Date() };
    }

    normalize(raw: RawRecord): NormalizedRecord {
        return {
            dedupHash: this.buildHash(String(raw.id)),
            sourceId: this.sourceId,
            externalId: String(raw.id),
            title: String(raw.title || ''),
            description: '',
            category: 'OTHER',
            url: String(raw.url || 'https://example.com'),
            tags: [],
            technologies: [],
            metadata: {},
        };
    }

    getRateLimitPolicy(): RateLimitPolicy {
        return { requestsPerWindow: 10, windowMs: 60000, adaptive: false };
    }

    async healthCheck(): Promise<ConnectorHealth> {
        return { connectorId: this.sourceId, status: 'healthy', lastChecked: new Date() };
    }
}

class FailingHealthConnector extends FakeConnector {
    readonly sourceId = 'failing-source';
    readonly displayName = 'Failing Source (Test Only)';

    async healthCheck(): Promise<ConnectorHealth> {
        throw new Error('simulated connector outage');
    }
}

// Import a fresh registry instance per test file. The real module exports a
// singleton, so we re-require it to get an isolated instance and avoid test
// pollution across files running in the same process.
describe('ConnectorRegistry', () => {
    let registry: any;

    beforeEach(() => {
        jest.resetModules();
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        registry = require('./registry').registry;
    });

    it('registers a connector and retrieves it by sourceId', () => {
        const connector = new FakeConnector();
        registry.register(connector);

        expect(registry.has('fake-source')).toBe(true);
        expect(registry.get('fake-source')).toBe(connector);
    });

    it('throws when registering the same sourceId twice', () => {
        registry.register(new FakeConnector());
        expect(() => registry.register(new FakeConnector())).toThrow(/already registered/);
    });

    it('throws when getting a sourceId that was never registered', () => {
        expect(() => registry.get('does-not-exist')).toThrow(/not found in registry/);
    });

    it('lists every registered connector id', () => {
        registry.register(new FakeConnector());
        expect(registry.getIds()).toEqual(['fake-source']);
    });

    it('isolates a failing connector health check from the others', async () => {
        registry.register(new FakeConnector());
        registry.register(new FailingHealthConnector());

        const results = await registry.healthCheckAll();
        const bySourceId = Object.fromEntries(
            results.map((r: ConnectorHealth) => [r.connectorId, r.status])
        );

        // The failing connector reports unhealthy, but does not prevent the
        // working connector's result from coming back healthy. This is the
        // per-connector failure isolation the brief requires.
        expect(bySourceId['fake-source']).toBe('healthy');
        expect(bySourceId['failing-source']).toBe('unhealthy');
    });
});

describe('BaseConnector shared behavior (via FakeConnector)', () => {
    const connector = new FakeConnector();

    it('rejects a normalized record missing a required field', () => {
        const result = connector.validate({
            dedupHash: '',
            sourceId: 'fake-source',
            externalId: '',
            title: '',
            description: '',
            category: 'OTHER',
            url: 'not-a-url',
            tags: [],
            technologies: [],
            metadata: {},
        });

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts a fully-formed normalized record', () => {
        const record = connector.normalize({ id: '42', title: 'Test Signal', url: 'https://example.com/42' });
        const result = connector.validate(record);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('produces the same dedup hash for the same source and external id', () => {
        const a = connector.normalize({ id: '42', title: 'A' });
        const b = connector.normalize({ id: '42', title: 'A different title' });

        // Same externalId must dedup together regardless of other field
        // differences, since dedup is keyed on sourceId + externalId only.
        expect(a.dedupHash).toBe(b.dedupHash);
    });

    it('produces a different dedup hash for a different external id', () => {
        const a = connector.normalize({ id: '42' });
        const b = connector.normalize({ id: '43' });

        expect(a.dedupHash).not.toBe(b.dedupHash);
    });
});
