import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

let redisClient: Redis | null = null;
let queueRedisClient: Redis | null = null;

/*
// ==========================================
// ORIGINAL REDIS CONNECTION IMPLEMENTATION (COMMENTED OUT)
// ==========================================
export function getRedisConfig(isQueueConnection = false) {
    const commonOptions = {
        maxRetriesPerRequest: isQueueConnection ? null : 3,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy(times: number) {
            const delay = Math.min(times * 300, 5000);
            logger.warn('Redis reconnecting', { attempt: times, delayMs: delay });
            return delay;
        },
    };

    // If REDIS_URI connection string is provided
    if (config.REDIS_URI) {
        // Check if the URI requires SSL/TLS
        const isSsl = config.REDIS_URI.startsWith('rediss://');
        return {
            uri: config.REDIS_URI,
            options: {
                ...commonOptions,
                tls: isSsl ? { rejectUnauthorized: false } : undefined,
            },
        };
    }

    // Fallback to host/port
    return {
        options: {
            ...commonOptions,
            host: config.REDIS_HOST,
            port: config.REDIS_PORT,
            password: config.REDIS_PASSWORD || undefined,
            tls: config.REDIS_TLS ? { rejectUnauthorized: false } : undefined,
        },
    };
}
*/

// ==========================================
// NEW WSL REDIS CONNECTION IMPLEMENTATION
// ==========================================
export function getRedisConfig(isQueueConnection = false): { uri?: string; options: RedisOptions } {
    const commonOptions: RedisOptions = {
        maxRetriesPerRequest: isQueueConnection ? null : 3,
        enableReadyCheck: true,
        lazyConnect: false,
        retryStrategy(times: number) {
            const delay = Math.min(times * 300, 5000);
            logger.warn('Redis reconnecting', { attempt: times, delayMs: delay });
            return delay;
        },
    };

    // Connects to WSL Redis instance via IPv4 loopback (127.0.0.1) or REDIS_HOST
    // Avoids TLS/SSL overhead since local WSL traffic is unencrypted
    const host = config.REDIS_HOST === 'localhost' ? '127.0.0.1' : (config.REDIS_HOST || '127.0.0.1');
    const port = config.REDIS_PORT || 6379;
    const password = config.REDIS_PASSWORD || undefined;

    return {
        options: {
            ...commonOptions,
            host,
            port,
            password,
            tls: undefined, // Disabled for local WSL Redis
        },
    };
}

export function getRedisClient(isQueueConnection = false): Redis {
    if (isQueueConnection) {
        if (queueRedisClient) return queueRedisClient;
        const cfg = getRedisConfig(true);
        queueRedisClient = cfg.uri
            ? new Redis(cfg.uri, cfg.options)
            : new Redis(cfg.options);

        queueRedisClient.on('connect', () => logger.info('Queue Redis connected'));
        queueRedisClient.on('error', (err) => logger.error('Queue Redis error', { error: err.message }));
        return queueRedisClient;
    }

    if (redisClient) return redisClient;
    const cfg = getRedisConfig(false);
    redisClient = cfg.uri
        ? new Redis(cfg.uri, cfg.options)
        : new Redis(cfg.options);

    redisClient.on('connect', () => logger.info('Cache Redis connected'));
    redisClient.on('error', (err) => logger.error('Cache Redis error', { error: err.message }));
    redisClient.on('close', () => logger.warn('Cache Redis connection closed'));

    return redisClient;
}

export async function disconnectRedis(): Promise<void> {
    const promises = [];
    if (redisClient) {
        promises.push(redisClient.quit().then(() => { redisClient = null; }));
    }
    if (queueRedisClient) {
        promises.push(queueRedisClient.quit().then(() => { queueRedisClient = null; }));
    }
    await Promise.all(promises);
    logger.info('Redis connections disconnected cleanly');
}

export function getRedisStatus(): 'ready' | 'connecting' | 'disconnected' {
    if (!redisClient) return 'disconnected';
    const status = redisClient.status;
    if (status === 'ready') return 'ready';
    if (status === 'connecting' || status === 'reconnecting') return 'connecting';
    return 'disconnected';
}
