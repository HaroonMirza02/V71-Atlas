import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../lib/redis';
import { IngestJobPayload, NormalizedRecord } from '../types';
import { registry } from '../connectors';
import { ConnectorState } from '../models/ConnectorState';
import { Signal, RawPayload } from '../models/Signal';
import { logger } from '../lib/logger';
import { addIngestJob, INGEST_QUEUE_NAME } from './ingest.queue';
import { config } from '../config';
import mongoose from 'mongoose';

let worker: Worker<IngestJobPayload> | null = null;

export function startIngestWorker(): Worker<IngestJobPayload> {
    if (worker) return worker;

    const redisConnection = getRedisClient(true);

    worker = new Worker<IngestJobPayload>(
        INGEST_QUEUE_NAME,
        async (job: Job<IngestJobPayload>) => {
            const { connectorId, cursor, triggeredBy, requestId } = job.data;
            const jobLogger = logger.child({ jobId: job.id, connectorId, requestId });

            jobLogger.info('Ingest job started processing', { cursor, triggeredBy });

            const connector = registry.get(connectorId);
            const state = await ConnectorState.findOne({ connectorId });

            if (!state) {
                throw new Error(`Connector state not initialized in DB for: ${connectorId}`);
            }

            if (!state.isEnabled && triggeredBy !== 'MANUAL') {
                jobLogger.info('Connector is disabled. Skipping execution.');
                return;
            }

            // Update state to running
            state.lastRunAt = new Date();
            await state.save();

            const startTime = Date.now();

            try {
                // Fetch raw batch
                const fetchResult = await connector.fetchBatch(cursor);
                jobLogger.info(`Fetched batch from connector`, {
                    count: fetchResult.records.length,
                    hasMore: fetchResult.hasMore,
                    nextCursor: fetchResult.nextCursor,
                });

                let successCount = 0;
                let rejectCount = 0;

                for (const record of fetchResult.records) {
                    try {
                        // Validate first
                        const valResult = connector.validate(record);
                        if (!valResult.valid) {
                            rejectCount++;
                            jobLogger.warn('Validation failed for record', {
                                externalId: record.externalId,
                                errors: valResult.errors,
                            });
                            continue;
                        }

                        // Persistence helper: transactional raw writing check
                        const transactionSession = await mongoose.startSession();
                        await transactionSession.withTransaction(async () => {
                            // Try finding existing signal
                            const existingSignal = await Signal.findOne({ dedupHash: record.dedupHash }).session(transactionSession);

                            if (existingSignal) {
                                // Update timestamp for pagination tracking
                                existingSignal.lastSeenAt = new Date();
                                await existingSignal.save({ session: transactionSession });
                                successCount++;
                            } else {
                                // Save raw payload
                                const rawDb = new RawPayload({
                                    sourceId: record.sourceId,
                                    externalId: record.externalId,
                                    payload: record.metadata, // Keep raw metadata key lists
                                    connectorVersion: '1.0.0',
                                });
                                await rawDb.save({ session: transactionSession });

                                // Link and save signal
                                const signalDb = new Signal({
                                    ...record,
                                    rawPayloadId: rawDb._id,
                                    discoveredAt: new Date(),
                                    lastSeenAt: new Date(),
                                    status: 'PENDING',
                                });
                                await signalDb.save({ session: transactionSession });
                                successCount++;
                            }
                        });
                        await transactionSession.endSession();
                    } catch (err: any) {
                        rejectCount++;
                        jobLogger.error('Failed to process individual normalized record', {
                            externalId: record.externalId,
                            error: err.message,
                        });
                    }
                }

                // Update state on success
                state.lastSuccessAt = new Date();
                state.consecutiveErrors = 0;
                state.lastCursor = fetchResult.nextCursor;
                state.totalRecordsFetched += fetchResult.records.length;
                state.totalRecordsIngested += successCount;
                state.lastError = undefined;
                await state.save();

                jobLogger.info(`Successfully completed connector batch processing`, {
                    durationMs: Date.now() - startTime,
                    insertedCount: successCount,
                    rejectedCount: rejectCount,
                });

                // Trigger asynchronous pagination page queue chaining if hasMore is true
                if (fetchResult.hasMore && fetchResult.nextCursor) {
                    jobLogger.info(`Enqueueing next page via cursor`, { nextCursor: fetchResult.nextCursor });
                    const delay = connector.getRateLimitPolicy().windowMs / Math.max(1, connector.getRateLimitPolicy().requestsPerWindow);

                    // Wait slightly to respect rate limit policies before adding next page job
                    setTimeout(async () => {
                        try {
                            await addIngestJob(connectorId, triggeredBy, requestId, fetchResult.nextCursor);
                        } catch (err: any) {
                            jobLogger.error('Failed to enqueue paginated job page', { error: err.message });
                        }
                    }, Math.max(100, delay));
                }

            } catch (err: any) {
                // Record failure state
                state.lastErrorAt = new Date();
                state.lastError = err.message;
                state.consecutiveErrors += 1;
                await state.save();

                jobLogger.error('Job error processing connector', {
                    error: err.message,
                    consecutiveErrors: state.consecutiveErrors,
                });

                throw err; // Trigger standard retry logic or DLQ
            }
        },
        {
            connection: redisConnection,
            concurrency: config.QUEUE_CONCURRENCY,
        }
    );

    worker.on('failed', (job, err) => {
        logger.error('Queue Ingest Worker Job Failed', { jobId: job?.id, error: err.message });
    });

    return worker;
}
