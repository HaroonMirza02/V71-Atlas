import { Queue, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis';
import { IngestJobPayload } from '../types';
import { logger } from '../lib/logger';

// Name of queue
export const INGEST_QUEUE_NAME = 'atlas-ingest';

let ingestQueue: any = null;

/** Get singleton ingestion queue */
export function getIngestQueue(): Queue<IngestJobPayload, any, string> {
    if (ingestQueue) return ingestQueue;

    const redisConnection = getRedisClient(true); // Get client safe for Queue/BullMQ (maxRetriesPerRequest: null)

    ingestQueue = new Queue<IngestJobPayload, any, string>(INGEST_QUEUE_NAME, {
        connection: redisConnection as any,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: 100, // Keep last 100 completed jobs
            removeOnFail: 500, // Keep last 500 failed jobs
        },
    });

    logger.info('Ingestion Queue initialized with BullMQ');
    return ingestQueue;
}

/** Add an ingestion job to the queue manually or programmatically */
export async function addIngestJob(
    connectorId: string,
    trigger: 'SCHEDULER' | 'MANUAL' | 'WEBHOOK',
    requestId: string,
    cursor?: string
): Promise<any> {
    const queue = getIngestQueue();
    const jobName = `ingest:${connectorId}:${Date.now()}`;

    const job = await queue.add(
        jobName,
        {
            connectorId,
            triggeredBy: trigger,
            requestId,
            cursor,
        },
        {
            jobId: `${connectorId}:${cursor || 'root'}:${Date.now().toString().slice(0, -3)}`, // Deduplicate concurrent identical runs
        }
    );

    logger.info('Added ingestion job to BullMQ queue', {
        connectorId,
        trigger,
        requestId,
        jobId: job.id,
    });

    return job;
}
