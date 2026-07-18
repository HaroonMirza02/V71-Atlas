import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IConnectorState extends Document {
    connectorId: string;
    lastCursor?: string;
    lastRunAt?: Date;
    lastSuccessAt?: Date;
    lastErrorAt?: Date;
    lastError?: string;
    consecutiveErrors: number;
    totalRecordsFetched: number;
    totalRecordsIngested: number;
    isEnabled: boolean;
    scheduleIntervalMs: number;
    metadata: Record<string, unknown>;
}

const ConnectorStateSchema = new Schema<IConnectorState>(
    {
        connectorId: { type: String, required: true, unique: true },
        lastCursor: { type: String },
        lastRunAt: { type: Date },
        lastSuccessAt: { type: Date },
        lastErrorAt: { type: Date },
        lastError: { type: String },
        consecutiveErrors: { type: Number, default: 0 },
        totalRecordsFetched: { type: Number, default: 0 },
        totalRecordsIngested: { type: Number, default: 0 },
        isEnabled: { type: Boolean, default: true },
        scheduleIntervalMs: { type: Number, default: 3600000 }, // 1 hour default
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'connector_states' }
);

ConnectorStateSchema.index({ connectorId: 1 }, { unique: true });
ConnectorStateSchema.index({ isEnabled: 1 });

export const ConnectorState: Model<IConnectorState> = mongoose.model('ConnectorState', ConnectorStateSchema);
