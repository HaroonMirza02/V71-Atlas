import mongoose, { Document, Schema, Model } from 'mongoose';
import { SignalCategory, SignalStatus } from '../types';
import crypto from 'crypto';

// ── Raw Payload (preserves the original source record verbatim) ─

export interface IRawPayload extends Document {
    sourceId: string;
    externalId: string;
    fetchedAt: Date;
    payload: Record<string, unknown>;
    connectorVersion: string;
}

const RawPayloadSchema = new Schema<IRawPayload>(
    {
        sourceId: { type: String, required: true, index: true },
        externalId: { type: String, required: true },
        fetchedAt: { type: Date, required: true, default: Date.now },
        payload: { type: Schema.Types.Mixed, required: true },
        connectorVersion: { type: String, default: '1.0.0' },
    },
    { timestamps: false, collection: 'raw_payloads' }
);

RawPayloadSchema.index({ sourceId: 1, externalId: 1 }, { unique: true });
export const RawPayload: Model<IRawPayload> = mongoose.model('RawPayload', RawPayloadSchema);

// ── Signal (canonical, source-agnostic entity) ─────────────────

export interface ISignal extends Document {
    dedupHash: string;
    sourceId: string;
    externalId: string;
    rawPayloadId?: mongoose.Types.ObjectId;
    title: string;
    description: string;
    category: SignalCategory;
    status: SignalStatus;
    url: string;
    tags: string[];
    technologies: string[];
    company?: string;
    location?: string;
    budget?: number;
    currency?: string;
    publishedAt?: Date;
    discoveredAt: Date;
    lastSeenAt: Date;
    metadata: Record<string, unknown>;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewNotes?: string;
}

const SignalSchema = new Schema<ISignal>(
    {
        dedupHash: { type: String, required: true, unique: true },
        sourceId: { type: String, required: true },
        externalId: { type: String, required: true },
        rawPayloadId: { type: Schema.Types.ObjectId, ref: 'RawPayload' },
        title: { type: String, required: true, maxlength: 500 },
        description: { type: String, default: '' },
        category: {
            type: String,
            required: true,
            enum: [
                'TECHNOLOGY_TREND', 'BUSINESS_OPPORTUNITY', 'PAIN_POINT',
                'POTENTIAL_CLIENT', 'JOB_POSTING', 'OPEN_SOURCE',
                'PRODUCT_LAUNCH', 'MARKET_NEWS', 'FUNDING', 'OTHER',
            ],
        },
        status: {
            type: String,
            required: true,
            enum: ['PENDING', 'ENRICHED', 'REVIEWED', 'ARCHIVED', 'REJECTED'],
            default: 'PENDING',
        },
        url: { type: String, required: true },
        tags: [{ type: String }],
        technologies: [{ type: String }],
        company: { type: String },
        location: { type: String },
        budget: { type: Number },
        currency: { type: String, maxlength: 3 },
        publishedAt: { type: Date },
        discoveredAt: { type: Date, required: true, default: Date.now },
        lastSeenAt: { type: Date, required: true, default: Date.now },
        metadata: { type: Schema.Types.Mixed, default: {} },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: { type: Date },
        reviewNotes: { type: String },
    },
    { timestamps: true, collection: 'signals' }
);

// ── Indexes (all search/filter fields indexed) ─────────────────
SignalSchema.index({ sourceId: 1 });
SignalSchema.index({ discoveredAt: -1 });
SignalSchema.index({ category: 1 });
SignalSchema.index({ status: 1 });
SignalSchema.index({ tags: 1 });
SignalSchema.index({ technologies: 1 });
SignalSchema.index({ publishedAt: -1 });
SignalSchema.index({ sourceId: 1, status: 1 });
SignalSchema.index({ category: 1, status: 1, discoveredAt: -1 });
// Full-text search index
SignalSchema.index({ title: 'text', description: 'text', tags: 'text', technologies: 'text' });

/** Generate a deterministic dedup hash from sourceId + externalId */
export function buildDedupHash(sourceId: string, externalId: string): string {
    return crypto.createHash('sha256').update(`${sourceId}::${externalId}`).digest('hex');
}

export const Signal: Model<ISignal> = mongoose.model('Signal', SignalSchema);
