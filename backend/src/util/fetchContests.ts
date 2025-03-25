import { Contest, IContest } from '../model/Contest';
import axios from 'axios';

const API_ENDPOINTS = {
    codeforces: 'https://codeforces.com/api/contest.list',
    codechef: 'https://www.codechef.com/api/list/contests/all',
    leetcode: 'https://leetcode.com/graphql'
};

const fetchCodeforcesContests = async (): Promise<IContest[]> => {
    try {
        const { data } = await axios.get<any>("https://codeforces.com/api/contest.list");
        if (!data.result) {
            console.error('Invalid Codeforces API response:');
            return [];
        }
        console.log(data.result.length, 'Codeforces contests fetched');
        const contests = data.result
            .filter((contest: any) => contest.phase !== 'PENDING_SYSTEM_TEST')
            .map((contest: any) => {
                const startTimeMs = contest.startTimeSeconds * 1000;
                const endTimeMs = startTimeMs + (contest.durationSeconds * 1000);

                const statusMap: Record<string, IContest["status"]> = {
                    BEFORE: "UPCOMING",
                    CODING: "ONGOING",
                    SYSTEM_TEST: "ONGOING",
                    FINISHED: "COMPLETED",
                };
                return {
                    contestId: `cf_${contest.id}`,
                    name: contest.name,
                    platform: 'codeforces',
                    url: `https://codeforces.com/contest/${contest.id}`,
                    startTime: new Date(startTimeMs).toISOString(),
                    endTime: new Date(endTimeMs).toISOString(),
                    duration: contest.durationSeconds,
                    status: statusMap[contest.phase] || "UPCOMING"
                };
            });

        return contests;
    }
    catch (error) {
        console.error("Codeforces API error:", error);
        return [];
    }
}


const fetchCodechefContests = async (): Promise<IContest[]> => {
    try {
        const { data } = await axios.get<any>(API_ENDPOINTS.codechef);

        console.log(data.future_contests.length, 'CodeChef future contests fetched');
        console.log(data.present_contests.length, 'CodeChef present contests fetched');
        
        // const fetchPastContests = async (offset = 600, allPastContests: any[] = []): Promise<IContest[]> => {
        //     const pastUrl = `https://www.codechef.com/api/list/contests/past?sort_by=START&sorting_order=desc&offset=${offset}&mode=all`;
        //     const { data } = await axios.get<any>(pastUrl);
        //     // console.log(data.contests)
        //     if (offset == 700) {
        //         console.log(`Fetched ${offset} ${allPastContests.length} past contests.`);
        //         return allPastContests; 
        //     }
        //     console.log(allPastContests.length, ' ', offset, 'ALL CodeChef past contests fetched');
        //     return fetchPastContests(offset + 20, [...allPastContests, ...data.contests]);
        // };
        
        // const pastContests = await fetchPastContests();

        // console.log(pastContests.length, 'CodeChef past contests fetched');
        console.log(data.past_contests.length, 'CodeChef past contests fetched');

        const processContest = (contest: any, status: string) => {
            if (!contest?.contest_code || !contest?.contest_name) {
                console.warn('Skipping invalid contest:', contest);
                return null;
            }

            try {
                // Use ISO dates directly from the API response
                const startTime = new Date(contest.contest_start_date_iso).getTime();
                const endTime = new Date(contest.contest_end_date_iso).getTime();
                const duration = (endTime - startTime) / 1000; // Convert to seconds

                return {
                    contestId: `cc_${contest.contest_code}`,
                    name: contest.contest_name,
                    platform: "codechef",
                    url: `https://www.codechef.com/${contest.contest_code}`,
                    startTime: contest.contest_start_date_iso,
                    endTime: contest.contest_end_date_iso,
                    duration,
                    status: status.toUpperCase()
                };
            } catch (error) {
                console.error('Error processing contest:', error);
                return null;
            }
        };

        const contests = [
            ...(data.future_contests?.map((c: any) => processContest(c, "UPCOMING")) || []),
            ...(data.present_contests?.map((c: any) => processContest(c, "ONGOING")) || []),
            ...(data.past_contests?.map((c: any) => processContest(c, "COMPLETED")) || [])
            // ...(pastContests?.map((c: any) => processContest(c, "COMPLETED")) || [])
        ].filter(Boolean);

        return contests;
    } catch (error) {
        console.error("CodeChef API error:", error);
        return [];
    }
}


const fetchLeetcodeContests = async (): Promise<IContest[]> => {
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

        const data = response.data.data.allContests;
        console.log(data.length, 'LeetCode contests fetched');
        const now = Date.now();

        const activeContests = data.map((contest: any) => {
            const startTime = contest.startTime * 1000;
            const durationMs = contest.duration * 1000;
            const endTime = startTime + durationMs;


            let status: IContest['status'] = 'UPCOMING';
            if (now > endTime) {
                status = 'COMPLETED';
            } else if (now >= startTime && now <= endTime) {
                status = 'ONGOING';
            }

            return {
                contestId: `lc_${contest.titleSlug}`,
                platform: 'leetcode',
                name: contest.title,
                url: `https://leetcode.com/contest/${contest.titleSlug}`,
                startTime: new Date(startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                duration: contest.duration,
                status
            };
        });

        return activeContests;
    } catch (error: any) {
        console.error('API Error:', error.response.status, error.response.data);
        return [];
    }
};

const fetchAllContests = async () => {
    try {
        const [codeforces, codechef, leetcode] = await Promise.all([
          fetchCodeforcesContests(),
          fetchCodechefContests(),
          fetchLeetcodeContests()
        ]);
    
        // Combine all contests
        const contests = [...codeforces, ...codechef, ...leetcode];
        console.log('All contests fetched:', contests.length);

        await Promise.all(contests.map(async (contest) => {
            try {
                await Contest.findOneAndUpdate(
                    { contestId: contest.contestId },
                    { $set: contest },
                    { upsert: true, new: true }
                );
            } catch (error) {
                console.error(`Failed to update contest ${contest.contestId}:`, error);
            }
        }));
        console.log('Contests updated successfully!');
      } catch (error) {
        console.error('Error fetching contests:', error);
        return [];
      }
};

export default fetchAllContests;