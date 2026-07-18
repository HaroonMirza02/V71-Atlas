// ─────────────────────────────────────────────────────────────
//  Core Types — Project Atlas
//  All domain-level TypeScript interfaces live here.
// ─────────────────────────────────────────────────────────────

// ── Connector Abstraction ─────────────────────────────────────

export type RawRecord = Record<string, unknown>;

export interface NormalizedRecord {
    /** Unique hash of source + external ID for deduplication */
    dedupHash: string;
    /** Which connector produced this record */
    sourceId: string;
    /** Connector-specific external identifier */
    externalId: string;
    /** Human-readable title */
    title: string;
    /** Description / body text */
    description: string;
    /** Canonical category */
    category: SignalCategory;
    /** URL pointing to the original resource */
    url: string;
    /** Tags extracted or inferred from the record */
    tags: string[];
    /** Technologies mentioned */
    technologies: string[];
    /** Company name if applicable */
    company?: string;
    /** Location if applicable */
    location?: string;
    /** Monetary value if applicable (e.g. job salary, contract budget) */
    budget?: number;
    /** Currency code */
    currency?: string;
    /** Original publication date from the source */
    publishedAt?: Date;
    /** Extra source-specific metadata (stored but not indexed) */
    metadata: Record<string, unknown>;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export interface RateLimitPolicy {
    /** Maximum requests per window */
    requestsPerWindow: number;
    /** Window size in milliseconds */
    windowMs: number;
    /** Whether to use adaptive throttling */
    adaptive: boolean;
}

export interface ConnectorHealth {
    connectorId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: Date;
    latencyMs?: number;
    error?: string;
}

export interface FetchResult {
    records: NormalizedRecord[];
    nextCursor?: string;
    hasMore: boolean;
    fetchedAt: Date;
}

export interface SourceConnector {
    /** Unique stable identifier for this connector */
    readonly sourceId: string;
    /** Human-readable display name */
    readonly displayName: string;
    /** Fetch a batch of records, optionally from a cursor position */
    fetchBatch(cursor?: string): Promise<FetchResult>;
    /** Transform a raw source payload into our canonical form */
    normalize(raw: RawRecord): NormalizedRecord;
    /** Validate a normalized record before persisting */
    validate(record: NormalizedRecord): ValidationResult;
    /** Return rate-limiting policy for scheduling */
    getRateLimitPolicy(): RateLimitPolicy;
    /** Check if the upstream source is reachable */
    healthCheck(): Promise<ConnectorHealth>;
}

// ── Domain Enumerations ───────────────────────────────────────

export type SignalCategory =
    | 'TECHNOLOGY_TREND'
    | 'BUSINESS_OPPORTUNITY'
    | 'PAIN_POINT'
    | 'POTENTIAL_CLIENT'
    | 'JOB_POSTING'
    | 'OPEN_SOURCE'
    | 'PRODUCT_LAUNCH'
    | 'MARKET_NEWS'
    | 'FUNDING'
    | 'OTHER';

export type SignalStatus =
    | 'PENDING'
    | 'ENRICHED'
    | 'REVIEWED'
    | 'ARCHIVED'
    | 'REJECTED';

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

// ── Queue Job Payloads ────────────────────────────────────────

export interface IngestJobPayload {
    connectorId: string;
    cursor?: string;
    triggeredBy: 'SCHEDULER' | 'MANUAL' | 'WEBHOOK';
    requestId: string;
}

export interface EnrichJobPayload {
    signalId: string;
    requestId: string;
}

// ── API Types ─────────────────────────────────────────────────

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        cursor?: string;
        hasMore: boolean;
        total?: number;
        limit: number;
    };
    meta: {
        requestId: string;
        timestamp: string;
    };
}

export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        requestId?: string;
    };
}

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'down';
    version: string;
    uptime: number;
    timestamp: string;
    services: {
        database: 'ok' | 'error';
        redis: 'ok' | 'error';
        queues: 'ok' | 'error';
    };
}

// ── Auth Types ────────────────────────────────────────────────

export interface JwtPayload {
    userId: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// ── Audit ─────────────────────────────────────────────────────

export interface AuditEvent {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    timestamp: Date;
}

// ── Metrics ───────────────────────────────────────────────────

export interface ConnectorMetrics {
    connectorId: string;
    totalFetched: number;
    totalNormalized: number;
    totalRejected: number;
    lastRunAt?: Date;
    lastRunDurationMs?: number;
    errorCount: number;
}
