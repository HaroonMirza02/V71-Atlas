import crypto from 'crypto';

/** Generate standard UUID v4 */
export function uuid(): string {
    return crypto.randomUUID();
}
