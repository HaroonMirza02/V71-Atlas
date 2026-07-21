import app from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './lib/database';
import { getRedisClient, disconnectRedis } from './lib/redis';
import { logger } from './lib/logger';
import { registry } from './connectors';
import { startIngestWorker } from './queues/ingest.worker';
import { startScheduler, stopScheduler } from './services/scheduler';

let serverInstance: any;

async function bootstrap() {
    logger.info('Project Atlas backend bootstrapping...');

    try {
        // 1. Database Connection
        await connectDatabase();

        // 2. Clear / test Redis setup
        const redis = getRedisClient();
        await redis.ping();
        logger.info('Redis connection verified via PING');

        // 3. Register and Sync connectors
        await registry.syncStatesToDB();

        // 4. Start Queues and Workers
        const worker = startIngestWorker();
        logger.info('BullMQ Ingestion Worker spawned successfully', {
            concurrency: config.QUEUE_CONCURRENCY,
        });

        // 5. Start Crons
        await startScheduler();

        // 6. Bind Express Listener
        const PORT = config.PORT || 5000;
        serverInstance = app.listen(PORT as number, '0.0.0.0', () => {
            logger.info(`🚀 Project Atlas REST API server running on port ${PORT}`, {
                env: config.NODE_ENV,
                version: '1.0.0',
                apiRoot: `/api/${config.API_VERSION}`,
            });
        });

    } catch (err: any) {
        logger.error('CRITICAL: Bootstrapping failed. System shutting down...', {
            error: err.message,
            stack: err.stack,
        });
        process.exit(1);
    }
}

// Graceful release shutdowns
async function shutdown(signal: string) {
    logger.info(`Shutting down system gracefully on signal: ${signal}...`);

    // Stop Crons
    stopScheduler();

    // Close Server Listener
    if (serverInstance) {
        serverInstance.close(() => {
            logger.info('HTTP Server stopped accepting requests.');
        });
    }

    try {
        // Disconnect Redis client releases
        await disconnectRedis();

        // Disconnect Mongoose/MongoDB connections
        await disconnectDatabase();

        logger.info('System shutdown complete. Exiting gracefully.');
        process.exit(0);
    } catch (err: any) {
        logger.error('Errors occurred during shutdown processes', { error: err.message });
        process.exit(1);
    }
}

// Bind to lifecycle signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Trigger Bootstrap execution
bootstrap();
