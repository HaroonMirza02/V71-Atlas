import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, JwtPayload } from '../types';
import { User } from '../models/User';
import { logger } from '../lib/logger';

// ── Data-Driven Permission Definitions ────────────────────────

export type AppPermission =
    | 'signals:read'
    | 'signals:write'      // Create/update opportunities
    | 'signals:review'     // Approve/change status/notes
    | 'connectors:read'
    | 'connectors:write'    // Enable/disable/trigger ingestion
    | 'users:manage'       // ADMIN-only user creation/role updates
    | 'metrics:read'       // View dashboard queue/analytics charts
    | 'backups:manage';    // Run database backup/restore procedures

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
    ADMIN: [
        'signals:read',
        'signals:write',
        'signals:review',
        'connectors:read',
        'connectors:write',
        'users:manage',
        'metrics:read',
        'backups:manage',
    ],
    ANALYST: [
        'signals:read',
        'signals:review',
        'connectors:read',
        'connectors:write', // Safe for analyst to manual crawls
        'metrics:read',
    ],
    VIEWER: [
        'signals:read',
        'connectors:read',
    ],
};

// Extend standard Express request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: UserRole;
            };
            requestId?: string;
        }
    }
}

/** Authenticate JWT token from headers */
export async function authenticateToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({
            error: {
                code: 'UNAUTHORIZED_MISSING_TOKEN',
                message: 'Access token required in Authorization header as Bearer token',
            },
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

        // Check if user still exists and is active in DB
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED_USER_DISABLED',
                    message: 'User does not exist or has been deactivated',
                },
            });
            return;
        }

        // Attach to request
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (err: any) {
        logger.warn('Token authentication failed', { error: err.message, path: req.path });

        const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        const message = err.name === 'TokenExpiredError' ? 'Access token has expired' : 'Access token is invalid';

        res.status(401).json({
            error: {
                code,
                message,
            },
        });
    }
}

/**
 * Data-driven Server-side Authorization middleware.
 * Verifies if the authenticated user's role lists the required permission
 * in the role-permission mapping lookup matrix.
 */
export function requirePermission(permission: AppPermission) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = req.user;

        if (!user) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required before authorization checks',
                },
            });
            return;
        }

        const allowedPermissions = ROLE_PERMISSIONS[user.role] || [];
        const hasAccess = allowedPermissions.includes(permission);

        if (!hasAccess) {
            logger.warn('Unauthorized authorization attempt', {
                userId: user.id,
                role: user.role,
                requiredPermission: permission,
                path: req.path,
            });

            res.status(403).json({
                error: {
                    code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
                    message: `Your role (${user.role}) does not have permission to execute this operation: required permission [${permission}]`,
                },
            });
            return;
        }

        next();
    };
}
