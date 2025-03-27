import express from 'express';
import cors from 'cors';
import { Contest } from './model/Contest';
import connectDB from './config/db';
import { youtubeSolution } from './util/youtubeSolution';

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.get('/api/contests', async (req, res) => {
    try {
        let offset = parseInt(req.query?.offset as string) || 0;
        let limit = parseInt(req.query?.limit as string) || 30;

        const contests = await Contest.find({})
            .sort({ startTime: -1 })  // Sort by startTime
            .skip(offset)
            .limit(limit);

        const totalContests = await Contest.countDocuments();

        // console.log("Contests fetched:", contests.length);
        res.json({
            contests,
            hasMore: offset + limit < totalContests
        });
    } catch (error) {
        console.error("Error fetching contests:", error);
        res.status(500).json({ error: "Failed to fetch contests" });
    }
});

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
        }
        
        res.status(200).json(contest);
    } catch (error) {
        console.error("Error adding solution URL:", error);
        res.status(500).json({ error: "Failed to add solution URL" });
    }
});

app.post('/api/contests/sync', async (req, res) => {
    try {
        const contests = await youtubeSolution();
        console.log("Contests synced:", contests.length);
        res.status(200).json(contests);
    } catch (error) {
        console.error("Error syncing contests:", error);
        res.status(500).json({ error: "Failed to sync contests" });
    }
});

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));

require('./util/cron');