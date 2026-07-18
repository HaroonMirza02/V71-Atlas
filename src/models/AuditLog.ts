import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAuditLog extends Document {
    userId: mongoose.Types.ObjectId;
    userEmail: string;
    action: string;
    resource: string;
    resourceId?: string;
    httpMethod?: string;
    path?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    outcome: 'success' | 'failure';
    details?: Record<string, unknown>;
    timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userEmail: { type: String, required: true },
        action: { type: String, required: true },
        resource: { type: String, required: true },
        resourceId: { type: String },
        httpMethod: { type: String },
        path: { type: String },
        ipAddress: { type: String },
        userAgent: { type: String },
        requestId: { type: String },
        outcome: { type: String, enum: ['success', 'failure'], required: true },
        details: { type: Schema.Types.Mixed },
        timestamp: { type: Date, required: true, default: Date.now },
    },
    {
        timestamps: false,
        collection: 'audit_logs',
        // TTL: auto-delete logs after 365 days
        expireAfterSeconds: undefined,
    }
);

AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ requestId: 1 });
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog: Model<IAuditLog> = mongoose.model('AuditLog', AuditLogSchema);
