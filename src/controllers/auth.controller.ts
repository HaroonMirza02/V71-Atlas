import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config';
import { JwtPayload, UserRole } from '../types';
import { logger, auditLog } from '../lib/logger';

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
            res.status(401).json({
                error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
            });
            return;
        }

        if (!user.isActive) {
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
            action: 'LOGIN',
            resource: 'auth',
            outcome: 'success',
            details: { email: user.email, role: user.role },
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

        // Role lock: only ADMIN can assign ADMIN or ANALYST roles on signups.
        // If not authenticated, we default to VIEWER, but if the database has 0 users
        // we auto-appoint the first signup as ADMIN for self-bootstrapping clean installation!
        const userCount = await User.countDocuments();
        let assignedRole: UserRole = 'VIEWER';

        if (userCount === 0) {
            assignedRole = 'ADMIN';
        } else if (role) {
            // If a token exists and the request is made by an ADMIN, assign the requested role
            const requestingUserRole = req.user?.role;
            if (requestingUserRole === 'ADMIN') {
                assignedRole = role as UserRole;
            }
        }

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
            action: 'REGISTER',
            resource: 'user',
            resourceId: newUser.id,
            outcome: 'success',
            details: { email: newUser.email, role: newUser.role },
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
