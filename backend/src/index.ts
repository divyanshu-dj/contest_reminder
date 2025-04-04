import Redis from 'ioredis';
import express from 'express';
import cors from 'cors';
import { Contest } from './model/Contest';
import connectDB from './config/db';
import { youtubeSolution } from './util/youtubeSolution';
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis(process.env.REDIS_URL || "", {
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: 5, 
  });

redis.on('error', (err) => {
    console.error('❌ Redis Error (event):', err);
});


redis.ping()
    .then(res => console.log("✅ Redis Connected:", res))
    .catch(err => console.error("❌ Redis Connection Error:", err));

const PAGE_SIZE = 30;
const CACHE_EXPIRY = 6 * 60 * 60; // 6 hours

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.get('/api/contests', async (req, res) => {
    try {
        let offset = parseInt(req.query?.offset as string) || 0;
        let limit = parseInt(req.query?.limit as string) || PAGE_SIZE;
        const cacheKey = `contests:${offset}:${limit}`;

        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            // console.log("✅ Cache Hit");
            res.json(JSON.parse(cachedData));
            return;
        }

        // console.log("⚡ Cache Miss: Fetching from DB...");
        const contests = await Contest.find({})
            .sort({ startTime: -1 })
            .skip(offset)
            .limit(limit);

        const totalContests = await Contest.countDocuments();

        const response = {
            contests,
            hasMore: offset + limit < totalContests
        };

        await redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_EXPIRY);

        res.json(response);
    } catch (error) {
        console.error("❌ Error fetching contests:", error);
        res.status(500).json({ error: "Failed to fetch contests" });
    }
});

//Update Contest with Solution URL
app.patch('/api/contests/:contestId/solution', async (req, res) => {
    const { contestId } = req.params;
    const { url } = req.body;

    try {
        const contest = await Contest.findOneAndUpdate(
            { contestId },
            { youtubeVideo: url },
            { new: true }
        );

        if (!contest) {
            res.status(404).json({ error: "Contest not found" });
            return;
        }

        // Clear Cache (Since contest data changed)
        await redis.keys('contests:*').then(keys => {
            if (keys.length) redis.del(...keys);
        });

        res.status(200).json(contest);
    } catch (error) {
        console.error("❌ Error adding solution URL:", error);
        res.status(500).json({ error: "Failed to add solution URL" });
    }
});

//Sync Contests from YouTube
app.post('/api/contests/sync', async (req, res) => {
    try {
        const contests = await youtubeSolution();
        console.log("✅ Contests Synced:", contests.length);

        // Clear Cache (Since data has changed)
        await redis.keys('contests:*').then(keys => {
            if (keys.length) redis.del(...keys);
        });

        res.status(200).json(contests);
    } catch (error) {
        console.error("❌ Error syncing contests:", error);
        res.status(500).json({ error: "Failed to sync contests" });
    }
});

app.listen(5000, () => console.log('🚀 Backend running'));

require('./util/cron');
