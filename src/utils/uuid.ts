import { v4 as uuidv4 } from 'uuid';

/** Generate standard UUID v4 */
export function uuid(): string {
    return uuidv4();
}
