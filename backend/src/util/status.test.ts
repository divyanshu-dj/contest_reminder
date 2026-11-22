import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusFor } from './status';

const at = (iso: string) => new Date(iso);

test('statusFor derives status from the clock', () => {
    const start = at('2026-01-10T10:00:00Z');
    const end = at('2026-01-10T12:00:00Z');

    assert.equal(statusFor(start, end, at('2026-01-10T09:59:59Z')), 'UPCOMING');
    assert.equal(statusFor(start, end, at('2026-01-10T11:00:00Z')), 'ONGOING');
    assert.equal(statusFor(start, end, at('2026-01-10T12:00:01Z')), 'COMPLETED');

    // Boundaries are inclusive, so a contest is never briefly statusless.
    assert.equal(statusFor(start, end, start), 'ONGOING');
    assert.equal(statusFor(start, end, end), 'ONGOING');
});

test('statusFor is timezone agnostic', () => {
    // CodeChef reports offset-bearing timestamps; Codeforces reports UTC. The
    // same instant written either way must produce the same status.
    const start = at('2026-01-10T19:00:00+05:30');  // 13:30Z
    const end = at('2026-01-10T22:00:00+05:30');    // 16:30Z

    assert.equal(statusFor(start, end, at('2026-01-10T13:00:00Z')), 'UPCOMING');
    assert.equal(statusFor(start, end, at('2026-01-10T14:00:00Z')), 'ONGOING');
    assert.equal(statusFor(start, end, at('2026-01-10T17:00:00Z')), 'COMPLETED');
});
