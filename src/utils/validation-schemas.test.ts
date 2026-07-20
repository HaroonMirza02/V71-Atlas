import {
    loginSchema,
    signupSchema,
    createUserSchema,
    reviewSchema,
    connectorStateSchema,
    restoreSchema,
} from './validation-schemas';

describe('loginSchema', () => {
    it('accepts a valid email and password', () => {
        const result = loginSchema.safeParse({ email: 'a@vision71.com', password: 'password123' });
        expect(result.success).toBe(true);
    });

    it('rejects a malformed email', () => {
        const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
        expect(result.success).toBe(false);
    });

    it('rejects a password shorter than 8 characters', () => {
        const result = loginSchema.safeParse({ email: 'a@vision71.com', password: 'short' });
        expect(result.success).toBe(false);
    });
});

describe('signupSchema', () => {
    it('does not require a role, since public signup ignores any role sent', () => {
        const result = signupSchema.safeParse({
            email: 'a@vision71.com',
            password: 'password123',
            name: 'Test User',
        });
        expect(result.success).toBe(true);
    });
});

describe('createUserSchema', () => {
    it('requires a role, since this is the admin-only endpoint that assigns one', () => {
        const missingRole = createUserSchema.safeParse({
            email: 'a@vision71.com',
            password: 'password123',
            name: 'Test User',
        });
        expect(missingRole.success).toBe(false);

        const withRole = createUserSchema.safeParse({
            email: 'a@vision71.com',
            password: 'password123',
            name: 'Test User',
            role: 'ANALYST',
        });
        expect(withRole.success).toBe(true);
    });

    it('rejects a role outside the known set', () => {
        const result = createUserSchema.safeParse({
            email: 'a@vision71.com',
            password: 'password123',
            name: 'Test User',
            role: 'SUPERUSER',
        });
        expect(result.success).toBe(false);
    });
});

describe('reviewSchema', () => {
    it('accepts a known status transition', () => {
        const result = reviewSchema.safeParse({ status: 'REVIEWED', reviewNotes: 'Looks good' });
        expect(result.success).toBe(true);
    });

    it('rejects an unknown status value', () => {
        const result = reviewSchema.safeParse({ status: 'DELETED_FOREVER' });
        expect(result.success).toBe(false);
    });

    it('rejects review notes over the length limit', () => {
        const result = reviewSchema.safeParse({ status: 'REVIEWED', reviewNotes: 'x'.repeat(2001) });
        expect(result.success).toBe(false);
    });
});

describe('connectorStateSchema', () => {
    it('rejects a schedule interval below the 1 minute floor', () => {
        const result = connectorStateSchema.safeParse({ scheduleIntervalMs: 1000 });
        expect(result.success).toBe(false);
    });

    it('accepts a valid schedule interval', () => {
        const result = connectorStateSchema.safeParse({ isEnabled: true, scheduleIntervalMs: 3600000 });
        expect(result.success).toBe(true);
    });
});

describe('restoreSchema', () => {
    it('requires a non-empty filename', () => {
        expect(restoreSchema.safeParse({ filename: '' }).success).toBe(false);
        expect(restoreSchema.safeParse({ filename: 'backup-123.enc' }).success).toBe(true);
    });
});
