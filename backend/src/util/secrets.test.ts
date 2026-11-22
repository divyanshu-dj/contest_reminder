import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret, hasEncryptionKey, randomToken } from './secrets';

const withKey = (hex: string, body: () => void) => {
    const previous = process.env.TOKEN_ENCRYPTION_KEY;
    process.env.TOKEN_ENCRYPTION_KEY = hex;
    try { body(); } finally {
        if (previous === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
        else process.env.TOKEN_ENCRYPTION_KEY = previous;
    }
};

const KEY_A = 'a'.repeat(64);
const KEY_B = 'b'.repeat(64);

test('refresh tokens round-trip through encryption', () => {
    withKey(KEY_A, () => {
        const secret = '1//04x-refresh-token-value_with.punctuation';
        const packed = encryptSecret(secret);

        assert.notEqual(packed, secret);
        assert.ok(!packed.includes('refresh-token'), 'ciphertext must not leak the plaintext');
        assert.equal(decryptSecret(packed), secret);

        // A fresh IV each time, so the same token does not produce the same
        // ciphertext twice - otherwise equal rows would be visibly equal.
        assert.notEqual(encryptSecret(secret), encryptSecret(secret));
    });
});

test('tampered or foreign ciphertext fails closed', () => {
    let packed = '';
    withKey(KEY_A, () => { packed = encryptSecret('secret-value'); });

    // Wrong key must not decrypt.
    withKey(KEY_B, () => {
        assert.throws(() => decryptSecret(packed));
    });

    withKey(KEY_A, () => {
        const [iv, ciphertext, tag] = packed.split('.');
        // GCM authenticates, so a flipped byte throws instead of returning junk.
        const flipped = Buffer.from(ciphertext, 'base64url');
        flipped[0] ^= 0xff;
        assert.throws(() => decryptSecret([iv, flipped.toString('base64url'), tag].join('.')));

        assert.throws(() => decryptSecret('not-packed'));
        assert.throws(() => decryptSecret('a.b'));
    });
});

test('a missing or malformed key is refused, not defaulted', () => {
    withKey('', () => {
        assert.equal(hasEncryptionKey(), false);
        assert.throws(() => encryptSecret('x'), /TOKEN_ENCRYPTION_KEY/);
    });
    withKey('abc', () => {
        assert.equal(hasEncryptionKey(), false);
        assert.throws(() => encryptSecret('x'), /TOKEN_ENCRYPTION_KEY/);
    });
    withKey(KEY_A, () => assert.equal(hasEncryptionKey(), true));
});

test('randomToken is unguessable and url-safe', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => randomToken()));
    assert.equal(tokens.size, 50);
    assert.match(randomToken(), /^[A-Za-z0-9_-]+$/);
});
