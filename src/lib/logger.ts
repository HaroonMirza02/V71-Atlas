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
    userEmail?: string;
    action: string;
    resource: string;
    resourceId?: string;
    httpMethod?: string;
    path?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    outcome: 'success' | 'failure';
    details?: Record<string, unknown>;
}) {
    logger.info('AUDIT', {
        type: 'audit',
        ...event,
        timestamp: new Date().toISOString(),
    });

    // Persist to the append-only AuditLog collection so the audit trail is
    // queryable on its own (who did what, when, to which record) rather than
    // only living inside log files. Import is done lazily here to avoid a
    // circular dependency between logger.ts and models that themselves log.
    // A failure to persist must never break the calling request, so this
    // is fire-and-forget with its own error handling.
    import('../models/AuditLog')
        .then(({ AuditLog }) => {
            AuditLog.create({
                userId: event.userId,
                userEmail: event.userEmail || 'unknown',
                action: event.action,
                resource: event.resource,
                resourceId: event.resourceId,
                httpMethod: event.httpMethod,
                path: event.path,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                requestId: event.requestId,
                outcome: event.outcome,
                details: event.details,
                timestamp: new Date(),
            }).catch((err: Error) => {
                logger.error('Failed to persist audit log entry to database', {
                    error: err.message,
                    action: event.action,
                    resource: event.resource,
                });
            });
        })
        .catch((err: Error) => {
            logger.error('Failed to load AuditLog model for persistence', { error: err.message });
        });
}
