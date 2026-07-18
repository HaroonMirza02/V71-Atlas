import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const prettyFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
    const id = requestId ? ` [${requestId}]` : '';
    const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp}${id} [${level.toUpperCase()}] ${message}${metaStr}`;
});

const jsonFormat = combine(
    errors({ stack: true }),
    timestamp({ format: 'ISO' }),
    json()
);

const devFormat = combine(
    colorize({ all: true }),
    errors({ stack: true }),
    timestamp({ format: 'HH:mm:ss' }),
    prettyFormat
);

export const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    format: config.LOG_FORMAT === 'json' ? jsonFormat : devFormat,
    defaultMeta: { service: 'atlas-api' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: jsonFormat,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: jsonFormat,
        }),
    ],
});

/** Create a child logger with a bound requestId for tracing */
export function createRequestLogger(requestId: string) {
    return logger.child({ requestId });
}

/** Structured audit log */
export function auditLog(event: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    outcome: 'success' | 'failure';
    details?: Record<string, unknown>;
}) {
    logger.info('AUDIT', {
        type: 'audit',
        ...event,
        timestamp: new Date().toISOString(),
    });
}
