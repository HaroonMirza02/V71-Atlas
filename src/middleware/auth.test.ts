import { Request, Response } from 'express';
import { requirePermission } from './auth';

/**
 * These tests exist because Section 9 of the sprint brief requires proof
 * that authorization actually works, not just an assertion that it does.
 * requirePermission is the single gate every write endpoint passes
 * through, so its correctness matters more than almost anything else in
 * this codebase.
 */
describe('requirePermission middleware', () => {
    function mockReqRes(role?: string) {
        const req = {
            user: role ? { id: 'u1', email: 'test@vision71.com', role } : undefined,
            path: '/api/v1/test',
        } as unknown as Request;

        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        const res = { status } as unknown as Response;

        const next = jest.fn();

        return { req, res, next, status, json };
    }

    it('rejects with 401 when no user is attached to the request', () => {
        const { req, res, next, status } = mockReqRes(undefined);
        requirePermission('signals:read')(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows a VIEWER to read signals', () => {
        const { req, res, next, status } = mockReqRes('VIEWER');
        requirePermission('signals:read')(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(status).not.toHaveBeenCalled();
    });

    it('blocks a VIEWER from reviewing signals', () => {
        const { req, res, next, status } = mockReqRes('VIEWER');
        requirePermission('signals:review')(req, res, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('blocks an ANALYST from managing users', () => {
        const { req, res, next, status } = mockReqRes('ANALYST');
        requirePermission('users:manage')(req, res, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows an ANALYST to review signals and trigger connectors', () => {
        const review = mockReqRes('ANALYST');
        requirePermission('signals:review')(review.req, review.res, review.next);
        expect(review.next).toHaveBeenCalled();

        const trigger = mockReqRes('ANALYST');
        requirePermission('connectors:write')(trigger.req, trigger.res, trigger.next);
        expect(trigger.next).toHaveBeenCalled();
    });

    it('allows an ADMIN to manage users and backups', () => {
        const users = mockReqRes('ADMIN');
        requirePermission('users:manage')(users.req, users.res, users.next);
        expect(users.next).toHaveBeenCalled();

        const backups = mockReqRes('ADMIN');
        requirePermission('backups:manage')(backups.req, backups.res, backups.next);
        expect(backups.next).toHaveBeenCalled();
    });

    it('blocks an unrecognized role from every permission', () => {
        const { req, res, next, status } = mockReqRes('NOT_A_REAL_ROLE');
        requirePermission('signals:read')(req, res, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
