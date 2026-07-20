import { encryptSecret, decryptSecret } from './encryption';

describe('encryptSecret / decryptSecret', () => {
    it('round-trips a plain text secret correctly', () => {
        const original = 'sk-example-api-key-12345';
        const encrypted = encryptSecret(original);
        const decrypted = decryptSecret(encrypted);

        expect(decrypted).toBe(original);
    });

    it('never stores the plain text value inside the ciphertext string', () => {
        const original = 'super-secret-connector-token';
        const encrypted = encryptSecret(original);

        expect(encrypted).not.toContain(original);
    });

    it('produces a different ciphertext each time even for the same input', () => {
        const original = 'same-input-value';
        const first = encryptSecret(original);
        const second = encryptSecret(original);

        // A fresh random IV each call means ciphertexts must differ, even
        // though both decrypt back to the same plain text. If this ever
        // fails, the IV is being reused, which breaks GCM's guarantees.
        expect(first).not.toBe(second);
        expect(decryptSecret(first)).toBe(original);
        expect(decryptSecret(second)).toBe(original);
    });

    it('returns null instead of throwing when the ciphertext has been tampered with', () => {
        const encrypted = encryptSecret('some-value');
        const parts = encrypted.split(':');
        // Flip a character in the ciphertext portion to simulate tampering
        const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;

        expect(decryptSecret(tampered)).toBeNull();
    });

    it('returns null for a malformed ciphertext string', () => {
        expect(decryptSecret('not-a-valid-ciphertext')).toBeNull();
    });
});
