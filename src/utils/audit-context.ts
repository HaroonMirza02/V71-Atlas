import { Request } from 'express';

/**
 * Builds the common request-derived fields attached to every audit log
 * entry (ip address, user agent, request id, path, method). Kept in one
 * place so every controller records audit events the same way instead of
 * each one picking a different subset of fields.
 */
export function buildAuditContext(req: Request): {
    ipAddress: string;
    userAgent: string;
    requestId: string;
    path: string;
    httpMethod: string;
} {
    return {
        ipAddress: req.ip || req.socket?.remoteAddress || 'unknown',
        userAgent: String(req.headers['user-agent'] || 'unknown'),
        requestId: req.requestId || 'unknown',
        path: req.path,
        httpMethod: req.method,
    };
}
