import { Request, Response } from 'express';
import { Signal } from '../models/Signal';
import { ConnectorState } from '../models/ConnectorState';
import { getIngestQueue } from '../queues/ingest.queue';
import { logger } from '../lib/logger';
import { getRedisStatus } from '../lib/redis';
import { getDatabaseStatus } from '../lib/database';
import { registry } from '../connectors/registry';

export async function getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
        // 1. Signal distribution counts
        const statusCounts = await Signal.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const categoryCounts = await Signal.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const signalStats = {
            byStatus: statusCounts.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byCategory: categoryCounts.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            totalSignals: await Signal.countDocuments(),
        };

        // 2. Connector telemetry states
        const states = await ConnectorState.find();
        const connectorStats = states.map((s) => {
            const registered = registry.has(s.connectorId) ? registry.get(s.connectorId) : null;
            return {
                connectorId: s.connectorId,
                displayName: registered ? registered.displayName : s.connectorId,
                isEnabled: s.isEnabled,
                fetched: s.totalRecordsFetched,
                ingested: s.totalRecordsIngested,
                consecutiveErrors: s.consecutiveErrors,
                lastError: s.lastError,
                lastSuccessAt: s.lastSuccessAt,
                lastRunAt: s.lastRunAt,
            };
        });

        // 3. BullMQ queue details
        let queueStats = {
            waiting: 0,
            active: 0,
            delayed: 0,
            failed: 0,
            completed: 0,
        };

        try {
            const queue = getIngestQueue();
            const [waiting, active, delayed, failed, completed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getDelayedCount(),
                queue.getFailedCount(),
                queue.getCompletedCount(),
            ]);
            queueStats = { waiting, active, delayed, failed, completed };
        } catch (e: any) {
            logger.warn('Failed to parse BullMQ queue telemetry details', { error: e.message });
        }

        // 4. Memory footprint
        const memory = process.memoryUsage();

        res.json({
            timestamp: new Date().toISOString(),
            database: {
                status: getDatabaseStatus(),
            },
            redis: {
                status: getRedisStatus(),
            },
            queue: queueStats,
            signals: signalStats,
            connectors: connectorStats,
            system: {
                heapUsedBytes: memory.heapUsed,
                heapTotalBytes: memory.heapTotal,
                rssBytes: memory.rss,
                externalBytes: memory.external,
                uptimeSeconds: Math.floor(process.uptime()),
            },
        });
    } catch (err: any) {
        logger.error('Failed to aggregate metrics', { error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Failed to access system metrics' },
        });
    }
}
