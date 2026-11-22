import crypto from 'crypto';

/**
 * A Google refresh token is a long-lived credential: it grants write access to
 * someone's calendar until they revoke it. Storing it in plaintext would mean a
 * read-only database leak is enough to write to every connected calendar, so it
 * is encrypted at rest with a key the database never holds.
 *
 * AES-256-GCM, because it authenticates as well as encrypts - a tampered
 * ciphertext fails to decrypt rather than decrypting to garbage.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;   // 96 bits, the GCM standard
const KEY_BYTES = 32;  // 256 bits

export class MissingEncryptionKeyError extends Error {
    constructor() {
        super('TOKEN_ENCRYPTION_KEY is not set or is not 64 hex characters');
        this.name = 'MissingEncryptionKeyError';
    }
}

const key = (): Buffer => {
    const raw = process.env.TOKEN_ENCRYPTION_KEY ?? '';
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) throw new MissingEncryptionKeyError();
    return Buffer.from(raw, 'hex');
};

export const hasEncryptionKey = (): boolean =>
    /^[0-9a-fA-F]{64}$/.test(process.env.TOKEN_ENCRYPTION_KEY ?? '');

/** Returns `iv.ciphertext.authTag`, all base64url. */
export const encryptSecret = (plaintext: string): string => {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return [iv, ciphertext, cipher.getAuthTag()]
        .map(part => part.toString('base64url'))
        .join('.');
};

export const decryptSecret = (packed: string): string => {
    const parts = packed.split('.');
    if (parts.length !== 3) throw new Error('Malformed encrypted value');

    const [iv, ciphertext, authTag] = parts.map(part => Buffer.from(part, 'base64url'));
    if (iv.length !== IV_BYTES) throw new Error('Malformed initialisation vector');

    const decipher = crypto.createDecipheriv(ALGORITHM, key(), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

/** Opaque, unguessable identifiers for OAuth state and session cookies. */
export const randomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString('base64url');
