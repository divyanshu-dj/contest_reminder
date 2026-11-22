import mongoose, { Document } from 'mongoose';

/**
 * One row per connected Google account. Google's own sign-in is the identity
 * system here - the project has no user accounts of its own, and `googleSub` is
 * the stable subject identifier Google guarantees for an account (an email
 * address can change; the subject cannot).
 */
export interface ICalendarSync extends Document {
    googleSub: string;
    email: string;
    /** Encrypted with TOKEN_ENCRYPTION_KEY. Never logged, never returned by the API. */
    refreshToken: string;
    /** The secondary calendar this app created, so it can be removed wholesale. */
    calendarId: string | null;
    /** Empty means every platform. */
    platforms: string[];
    /** Minutes before the start time. Google allows at most 5, up to 4 weeks out. */
    reminderMinutes: number[];
    lastSyncedAt: Date | null;
    lastSyncError: string | null;
}

const CalendarSyncSchema = new mongoose.Schema<ICalendarSync>({
    googleSub: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    refreshToken: { type: String, required: true },
    calendarId: { type: String, default: null },
    platforms: { type: [String], default: [] },
    reminderMinutes: { type: [Number], default: [60] },
    lastSyncedAt: { type: Date, default: null },
    lastSyncError: { type: String, default: null },
}, { timestamps: true });

export const CalendarSync = mongoose.model<ICalendarSync>('CalendarSync', CalendarSyncSchema);
