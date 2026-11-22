
import { Contest, IContest } from '../model/Contest';
import axios from 'axios';
import { describeError } from './http';
import { IYouTubeApiResponse, IYoutubeVideo } from './types';
import { findBestMatch } from './matchSolution';

const YT_PLAYLIST = {
    codeforces: 'PLcXpkI9A-RZLUfBSNp-YQBCOezZKbDSgB',
    codechef: 'PLcXpkI9A-RZIZ6lsE0KCcLWeKNoG45fYr',
    leetcode: 'PLcXpkI9A-RZI6FhydNz3JBt_-p_i25Cbr'
}

const fetchVideos = async (playlistId: string): Promise<IYoutubeVideo[]> => {
    try {
        const { data } = await axios.get<IYouTubeApiResponse>(
            'https://www.googleapis.com/youtube/v3/playlistItems',
            {
                params: {
                    part: 'snippet',
                    fields: 'items(snippet(title,resourceId/videoId))',
                    maxResults: 50,
                    key: process.env.YOUTUBE_API_KEY,
                    playlistId
                }
            }
        );
        console.log('Videos fetched:', data.items.length);
        return data.items.map((item: { snippet: { title: string; resourceId: { videoId: string } } }) => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        }));
    } catch (error) {
        console.error('Error fetching playlist:', describeError(error));
        return [];
    }
}

export const youtubeSolution = async (): Promise<IContest[]> => {
    try {
        const [codeforces, codechef, leetcode] = await Promise.all([
            fetchVideos(YT_PLAYLIST.codeforces),
            fetchVideos(YT_PLAYLIST.codechef),
            fetchVideos(YT_PLAYLIST.leetcode)
        ]);

        const platformVideos = {
            codeforces,
            codechef,
            leetcode
        };

        const contests = await Contest.find({
            endTime: { $lt: new Date() },
            youtubeVideo: { $exists: false }
        });
        console.log('Contests fetched:', contests.length);

        const bulkOps = contests
            .map(contest => {
                const videos = platformVideos[contest.platform as keyof typeof platformVideos];
                const match = findBestMatch(contest.name, videos);
                
                return match ? {
                    updateOne: {
                        filter: { _id: contest._id },
                        update: { $set: { youtubeVideo: match.url } }
                    }
                } : null;
            })
            .filter(op => op !== null);

        // Execute bulk update
        if (bulkOps.length > 0) {
            await Contest.bulkWrite(bulkOps as any);
            console.log(`Updated ${bulkOps.length} contests with YouTube links`);
        }

        return contests;
    } catch (error) {
        console.error('Error matching YouTube solutions:', describeError(error));
        return [];
    }
};

