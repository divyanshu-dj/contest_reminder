import mongoose, { Document } from "mongoose";

interface IContest extends Document {
  contestId: string;
  name: string;
  platform: string;
  url: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  youtubeVideo?: string;
}

const ContestSchema = new mongoose.Schema<IContest>({
  contestId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  platform: { type: String, required: true },
  url: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },
  status: { type: String, enum: ["UPCOMING", "ONGOING", "COMPLETED"], required: true },
  youtubeVideo: { type: String },
});

const Contest = mongoose.model<IContest>("Contest", ContestSchema);
export { 
    Contest,
    IContest
}
