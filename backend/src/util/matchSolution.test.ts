import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signatureOf, isCandidate, findBestMatch } from './matchSolution';
import { IYoutubeVideo } from './types';

const video = (title: string): IYoutubeVideo => ({ title, url: `https://youtu.be/${title.length}` });

test('signatureOf extracts number, division and kind', () => {
    assert.deepEqual(signatureOf('Codeforces Round 1136 (Div. 2)'),
        { number: '1136', division: '2', kind: ['codeforces', 'round'] });

    assert.deepEqual(signatureOf('Biweekly Contest 196'),
        { number: '196', division: null, kind: ['biweekly', 'contest'] });

    // "Rated for Div. 2" describes eligibility, not a split round.
    assert.deepEqual(signatureOf('Educational Codeforces Round 189 (Rated for Div. 2)'),
        { number: '189', division: null, kind: ['educational', 'codeforces', 'round'] });
});

test('rejects the wrong matches found in production data', () => {
    // Every pair below was an actual wrong link in the database.
    assert.equal(isCandidate('Biweekly Contest 1', 'Biweekly Contest 196 | Solutions'), false);
    assert.equal(isCandidate('Biweekly Contest 19', 'Biweekly Contest 196 | Solutions'), false);
    assert.equal(isCandidate('Weekly Contest 196', 'Biweekly Contest 196 | Solutions'), false);
    assert.equal(isCandidate('Biweekly Contest 196', 'Weekly Contest 196 | Solutions'), false);
    assert.equal(isCandidate('Codeforces Round 1136 (Div. 1)', 'Codeforces Round 1136 (Div. 2) | Solutions'), false);
    assert.equal(isCandidate('Codeforces Round 113 (Div. 2)', 'Codeforces Round 1136 (Div. 2) | Solutions'), false);
    assert.equal(isCandidate('Codeforces Round 109 (Div. 1)', 'Codeforces Round 1099 (Div. 2) | Solutions'), false);
    assert.equal(isCandidate('Weekly Contest 4', 'Weekly Contest 499 | Solutions'), false);
    assert.equal(isCandidate('Educational Codeforces Round 1', 'Educational Codeforces Round 189 | Solutions'), false);
    assert.equal(isCandidate('Codeforces Round 189 (Div. 1)', 'Educational Codeforces Round 189 | Solutions'), false);
});

test('still accepts the matches that should match', () => {
    assert.equal(isCandidate('Codeforces Round 1136 (Div. 2)',
        'Codeforces Round 1136 (Div. 2) | Video Solutions | A - F | by Team TLE'), true);
    assert.equal(isCandidate('Biweekly Contest 196',
        'Leetcode Biweekly Contest 196 | Video Solutions | Q1 - Q4'), true);
    // A stray "1" in the title must not satisfy a Div. 1 contest.
    assert.equal(isCandidate('Codeforces Round 1136 (Div. 1)',
        'Codeforces Round 1136 (Div. 2) | Problems 1 - 5'), false);
    // Division must agree in both directions.
    assert.equal(isCandidate('Codeforces Round 1136', 'Codeforces Round 1136 (Div. 2) | Solutions'), false);
    // The "Rated for" qualifier does not block a match.
    assert.equal(isCandidate('Educational Codeforces Round 189 (Rated for Div. 2)',
        'Educational Codeforces Round 189 | Video Solutions'), true);
});

test('findBestMatch picks the closest candidate and nothing otherwise', () => {
    const videos = [
        video('Codeforces Round 1136 (Div. 1) | Solutions'),
        video('Codeforces Round 1136 (Div. 2) | Video Solutions | A - F'),
        video('Codeforces Round 1136 (Div. 2) | Part 2'),
    ];

    const match = findBestMatch('Codeforces Round 1136 (Div. 2)', videos);
    assert.ok(match, 'expected a match');
    assert.match(match.title, /Div\. 2/);

    assert.equal(findBestMatch('Codeforces Round 9999 (Div. 2)', videos), null);
    assert.equal(findBestMatch('Codeforces Round 1136 (Div. 3)', videos), null);
    assert.equal(findBestMatch('Some Untitled Event', videos), null);
});
