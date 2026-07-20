import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { JwtPayload, UserRole } from '../types';
import { logger, auditLog } from '../lib/logger';
import { buildAuditContext } from '../utils/audit-context';

/** Issue access and refresh tokens */
function generateTokens(userId: string, role: UserRole) {
    const accessToken = jwt.sign({ userId, role }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN,
    } as any);

    const refreshToken = jwt.sign({ userId, role }, config.JWT_REFRESH_SECRET, {
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    } as any);

    return { accessToken, refreshToken };
}

export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({
            error: { code: 'INVALID_INPUT', message: 'Email and password are required' },
        });
        return;
    }

    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            auditLog({
                userId: user ? user.id : 'unknown',
                userEmail: email,
                action: 'LOGIN',
                resource: 'auth',
                outcome: 'failure',
                details: { reason: 'invalid_credentials' },
                ...buildAuditContext(req),
            });
            res.status(401).json({
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
            });
            return;
        }

        if (!user.isActive) {
            auditLog({
                userId: user.id,
                userEmail: user.email,
                action: 'LOGIN',
                resource: 'auth',
                outcome: 'failure',
                details: { reason: 'account_disabled' },
                ...buildAuditContext(req),
            });
            res.status(403).json({
                error: { code: 'USER_DEACTIVATED', message: 'User account is disabled' },
            });
            return;
        }

        const { accessToken, refreshToken } = generateTokens(user.id, user.role);

        // Save login timestamp
        user.lastLoginAt = new Date();
        await user.save();

        auditLog({
            userId: user.id,
            userEmail: user.email,
            action: 'LOGIN',
            resource: 'auth',
            outcome: 'success',
            details: { role: user.role },
            ...buildAuditContext(req),
        });

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (err: any) {
        logger.error('Login error', { error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Internal server error during login' },
        });
    }
}

export async function signup(req: Request, res: Response): Promise<void> {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
        res.status(400).json({
            error: { code: 'INVALID_INPUT', message: 'Email, password, and name are required' },
        });
        return;
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            res.status(409).json({
                error: { code: 'USER_EXISTS', message: 'A user with this email already exists' },
            });
            return;
        }

        // Public self-registration always creates a VIEWER account, with one
        // exception: if the database has no users at all yet, the very first
        // signup bootstraps as ADMIN so a freshly deployed system has a way
        // in. Any role value sent in the request body is ignored here, on
        // purpose, since this endpoint has no authentication in front of it.
        // Creating ADMIN or ANALYST accounts is handled separately by
        // POST /users, which requires an authenticated ADMIN caller. See
        // createUser() below.
        const userCount = await User.countDocuments();
        const assignedRole: UserRole = userCount === 0 ? 'ADMIN' : 'VIEWER';
        void role; // intentionally ignored on this public route

        const newUser = new User({
            email,
            password,
            name,
            role: assignedRole,
        });

        await newUser.save();

        logger.info('User created', { email: newUser.email, role: newUser.role });

        auditLog({
            userId: newUser.id,
            userEmail: newUser.email,
            action: 'REGISTER',
            resource: 'user',
            resourceId: newUser.id,
            outcome: 'success',
            details: { role: newUser.role },
            ...buildAuditContext(req),
        });

        const { accessToken, refreshToken } = generateTokens(newUser.id, newUser.role);

        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
        });
    } catch (err: any) {
        logger.error('Signup error', { error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Internal server error during registration' },
        });
    }
}

export async function profile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            res.status(404).json({
                error: { code: 'USER_NOT_FOUND', message: 'Profile details not found' },
            });
            return;
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                lastLoginAt: user.lastLoginAt,
            },
        });
    } catch (err: any) {
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Internal server error' },
        });
    }
}

/**
 * Admin-only user creation. Unlike public signup, this endpoint can assign
 * any role because it sits behind authenticateToken + requirePermission
 * ('users:manage'), which only ADMIN accounts hold. This is the correct,
 * working replacement for the role-assignment branch that used to live
 * (non-functionally) inside signup().
 */
export async function createUser(req: Request, res: Response): Promise<void> {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
        res.status(400).json({
            error: { code: 'INVALID_INPUT', message: 'Email, password, name, and role are required' },
        });
        return;
    }

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            res.status(409).json({
                error: { code: 'USER_EXISTS', message: 'A user with this email already exists' },
            });
            return;
        }

        const newUser = new User({ email, password, name, role: role as UserRole });
        await newUser.save();

        logger.info('User created by administrator', {
            createdEmail: newUser.email,
            createdRole: newUser.role,
            createdBy: req.user!.email,
        });

        auditLog({
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: 'CREATE_USER',
            resource: 'user',
            resourceId: newUser.id,
            outcome: 'success',
            details: { createdEmail: newUser.email, assignedRole: newUser.role },
            ...buildAuditContext(req),
        });

        res.status(201).json({
            message: 'User created successfully',
            data: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
        });
    } catch (err: any) {
        logger.error('Admin user creation error', { error: err.message });
        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Internal server error while creating user' },
        });
    }
}
