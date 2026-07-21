import { getRedisClient } from './redis';
import { config } from '../config';
import { logger } from './logger';

const DEFAULT_TTL = config.CACHE_TTL_SECONDS;

/**
 * Build a cache key that is permission-aware.
 * Including the user's role prevents cross-role data leaks.
 */
export function buildCacheKey(
    namespace: string,
    params: Record<string, unknown>,
    role?: string
): string {
    const sorted = Object.keys(params)
        .sort()
        .map((k) => `${k}:${params[k]}`)
        .join('|');
    const rolePrefix = role ? `role:${role}:` : '';
    return `atlas:${rolePrefix}${namespace}:${sorted}`;
}

/** Get a cached value, returns null on miss or error */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedisClient();
        const raw = await redis.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch (err) {
        logger.warn('Cache GET error', { key, error: (err as Error).message });
        return null;
    }
}

/** Set a cached value with explicit TTL (seconds) */
export async function setCached<T>(
    key: string,
    value: T,
    ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
        logger.warn('Cache SET error', { key, error: (err as Error).message });
    }
}

/** Delete a specific cache key (invalidate on write) */
export async function invalidateCache(key: string): Promise<void> {
    try {
        const redis = getRedisClient();
        await redis.del(key);
    } catch (err) {
        logger.warn('Cache DEL error', { key, error: (err as Error).message });
    }
}

/** Delete all keys matching a namespace pattern */
export async function invalidateCachePattern(pattern: string): Promise<void> {
    try {
        const redis = getRedisClient();
        const keys = await redis.keys(`atlas:*${pattern}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
            logger.debug('Cache pattern invalidated', { pattern, count: keys.length });
        }
    } catch (err) {
        logger.warn('Cache pattern DEL error', { pattern, error: (err as Error).message });
    }
}

/**
 * Cache-aside helper. Reads from cache first; on miss, calls loader,
 * stores result, then returns it.
 *
 * Invalidation strategy:
 * - List/search queries: TTL = 5 min (config.CACHE_TTL_SECONDS)
 * - Single-record reads: TTL = 30 min
 * - Mutation endpoints call invalidateCachePattern() on write
 */
export async function withCache<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
    const cached = await getCached<T>(key);
    if (cached !== null) return cached;

    const value = await loader();
    await setCached(key, value, ttlSeconds);
    return value;
}
