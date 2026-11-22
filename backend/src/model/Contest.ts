import mongoose, { Document } from "mongoose";

interface IContest extends Document {
  contestId: string;
  name: string;
  platform: string;
  url: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  youtubeVideo?: string;
}

const ContestSchema = new mongoose.Schema<IContest>({
  contestId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  platform: { type: String, required: true },
  url: { type: String, required: true },
  // Stored as Date, not String. As strings these sorted lexicographically, which
  // is wrong the moment two sources disagree on format - CodeChef reports
  // offset-bearing timestamps (+05:30) while Codeforces reports UTC (Z).
  startTime: { type: Date, required: true, index: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true },
  // No `status` field: it is derived from the clock on read. See util/status.ts.
  youtubeVideo: { type: String },
});

const Contest = mongoose.model<IContest>("Contest", ContestSchema);
export { 
    Contest,
    IContest
}
