import express from 'express';
import cors from 'cors';
import { Contest } from './model/Contest';
import connectDB from './config/db';
import { redis, invalidateContestCache } from './config/redis';
import { clampPagination, isAllowedYoutubeUrl } from './util/validate';
import { rateLimit, requireAdmin } from './util/guards';
import dotenv from "dotenv";

dotenv.config();

const PAGE_SIZE = 30;
const CACHE_EXPIRY = 6 * 60 * 60; // 6 hours

const app = express();

// Behind nginx (and Cloudflare) - trust exactly one hop so req.ip is the
// client address nginx sets, not the loopback proxy address. Trusting more
// hops would let a client spoof its own IP via X-Forwarded-For.
app.set('trust proxy', 1);

// The read API is intentionally public and cross-origin; the write endpoint
// below is gated by requireAdmin, not by origin.
app.use(cors());
app.use(express.json({ limit: '16kb' }));

if (!process.env.ADMIN_TOKEN) {
    console.warn('⚠️  ADMIN_TOKEN is not set - the admin endpoint will reject all requests');
}

connectDB();

app.get('/api/contests', rateLimit(redis, { prefix: 'read', windowSec: 60, max: 120 }), async (req, res) => {
    try {
        const { offset, limit } = clampPagination(req.query?.offset, req.query?.limit, PAGE_SIZE);
        const cacheKey = `contests:${offset}:${limit}`;

        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            res.json(JSON.parse(cachedData));
            return;
        }

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

// Manually attach a solution video, for the cases the cron's matcher misses.
// This is the only write endpoint; YouTube solution syncing runs on the cron.
app.patch(
    '/api/contests/:contestId/solution',
    rateLimit(redis, { prefix: 'solution', windowSec: 60, max: 30 }),
    requireAdmin,
    async (req, res) => {
        const { contestId } = req.params;
        const { url } = req.body ?? {};

        // This value is rendered into an <a href> by the frontend, so the
        // allowlist is enforced here rather than trusting the client's regex.
        if (!isAllowedYoutubeUrl(url)) {
            res.status(400).json({ error: "url must be an https YouTube link" });
            return;
        }

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

            await invalidateContestCache();

            res.status(200).json(contest);
        } catch (error) {
            console.error("❌ Error adding solution URL:", error);
            res.status(500).json({ error: "Failed to add solution URL" });
        }
    }
);

// macOS binds :5000 to the AirPlay Receiver, so the local default sidesteps it.
// The containers pin PORT=5000 explicitly (docker-compose.yml, deploy.yml)
// because nginx on the host proxies to that port.
const DEFAULT_PORT = 5055;
const PORT = Number(process.env.PORT) || DEFAULT_PORT;
app.listen(PORT, () => console.log(`🚀 Backend running on :${PORT}`));

require('./util/cron');
