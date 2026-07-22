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
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // 1. Signal distribution counts & time-framed metrics
        const [statusCounts, categoryCounts, totalSignals, ingestedToday, ingestedThisWeek, qualifiedThisWeek] = await Promise.all([
            Signal.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            Signal.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
            Signal.countDocuments(),
            Signal.countDocuments({ discoveredAt: { $gte: twentyFourHoursAgo } }),
            Signal.countDocuments({ discoveredAt: { $gte: sevenDaysAgo } }),
            Signal.countDocuments({ status: 'REVIEWED', updatedAt: { $gte: sevenDaysAgo } }),
        ]);

        // Top category this week
        const weekCategoryCounts = await Signal.aggregate([
            { $match: { discoveredAt: { $gte: sevenDaysAgo } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        const topCatItem = weekCategoryCounts[0];
        const topCategoryThisWeek = topCatItem ? {
            category: topCatItem._id,
            count: topCatItem.count,
            percentage: ingestedThisWeek > 0 ? Math.round((topCatItem.count / ingestedThisWeek) * 100) : 0
        } : null;

        // Daily volume for the last 14 days
        const dailyVolumeData = await Signal.aggregate([
            { $match: { discoveredAt: { $gte: fourteenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$discoveredAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const dailyVolume = dailyVolumeData.map(item => ({
            date: item._id,
            count: item.count
        }));

        // Global top technologies overall across all signals in database
        const topTechsData = await Signal.aggregate([
            { $unwind: '$technologies' },
            { $group: { _id: '$technologies', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
        ]);

        const topTechnologies = topTechsData
            .map((item) => ({
                technology: item._id,
                count: item.count,
            }))
            .filter((item) => item.technology && item.technology !== 'Go');

        const signalStats = {
            byStatus: statusCounts.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byCategory: categoryCounts.reduce((acc: any, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            totalSignals,
            ingestedToday,
            ingestedThisWeek,
            qualifiedThisWeek,
            topCategoryThisWeek,
            dailyVolume,
            topTechnologies,
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
