import express from 'express';
import cors from 'cors';
// import contestRoutes from './routes/contestRoutes';
import { Contest } from './model/Contest';
import connectDB from './config/db';

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.get('/api/contests', async (req, res) => {
    try {
        const contests = await Contest.find();
        console.log("Contests fetched:", contests.length);
        res.status(200).json(contests);
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

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));

require('./util/cron');