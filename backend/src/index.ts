import express from 'express';
import cors from 'cors';
import { Contest } from './model/Contest';
import connectDB from './config/db';
import { redis, invalidateContestCache, contestCacheVersion, cacheGet, cacheSet } from './config/redis';
import { isAllowedYoutubeUrl } from './util/validate';
import { rateLimit, requireAdmin } from './util/guards';
import { statusFor } from './util/status';
import {
    buildContestFilter,
    cacheKeyFor,
    clampLimit,
    decodeCursor,
    encodeCursor,
    parsePlatforms,
    parseSearch,
    parseStatus,
} from './util/contestQuery';
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
        const limit = clampLimit(req.query?.limit, PAGE_SIZE);
        const query = {
            platforms: parsePlatforms(req.query?.platforms),
            status: parseStatus(req.query?.status),
            search: parseSearch(req.query?.q),
            cursor: decodeCursor(req.query?.cursor),
        };

        const cacheKey = cacheKeyFor(query, limit, await contestCacheVersion());
        const cached = cacheKey ? await cacheGet(cacheKey) : null;

        let page: { contests: any[]; nextCursor: string | null; hasMore: boolean };

        if (cached) {
            page = JSON.parse(cached);
        } else {
            // One extra row tells us whether another page exists, which replaces
            // a countDocuments() on every cache miss.
            const docs = await Contest.find(buildContestFilter(query, new Date()))
                .sort({ startTime: -1, _id: -1 })
                .limit(limit + 1)
                .lean();

            const hasMore = docs.length > limit;
            const rows = hasMore ? docs.slice(0, limit) : docs;

            page = {
                contests: rows,
                nextCursor: hasMore && rows.length > 0 ? encodeCursor(rows[rows.length - 1]) : null,
                hasMore,
            };

            if (cacheKey) await cacheSet(cacheKey, JSON.stringify(page), CACHE_EXPIRY);
        }

        // Status is attached after the cache, never inside it. Caching a derived
        // status would just reintroduce the staleness the derivation removes -
        // a contest would still claim to be UPCOMING for the length of the TTL.
        const now = new Date();
        res.json({
            contests: page.contests.map(contest => ({
                ...contest,
                status: statusFor(new Date(contest.startTime), new Date(contest.endTime), now),
            })),
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
        });
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
