import { Contest } from '../model/Contest';
import axios from 'axios';
import { describeError } from './http';

const API_ENDPOINTS = {
    codeforces: 'https://codeforces.com/api/contest.list',
    codechef: 'https://www.codechef.com/api/list/contests/all',
    leetcode: 'https://leetcode.com/graphql'
};

/** Shape we upsert. No `status` - it is derived on read from these two dates. */
interface FetchedContest {
    contestId: string;
    name: string;
    platform: string;
    url: string;
    startTime: Date;
    endTime: Date;
    duration: number;
}

const validDates = (start: Date, end: Date): boolean =>
    !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;

const fetchCodeforcesContests = async (): Promise<FetchedContest[]> => {
    try {
        const { data } = await axios.get<any>(API_ENDPOINTS.codeforces);
        if (!data.result) {
            console.error('Invalid Codeforces API response');
            return [];
        }

        const contests = data.result
            .filter((contest: any) => contest.phase !== 'PENDING_SYSTEM_TEST')
            .map((contest: any): FetchedContest | null => {
                const startTime = new Date(contest.startTimeSeconds * 1000);
                const endTime = new Date(startTime.getTime() + contest.durationSeconds * 1000);
                if (!validDates(startTime, endTime)) return null;

                return {
                    contestId: `cf_${contest.id}`,
                    name: contest.name,
                    platform: 'codeforces',
                    url: `https://codeforces.com/contest/${contest.id}`,
                    startTime,
                    endTime,
                    duration: contest.durationSeconds,
                };
            })
            .filter(Boolean) as FetchedContest[];

        console.log(contests.length, 'Codeforces contests fetched');
        return contests;
    } catch (error) {
        console.error('Codeforces API error:', describeError(error));
        return [];
    }
};

const fetchCodechefContests = async (): Promise<FetchedContest[]> => {
    try {
        const { data } = await axios.get<any>(API_ENDPOINTS.codechef);

        const processContest = (contest: any): FetchedContest | null => {
            if (!contest?.contest_code || !contest?.contest_name) {
                console.warn('Skipping invalid contest:', contest?.contest_code ?? '(no code)');
                return null;
            }

            // These arrive offset-bearing, e.g. 2026-11-23T19:00:00+05:30.
            const startTime = new Date(contest.contest_start_date_iso);
            const endTime = new Date(contest.contest_end_date_iso);
            if (!validDates(startTime, endTime)) {
                console.warn('Skipping contest with unparseable dates:', contest.contest_code);
                return null;
            }

            return {
                contestId: `cc_${contest.contest_code}`,
                name: contest.contest_name,
                platform: 'codechef',
                url: `https://www.codechef.com/${contest.contest_code}`,
                startTime,
                endTime,
                duration: (endTime.getTime() - startTime.getTime()) / 1000,
            };
        };

        const contests = [
            ...(data.future_contests ?? []),
            ...(data.present_contests ?? []),
            ...(data.past_contests ?? []),
        ].map(processContest).filter(Boolean) as FetchedContest[];

        console.log(contests.length, 'CodeChef contests fetched');
        return contests;
    } catch (error) {
        console.error('CodeChef API error:', describeError(error));
        return [];
    }
};

const fetchLeetcodeContests = async (): Promise<FetchedContest[]> => {
    const query = {
        query: `
          {
            allContests {
              title
              titleSlug
              startTime
              duration
            }
          }
        `
    };

    try {
        const response = await axios.post<any>(API_ENDPOINTS.leetcode, query, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com/'
            }
        });

        const all = response.data?.data?.allContests;
        if (!Array.isArray(all)) {
            console.error('Invalid LeetCode API response');
            return [];
        }

        const contests = all.map((contest: any): FetchedContest | null => {
            const startTime = new Date(contest.startTime * 1000);
            const endTime = new Date(startTime.getTime() + contest.duration * 1000);
            if (!validDates(startTime, endTime)) return null;

            return {
                contestId: `lc_${contest.titleSlug}`,
                platform: 'leetcode',
                name: contest.title,
                url: `https://leetcode.com/contest/${contest.titleSlug}`,
                startTime,
                endTime,
                duration: contest.duration,
            };
        }).filter(Boolean) as FetchedContest[];

        console.log(contests.length, 'LeetCode contests fetched');
        return contests;
    } catch (error) {
        console.error('LeetCode API error:', describeError(error));
        return [];
    }
};

const fetchAllContests = async (): Promise<void> => {
    try {
        const [codeforces, codechef, leetcode] = await Promise.all([
            fetchCodeforcesContests(),
            fetchCodechefContests(),
            fetchLeetcodeContests()
        ]);

        const contests = [...codeforces, ...codechef, ...leetcode];
        console.log('All contests fetched:', contests.length);

        if (contests.length === 0) {
            console.warn('No contests fetched from any source - leaving existing data alone');
            return;
        }

        // One round trip. This previously issued a findOneAndUpdate per contest
        // inside Promise.all - ~3000 concurrent queries against the connection pool.
        const result = await Contest.bulkWrite(
            contests.map(contest => ({
                updateOne: {
                    filter: { contestId: contest.contestId },
                    update: { $set: contest },
                    upsert: true,
                }
            })),
            { ordered: false }
        );

        console.log(
            `Contests updated: ${result.upsertedCount} inserted, ${result.modifiedCount} modified`
        );
    } catch (error) {
        console.error('Error fetching contests:', describeError(error));
    }
};

export default fetchAllContests;
