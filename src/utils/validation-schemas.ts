import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const signupSchema = z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
    role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).optional(),
});

export const createUserSchema = z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
    role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']),
});

export const reviewSchema = z.object({
    status: z.enum(['REVIEWED', 'ARCHIVED', 'REJECTED']),
    reviewNotes: z.string().max(2000, 'Review notes must not exceed 2000 characters').optional(),
});

export const connectorStateSchema = z.object({
    isEnabled: z.boolean().optional(),
    scheduleIntervalMs: z.number().min(60000, 'Schedule interval must be at least 60,000ms (1 minute)').optional(),
});

export const restoreSchema = z.object({
    filename: z.string().min(1, 'Backup filename must be provided'),
});
