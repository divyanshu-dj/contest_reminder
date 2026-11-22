import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { rateLimit, requireAdmin } from './guards';

const fakeRedis = (overrides: Partial<{ incr: any; expire: any }> = {}) => {
    const counts = new Map<string, number>();
    const expiries: string[] = [];
    return {
        counts,
        expiries,
        incr: overrides.incr ?? (async (key: string) => {
            const next = (counts.get(key) ?? 0) + 1;
            counts.set(key, next);
            return next;
        }),
        expire: overrides.expire ?? (async (key: string) => { expiries.push(key); return 1; }),
    } as any;
};

const fakeReqRes = (headers: Record<string, string> = {}) => {
    let status = 0;
    let body: unknown;
    const res = {
        status(code: number) { status = code; return res; },
        json(payload: unknown) { body = payload; return res; },
    } as unknown as Response;

    const req = {
        ip: '203.0.113.7',
        get: (name: string) => headers[name.toLowerCase()],
    } as unknown as Request;

    return { req, res, result: () => ({ status, body }) };
};

test('rateLimit allows up to max then returns 429', async () => {
    const redis = fakeRedis();
    const limiter = rateLimit(redis, { prefix: 'test', windowSec: 60, max: 3 });
    const allowed: boolean[] = [];

    for (let i = 0; i < 5; i++) {
        const { req, res } = fakeReqRes();
        let passed = false;
        await limiter(req, res, () => { passed = true; });
        allowed.push(passed);
    }

    assert.deepEqual(allowed, [true, true, true, false, false]);
    // TTL is set once, on the first hit of the window - not refreshed on every
    // request, which would make the window never expire under load.
    assert.equal(redis.expiries.length, 1);
});

test('rateLimit fails open when Redis is unavailable', async () => {
    const redis = fakeRedis({ incr: async () => { throw new Error('ECONNREFUSED'); } });
    const limiter = rateLimit(redis, { prefix: 'test', windowSec: 60, max: 1 });
    const { req, res } = fakeReqRes();

    let passed = false;
    await limiter(req, res, () => { passed = true; });

    assert.equal(passed, true);
});

test('requireAdmin fails closed when ADMIN_TOKEN is unset', () => {
    const previous = process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN;

    const { req, res, result } = fakeReqRes({ authorization: 'Bearer anything' });
    let passed = false;
    requireAdmin(req, res, () => { passed = true; });

    assert.equal(passed, false);
    assert.equal(result().status, 503);

    if (previous !== undefined) process.env.ADMIN_TOKEN = previous;
});

test('requireAdmin accepts only the exact bearer token', () => {
    const previous = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = 'correct-horse';

    const cases: Array<[Record<string, string>, boolean]> = [
        [{ authorization: 'Bearer correct-horse' }, true],
        [{ authorization: 'Bearer correct-hors' }, false],   // prefix of the real token
        [{ authorization: 'Bearer correct-horsey' }, false], // real token as a prefix
        [{ authorization: 'correct-horse' }, false],         // missing scheme
        [{}, false],                                         // no header at all
    ];

    for (const [headers, expected] of cases) {
        const { req, res, result } = fakeReqRes(headers);
        let passed = false;
        requireAdmin(req, res, () => { passed = true; });
        assert.equal(passed, expected, JSON.stringify(headers));
        if (!expected) assert.equal(result().status, 401);
    }

    if (previous === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = previous;
});
