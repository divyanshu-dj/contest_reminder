import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import {
    buildContestFilter,
    cacheKeyFor,
    clampLimit,
    decodeCursor,
    encodeCursor,
    escapeRegex,
    parsePlatforms,
    parseSearch,
    parseStatus,
} from './contestQuery';

const NOW = new Date('2026-06-01T12:00:00Z');
const base = { platforms: [] as any, status: 'all' as const, search: '', cursor: null };

test('clampLimit bounds hostile input', () => {
    assert.equal(clampLimit('30', 30), 30);
    assert.equal(clampLimit(undefined, 30), 30);
    assert.equal(clampLimit('999999', 30), 100);   // cannot dump the collection
    assert.equal(clampLimit('-1', 30), 30);
    assert.equal(clampLimit('abc', 30), 30);
});

test('parsers reject anything not in the allowlist', () => {
    assert.deepEqual(parsePlatforms('codeforces,leetcode'), ['codeforces', 'leetcode']);
    assert.deepEqual(parsePlatforms('CODEFORCES, bogus'), ['codeforces']);
    assert.deepEqual(parsePlatforms('bogus'), []);
    assert.deepEqual(parsePlatforms(undefined), []);

    assert.equal(parseStatus('ongoing'), 'ongoing');
    assert.equal(parseStatus('nonsense'), 'all');
    assert.equal(parseStatus(undefined), 'all');

    assert.equal(parseSearch('  round  '), 'round');
    assert.equal(parseSearch('x'.repeat(500)).length, 100);  // bounds regex cost
    assert.equal(parseSearch(42), '');
});

test('escapeRegex neutralises metacharacters from user input', () => {
    assert.equal(escapeRegex('a.*b'), 'a\\.\\*b');
    assert.equal(escapeRegex('(a+b)'), '\\(a\\+b\\)');
    // A pathological pattern becomes a literal rather than a backtracking bomb.
    assert.doesNotThrow(() => new RegExp(escapeRegex('(a+)+$')));
    assert.equal(new RegExp(escapeRegex('(a+)+$')).test('(a+)+$'), true);
});

test('cursor round-trips and rejects tampering', () => {
    const id = new Types.ObjectId();
    const startTime = new Date('2026-05-01T10:00:00Z');

    const decoded = decodeCursor(encodeCursor({ startTime, _id: id }));
    assert.ok(decoded);
    assert.equal(decoded.startTime.toISOString(), startTime.toISOString());
    assert.equal(String(decoded.id), String(id));

    assert.equal(decodeCursor('not-base64!!'), null);
    assert.equal(decodeCursor(Buffer.from('nonsense|nonsense').toString('base64url')), null);
    assert.equal(decodeCursor(Buffer.from('2026-05-01T10:00:00Z|not-an-id').toString('base64url')), null);
    assert.equal(decodeCursor(''), null);
    assert.equal(decodeCursor(undefined), null);
});

test('buildContestFilter turns status into date comparisons', () => {
    assert.deepEqual(buildContestFilter(base, NOW), {});

    assert.deepEqual(buildContestFilter({ ...base, status: 'upcoming' }, NOW),
        { $and: [{ startTime: { $gt: NOW } }] });
    assert.deepEqual(buildContestFilter({ ...base, status: 'ongoing' }, NOW),
        { $and: [{ startTime: { $lte: NOW }, endTime: { $gte: NOW } }] });
    assert.deepEqual(buildContestFilter({ ...base, status: 'completed' }, NOW),
        { $and: [{ endTime: { $lt: NOW } }] });
});

test('buildContestFilter keeps overlapping startTime clauses separate', () => {
    const id = new Types.ObjectId();
    const cursorTime = new Date('2026-05-01T10:00:00Z');

    const filter: any = buildContestFilter({
        platforms: ['codeforces'],
        status: 'upcoming',
        search: 'round',
        cursor: { startTime: cursorTime, id },
    }, NOW);

    // Four clauses, two of which constrain startTime. Merging them into one
    // object would silently drop the status bound and return completed contests.
    assert.equal(filter.$and.length, 4);
    const startTimeClauses = filter.$and.filter((c: any) => 'startTime' in c || '$or' in c);
    assert.equal(startTimeClauses.length, 2);
    assert.deepEqual(filter.$and[0], { platform: { $in: ['codeforces'] } });
    assert.deepEqual(filter.$and[1], { startTime: { $gt: NOW } });
    assert.deepEqual(filter.$and[2], { name: { $regex: 'round', $options: 'i' } });
});

test('only the bounded first page is cacheable', () => {
    assert.equal(cacheKeyFor(base, 30, '3'), 'contests:v3:all:all:30');
    assert.equal(cacheKeyFor({ ...base, platforms: ['codechef'] }, 30, '3'), 'contests:v3:codechef:all:30');

    // Caller-controlled, unbounded key space must not reach Redis.
    assert.equal(cacheKeyFor({ ...base, search: 'anything' }, 30, '3'), null);
    assert.equal(cacheKeyFor({ ...base, cursor: { startTime: NOW, id: new Types.ObjectId() } }, 30, '3'), null);
});
