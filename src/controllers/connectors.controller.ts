import { Request, Response } from 'express';
import { registry } from '../connectors';
import { ConnectorState } from '../models/ConnectorState';
import { addIngestJob } from '../queues/ingest.queue';
import { logger, auditLog } from '../lib/logger';
import { uuid } from '../utils/uuid';

export async function getConnectors(req: Request, res: Response): Promise<void> {
    try {
        // Fetch DB states
        const states = await ConnectorState.find();
        const stateMap = new Map(states.map((s) => [s.connectorId, s]));

        // Fetch registered connectors list
        const registered = registry.getAll();
        const result = registered.map((connector) => {
            const dbState = stateMap.get(connector.sourceId);

            return {
                id: connector.sourceId,
                displayName: connector.displayName,
                rateLimitPolicy: connector.getRateLimitPolicy(),
                // DB states fallback
                isEnabled: dbState?.isEnabled ?? true,
                scheduleIntervalMs: dbState?.scheduleIntervalMs ?? 3600000,
                lastRunAt: dbState?.lastRunAt,
                lastSuccessAt: dbState?.lastSuccessAt,
                lastErrorAt: dbState?.lastErrorAt,
                lastError: dbState?.lastError,
                totalRecordsFetched: dbState?.totalRecordsFetched ?? 0,
                totalRecordsIngested: dbState?.totalRecordsIngested ?? 0,
                consecutiveErrors: dbState?.consecutiveErrors ?? 0,
            };
        });

        res.json({ data: result });
    } catch (err: any) {
        logger.error('Failed to list connectors telemetry', { error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Failed to access connectors data' },
        });
    }
}

export async function triggerConnector(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    if (!registry.has(id)) {
        res.status(404).json({
            error: { code: 'CONNECTOR_NOT_FOUND', message: `Connector with ID "${id}" is not registered in the system` },
        });
        return;
    }

    const requestId = `trig-${uuid().slice(0, 8)}`;

    try {
        const job = await addIngestJob(id, 'MANUAL', requestId);

        // Audit log
        auditLog({
            userId: req.user!.id,
            action: 'TRIGGER_CONNECTOR',
            resource: 'connector',
            resourceId: id,
            outcome: 'success',
            details: { jobId: job.id, requestId },
        });

        res.json({
            message: `Enqueued manual ingestion job for connector "${id}" successfully`,
            data: {
                jobId: job.id,
                connectorId: id,
                requestId,
            },
        });
    } catch (err: any) {
        logger.error('Failed to trigger connector manually', { id, error: err.message });

        auditLog({
            userId: req.user!.id,
            action: 'TRIGGER_CONNECTOR',
            resource: 'connector',
            resourceId: id,
            outcome: 'failure',
            details: { error: err.message, requestId },
        });

        res.status(500).json({
            error: { code: 'QUEUE_ERROR', message: `Failed to dispatch job to queue: ${err.message}` },
        });
    }
}

export async function updateConnectorState(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const { isEnabled, scheduleIntervalMs } = req.body;

    if (!registry.has(id)) {
        res.status(404).json({
            error: { code: 'CONNECTOR_NOT_FOUND', message: `Connector with ID "${id}" is not registered` },
        });
        return;
    }

    try {
        const state = await ConnectorState.findOne({ connectorId: id });
        if (!state) {
            res.status(404).json({
                error: { code: 'STATE_NOT_FOUND', message: `Connector state details missing for ID "${id}"` },
            });
            return;
        }

        const beforeState = state.toJSON();

        if (isEnabled !== undefined) state.isEnabled = !!isEnabled;
        if (scheduleIntervalMs !== undefined && typeof scheduleIntervalMs === 'number') {
            state.scheduleIntervalMs = scheduleIntervalMs;
        }

        await state.save();

        // Audit log
        auditLog({
            userId: req.user!.id,
            action: 'UPDATE_CONNECTOR_STATE',
            resource: 'connector',
            resourceId: id,
            outcome: 'success',
            details: {
                before: { isEnabled: beforeState.isEnabled, scheduleIntervalMs: beforeState.scheduleIntervalMs },
                after: { isEnabled: state.isEnabled, scheduleIntervalMs: state.scheduleIntervalMs },
            },
        });

        res.json({
            message: `Connector state updated successfully`,
            data: state,
        });
    } catch (err: any) {
        logger.error('Failed to update connector configuration', { id, error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Failed to update connector state configuration' },
        });
    }
}
