import stringSimilarity from 'string-similarity';
import { IYoutubeVideo } from './types';

/**
 * Matching contests to editorial videos by title.
 *
 * The previous implementation lowercased both sides, discarded everything after
 * the first '(', and then asked whether the video title *contained* the contest
 * name as a substring. On real data that produced 142 links from 94 distinct
 * videos - about a third of them wrong:
 *
 *   - "Biweekly Contest 1" is a substring of "Biweekly Contest 196", so
 *     low-numbered contests stole videos from high-numbered ones.
 *   - "weekly contest 196" is a substring of "biweekly contest 196", so Weekly
 *     contests matched Biweekly videos.
 *   - Dropping everything after '(' collapsed "Round 1136 (Div. 1)" and
 *     "(Div. 2)" into the same key, so both got the same video.
 *
 * Instead we reduce each title to a signature and require the identifying parts
 * to agree exactly. A missed link is a small gap in the UI; a wrong link sends
 * someone to the editorial for a different contest.
 */

export interface Signature {
    /** The contest number, e.g. "1136" in "Codeforces Round 1136". */
    number: string | null;
    /** Division, when the title names one. "Rated for Div. 2" is not one. */
    division: string | null;
    /** Words appearing before the contest number: "educational", "biweekly", ... */
    kind: string[];
}

export const tokenize = (text: string): string[] =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);

const isNumber = (token: string): boolean => /^\d+$/.test(token);

/**
 * "Educational Codeforces Round 189 (Rated for Div. 2)" is one contest, not the
 * Div. 2 half of a split round - the phrase describes who is rated, so it must
 * not become part of the signature.
 */
const isRatedForPhrase = (tokens: string[], divIndex: number): boolean =>
    tokens[divIndex - 1] === 'for' && tokens[divIndex - 2] === 'rated';

export const signatureOf = (text: string): Signature => {
    const tokens = tokenize(text);

    let number: string | null = null;
    let division: string | null = null;

    const anchor = tokens.findIndex(t => t === 'round' || t === 'contest');
    if (anchor >= 0 && isNumber(tokens[anchor + 1] ?? '')) {
        number = tokens[anchor + 1];
    } else {
        number = tokens.find(isNumber) ?? null;
    }

    for (let i = 0; i < tokens.length; i++) {
        if ((tokens[i] === 'div' || tokens[i] === 'division') && isNumber(tokens[i + 1] ?? '')) {
            if (!isRatedForPhrase(tokens, i)) division = tokens[i + 1];
            break;
        }
    }

    const numberIndex = number === null ? tokens.length : tokens.indexOf(number);
    const kind = tokens.slice(0, numberIndex).filter(t => !isNumber(t));

    return { number, division, kind };
};

/**
 * A video is a candidate when the contest number matches exactly, the division
 * matches exactly (both absent counts as a match), and every word identifying
 * the contest also appears in the video title. Numbers are compared as whole
 * tokens, never as substrings.
 */
export const isCandidate = (contestName: string, videoTitle: string): boolean => {
    const contest = signatureOf(contestName);
    const video = signatureOf(videoTitle);

    if (contest.number === null || contest.number !== video.number) return false;
    if (contest.division !== video.division) return false;

    const videoTokens = new Set(tokenize(videoTitle));
    return contest.kind.every(word => videoTokens.has(word));
};

/**
 * Highest title similarity among the candidates. Ranking only ever chooses
 * between videos that already satisfy isCandidate, so similarity cannot promote
 * a wrong contest - it just makes the choice deterministic when a playlist
 * holds several videos for one contest (part 1 / part 2, re-uploads).
 */
export const findBestMatch = (contestName: string, videos: IYoutubeVideo[]): IYoutubeVideo | null => {
    const candidates = videos.filter(video => isCandidate(contestName, video.title));
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const target = tokenize(contestName).join(' ');
    return candidates.reduce((best, video) =>
        stringSimilarity.compareTwoStrings(target, tokenize(video.title).join(' ')) >
        stringSimilarity.compareTwoStrings(target, tokenize(best.title).join(' '))
            ? video
            : best
    );
};
