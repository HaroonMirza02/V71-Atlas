import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a plain-text API key/secret using AES-256-GCM.
 * The output includes the IV and Auth Tag stringified with the ciphertext.
 */
export function encryptSecret(plainText: string): string {
    const secretKey = crypto.createHash('sha256').update(config.ENCRYPTION_SECRET).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Format: iv:authTag:encryptedText
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string back to plain text.
 * Returns null if decryption fails or authentication check fails (tampering).
 */
export function decryptSecret(cipherText: string): string | null {
    try {
        const parts = cipherText.split(':');
        if (parts.length !== 3) return null;

        const [ivHex, authTagHex, encryptedHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');

        const secretKey = crypto.createHash('sha256').update(config.ENCRYPTION_SECRET).digest();
        const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (err) {
        return null; // Bad key or data tampered/corrupted
    }
}
