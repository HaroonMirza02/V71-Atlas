import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('5000').transform(Number),
    API_VERSION: z.string().default('v1'),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_DB_NAME: z.string().default('atlas'),

    REDIS_URI: z.string().optional(),
    REDIS_HOST: z.string().default('127.0.0.1'),
    REDIS_PORT: z.string().default('6379').transform(Number),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_TLS: z.string().default('false').transform((v) => v === 'true'),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    ENCRYPTION_SECRET: z.string().min(32, 'ENCRYPTION_SECRET must be at least 32 characters'),

    RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
    RATE_LIMIT_MAX: z.string().default('100').transform(Number),

    GITHUB_TOKEN: z.string().optional(),
    GITHUB_API_URL: z.string().default('https://api.github.com'),
    GITHUB_SEARCH_QUERY: z.string().default('market intelligence OR business opportunity OR pain point'),

    REMOTIVE_API_URL: z.string().default('https://remotive.com/api/remote-jobs'),
    REMOTIVE_CATEGORIES: z.string().default('software-dev,devops-sysadmin,data,product'),

    HN_API_URL: z.string().default('https://hn.algolia.com/api/v1'),

    RSS_FEED_URLS: z.string().default('https://hnrss.org/frontpage,https://feeds.feedburner.com/TechCrunch,https://www.producthunt.com/feed'),

    QUEUE_CONCURRENCY: z.string().default('5').transform(Number),
    QUEUE_MAX_RETRIES: z.string().default('3').transform(Number),
    QUEUE_RETRY_DELAY_MS: z.string().default('5000').transform(Number),
    DEAD_LETTER_QUEUE_NAME: z.string().default('atlas:dlq'),

    CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
    CACHE_MAX_KEYS: z.string().default('1000').transform(Number),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

    METRICS_ENABLED: z.string().default('true').transform((v) => v === 'true'),
});

function loadConfig() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment configuration:');
        result.error.issues.forEach((err) => {
            console.error(`  ${err.path.join('.')}: ${err.message}`);
        });
        process.exit(1);
    }
    return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
