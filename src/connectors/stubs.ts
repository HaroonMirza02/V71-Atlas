import { BaseConnector } from './base.connector';
import { RawRecord, NormalizedRecord, RateLimitPolicy, ConnectorHealth, FetchResult } from '../types';

export class UpworkStubConnector extends BaseConnector {
    readonly sourceId = 'upwork-stub';
    readonly displayName = 'Upwork (Stub)';

    async fetchBatch(_cursor?: string): Promise<FetchResult> {
        // Stub return empty
        return { records: [], hasMore: false, fetchedAt: new Date() };
    }

    normalize(raw: RawRecord): NormalizedRecord {
        return {
            dedupHash: this.buildHash(String(raw.id || '')),
            sourceId: this.sourceId,
            externalId: String(raw.id || ''),
            title: String(raw.title || ''),
            description: String(raw.description || ''),
            category: 'JOB_POSTING',
            url: String(raw.url || ''),
            tags: ['upwork', 'stub'],
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

export class LinkedInStubConnector extends BaseConnector {
    readonly sourceId = 'linkedin-stub';
    readonly displayName = 'LinkedIn (Stub)';

    async fetchBatch(_cursor?: string): Promise<FetchResult> {
        return { records: [], hasMore: false, fetchedAt: new Date() };
    }

    normalize(raw: RawRecord): NormalizedRecord {
        return {
            dedupHash: this.buildHash(String(raw.id || '')),
            sourceId: this.sourceId,
            externalId: String(raw.id || ''),
            title: String(raw.title || ''),
            description: String(raw.description || ''),
            category: 'POTENTIAL_CLIENT',
            url: String(raw.url || ''),
            tags: ['linkedin', 'stub'],
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

export class FreelancerStubConnector extends BaseConnector {
    readonly sourceId = 'freelancer-stub';
    readonly displayName = 'Freelancer (Stub)';

    async fetchBatch(_cursor?: string): Promise<FetchResult> {
        return { records: [], hasMore: false, fetchedAt: new Date() };
    }

    normalize(raw: RawRecord): NormalizedRecord {
        return {
            dedupHash: this.buildHash(String(raw.id || '')),
            sourceId: this.sourceId,
            externalId: String(raw.id || ''),
            title: String(raw.title || ''),
            description: String(raw.description || ''),
            category: 'JOB_POSTING',
            url: String(raw.url || ''),
            tags: ['freelancer', 'stub'],
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

export class ProductHuntStubConnector extends BaseConnector {
    readonly sourceId = 'producthunt-stub';
    readonly displayName = 'Product Hunt (Stub)';

    async fetchBatch(_cursor?: string): Promise<FetchResult> {
        return { records: [], hasMore: false, fetchedAt: new Date() };
    }

    normalize(raw: RawRecord): NormalizedRecord {
        return {
            dedupHash: this.buildHash(String(raw.id || '')),
            sourceId: this.sourceId,
            externalId: String(raw.id || ''),
            title: String(raw.title || ''),
            description: String(raw.description || ''),
            category: 'PRODUCT_LAUNCH',
            url: String(raw.url || ''),
            tags: ['producthunt', 'stub'],
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
