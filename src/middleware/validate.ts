import { Request, Response, NextFunction } from 'express';
import { Schema, ZodError } from 'zod';
import { logger } from '../lib/logger';

/**
 * Zod-based request body validation middleware.
 * Triggers HTTP 400 Bad Request with detailed path validation errors on failure.
 */
export function validateBody(schema: Schema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const details = result.error.issues.reduce((acc: Record<string, string>, err: any) => {
                const pathStr = err.path.join('.') || 'body';
                acc[pathStr] = err.message;
                return acc;
            }, {});

            logger.warn('Request body validation failed', {
                path: req.path,
                errors: details,
            });

            res.status(400).json({
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'The request body did not match the required schema constraints.',
                    details,
                },
            });
            return;
        }

        // Replace body with parsed/validated version (strips out unvalidated keys)
        req.body = result.data;
        next();
    };
}

/** Sanitize inputs middleware to mitigate basic XSS injections */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
    function sanitize(obj: any): any {
        if (typeof obj === 'string') {
            // Basic HTML tags stripping to prevent XSS payloads
            return obj
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        } else if (Array.isArray(obj)) {
            return obj.map(sanitize);
        } else if (obj !== null && typeof obj === 'object') {
            const copy: Record<string, any> = {};
            for (const key of Object.keys(obj)) {
                copy[key] = sanitize(obj[key]);
            }
            return copy;
        }
        return obj;
    }

    if (req.body) req.body = sanitize(req.body);
    if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitize(req.query);
        Object.keys(req.query).forEach((key) => {
            delete (req.query as any)[key];
        });
        Object.assign(req.query, sanitizedQuery);
    }
    next();
}
