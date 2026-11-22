import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedYoutubeUrl } from './validate';

test('isAllowedYoutubeUrl accepts only https YouTube links', () => {
    assert.equal(isAllowedYoutubeUrl('https://www.youtube.com/watch?v=abc'), true);
    assert.equal(isAllowedYoutubeUrl('https://youtu.be/abc'), true);
    assert.equal(isAllowedYoutubeUrl('https://YouTu.be/abc'), true);

    // the stored-XSS vector: this value lands in an <a href>
    assert.equal(isAllowedYoutubeUrl('javascript:alert(1)'), false);
    assert.equal(isAllowedYoutubeUrl('data:text/html,<script>alert(1)</script>'), false);
    // http is rejected, and so is a lookalike host
    assert.equal(isAllowedYoutubeUrl('http://www.youtube.com/watch?v=abc'), false);
    assert.equal(isAllowedYoutubeUrl('https://youtube.com.evil.test/watch?v=abc'), false);
    assert.equal(isAllowedYoutubeUrl('https://evil.test/?x=youtube.com'), false);
    assert.equal(isAllowedYoutubeUrl('not a url'), false);
    assert.equal(isAllowedYoutubeUrl(undefined), false);
    assert.equal(isAllowedYoutubeUrl(42), false);
});
