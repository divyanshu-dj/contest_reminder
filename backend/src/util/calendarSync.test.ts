import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    MAX_REMINDERS,
    MAX_REMINDER_MINUTES,
    describeContest,
    eventIdFor,
    normalisePlatforms,
    normaliseReminders,
} from './calendarSync';

test('eventIdFor produces ids Google will accept', () => {
    const id = eventIdFor('cf_2282');

    // base32hex: lowercase a-v and digits 0-9, length 5..1024.
    assert.match(id, /^[a-v0-9]+$/);
    assert.ok(id.length >= 5 && id.length <= 1024, `length was ${id.length}`);

    // Deterministic, which is what makes a repeated sync idempotent instead of
    // creating a second copy of every contest.
    assert.equal(id, eventIdFor('cf_2282'));
    assert.notEqual(id, eventIdFor('cf_2283'));
    // Contest ids carry characters Google forbids; the hash removes them.
    assert.match(eventIdFor('lc_weekly-contest-530'), /^[a-v0-9]+$/);
});

test('normaliseReminders enforces Google limits', () => {
    assert.deepEqual(normaliseReminders([60]), [60]);
    assert.deepEqual(normaliseReminders([1440, 60, 10]), [10, 60, 1440]);   // sorted
    assert.deepEqual(normaliseReminders([60, 60, 60]), [60]);               // de-duplicated
    assert.deepEqual(normaliseReminders([0]), [0]);                         // at start time is valid

    // Out of Google's accepted range, which would make it reject the event.
    assert.deepEqual(normaliseReminders([-5]), [60]);
    assert.deepEqual(normaliseReminders([MAX_REMINDER_MINUTES + 1]), [60]);
    assert.deepEqual(normaliseReminders(['abc']), [60]);

    // At most five overrides per event.
    assert.equal(normaliseReminders([1, 2, 3, 4, 5, 6, 7, 8]).length, MAX_REMINDERS);
    assert.deepEqual(normaliseReminders([1, 2, 3, 4, 5, 6, 7, 8]), [1, 2, 3, 4, 5]);

    // Anything unusable falls back to a sensible default rather than an empty
    // list, which would silently give the user no reminder at all.
    assert.deepEqual(normaliseReminders(undefined), [60]);
    assert.deepEqual(normaliseReminders([]), [60]);
    assert.deepEqual(normaliseReminders('60'), [60]);
});

test('normalisePlatforms accepts only known platforms', () => {
    assert.deepEqual(normalisePlatforms(['codeforces', 'leetcode']), ['codeforces', 'leetcode']);
    assert.deepEqual(normalisePlatforms(['CODECHEF']), ['codechef']);
    assert.deepEqual(normalisePlatforms(['bogus']), []);
    assert.deepEqual(normalisePlatforms('codeforces'), []);
    assert.deepEqual(normalisePlatforms(undefined), []);
});

test('describeContest formats an event Google can store', () => {
    const event = describeContest({
        name: 'Codeforces Round 1136 (Div. 2)',
        platform: 'codeforces',
        url: 'https://codeforces.com/contest/1136',
        startTime: new Date('2026-12-08T14:35:00.000Z'),
        endTime: new Date('2026-12-08T17:05:00.000Z'),
    });

    assert.equal(event.summary, '[CODEFORCES] Codeforces Round 1136 (Div. 2)');
    assert.equal(event.startIso, '2026-12-08T14:35:00.000Z');
    assert.equal(event.endIso, '2026-12-08T17:05:00.000Z');
    assert.ok(event.description.includes('https://codeforces.com/contest/1136'));
});
