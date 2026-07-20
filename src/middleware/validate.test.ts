import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from './validate';

describe('sanitizeInput middleware', () => {
    function runWith(body: any, query: any = {}) {
        const req = { body, query } as unknown as Request;
        const res = {} as Response;
        const next: NextFunction = jest.fn();
        sanitizeInput(req, res, next);
        return { req, next };
    }

    it('escapes an inline script tag in a string field', () => {
        const { req } = runWith({ title: '<script>alert(1)</script>' });
        expect(req.body.title).not.toContain('<script>');
        expect(req.body.title).toContain('&lt;script&gt;');
    });

    it('escapes quotes that could break out of an HTML attribute', () => {
        const { req } = runWith({ note: `onmouseover="alert(1)"` });
        expect(req.body.note).not.toContain('"');
    });

    it('recurses into nested objects and arrays', () => {
        const { req } = runWith({
            outer: { inner: '<img src=x onerror=alert(1)>' },
            list: ['<b>bold</b>', 'plain text'],
        });
        expect(req.body.outer.inner).not.toContain('<img');
        expect(req.body.list[0]).not.toContain('<b>');
        expect(req.body.list[1]).toBe('plain text');
    });

    it('leaves non-string values untouched', () => {
        const { req } = runWith({ count: 5, active: true, meta: null });
        expect(req.body.count).toBe(5);
        expect(req.body.active).toBe(true);
        expect(req.body.meta).toBeNull();
    });

    it('sanitizes query parameters as well as the body', () => {
        const { req } = runWith({}, { search: '<script>evil()</script>' });
        expect(req.query.search).not.toContain('<script>');
    });

    it('calls next exactly once', () => {
        const { next } = runWith({ a: '1' });
        expect(next).toHaveBeenCalledTimes(1);
    });
});
