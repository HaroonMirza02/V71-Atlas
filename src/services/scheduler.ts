import cron from 'node-cron';
import { registry } from '../connectors';
import { addIngestJob } from '../queues/ingest.queue';
import { ConnectorState } from '../models/ConnectorState';
import { logger } from '../lib/logger';
import { uuid } from '../utils/uuid'; // we'll write this simple helper next

let cronJobs: any[] = [];

/**
 * Start the recurring scheduler.
 * Finds all active, enabled connectors in the database/registry and
 * schedules their ingestion tasks according to their configured interval.
 */
export async function startScheduler(): Promise<void> {
    // Clear any existing active cron runs
    stopScheduler();

    logger.info('Starting Project Atlas scheduler...');

    // Read all connectors from registry
    const connectors = registry.getAll();

    for (const connector of connectors) {
        try {
            const state = await ConnectorState.findOne({ connectorId: connector.sourceId });
            if (!state) {
                logger.warn(`No connector state found for scheduler entry: ${connector.sourceId}`);
                continue;
            }

            if (!state.isEnabled) {
                logger.info(`Connector ${connector.sourceId} is disabled by configuration. Skipping scheduling.`);
                continue;
            }

            // Convert ms interval to cron expression
            // Default: 3600000ms (1hr) -> run at minute 0 every hour: '0 * * * *'
            // Standard intervals fallback: run every 30m, 1h, or 12h
            const intervalMs = state.scheduleIntervalMs;
            let cronExpression = '0 * * * *'; // default hourly

            if (intervalMs <= 1800000) {
                // Under 30 minutes: run twice an hour (e.g. */30)
                cronExpression = '*/30 * * * *';
            } else if (intervalMs >= 43200000) {
                // 12 hours or above: run twice a day (00:00 and 12:00)
                cronExpression = '0 */12 * * *';
            }

            logger.info(`Scheduling connector job cron`, {
                connectorId: connector.sourceId,
                intervalMs,
                cronExpression,
            });

            const task = cron.schedule(cronExpression, async () => {
                const requestId = `sched-${uuid().slice(0, 8)}`;
                logger.info('Scheduled cron execution triggered for connector', {
                    connectorId: connector.sourceId,
                    requestId,
                });
                try {
                    await addIngestJob(connector.sourceId, 'SCHEDULER', requestId);
                } catch (err: any) {
                    logger.error('Failed to dispatch scheduled job to queue', {
                        connectorId: connector.sourceId,
                        error: err.message,
                        requestId,
                    });
                }
            });

            cronJobs.push(task);
        } catch (err: any) {
            logger.error('Failed to configure schedule for connector', {
                connectorId: connector.sourceId,
                error: err.message,
            });
        }
    }

    logger.info(`Scheduler completed activation. Total active crons: ${cronJobs.length}`);
}

/** Stop all running cron schedulers */
export function stopScheduler(): void {
    if (cronJobs.length > 0) {
        cronJobs.forEach((job) => job.stop());
        cronJobs = [];
        logger.info('All scheduler jobs stopped.');
    }
}
