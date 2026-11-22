import crypto from 'crypto';
import axios from 'axios';
import { Contest } from '../model/Contest';
import { CalendarSync, ICalendarSync } from '../model/CalendarSync';
import { decryptSecret } from './secrets';
import { describeError } from './http';
import { PLATFORMS } from './contestQuery';
import {
    CalendarEvent,
    calendarExists,
    createCalendar,
    googleConfig,
    refreshAccessToken,
    upsertEvent,
} from './googleCalendar';

/** Google rejects more than 5 overrides, or any offset beyond 4 weeks. */
export const MAX_REMINDERS = 5;
export const MAX_REMINDER_MINUTES = 40320;

export const REMINDER_PRESETS = [10, 30, 60, 180, 360, 1440, 2880] as const;

/**
 * Reminder offsets come from the client, and Google rejects the whole event if
 * any one of them is invalid - so they are normalised here rather than trusted:
 * integers only, inside Google's range, de-duplicated, sorted, and capped.
 */
export const normaliseReminders = (raw: unknown): number[] => {
    if (!Array.isArray(raw)) return [60];

    const minutes = raw
        .map(value => Math.floor(Number(value)))
        .filter(value => Number.isFinite(value) && value >= 0 && value <= MAX_REMINDER_MINUTES);

    const unique = [...new Set(minutes)].sort((a, b) => a - b);
    return unique.length > 0 ? unique.slice(0, MAX_REMINDERS) : [60];
};

export const normalisePlatforms = (raw: unknown): string[] => {
    if (!Array.isArray(raw)) return [];
    const requested = new Set(raw.map(value => String(value).toLowerCase()));
    return PLATFORMS.filter(platform => requested.has(platform));
};

/**
 * Google requires client-supplied event ids to be base32hex - lowercase a-v and
 * digits 0-9, 5 to 1024 characters. A hex digest satisfies that by construction,
 * so hashing the contest id gives a deterministic, collision-resistant id with
 * no encoding step and nothing to store: the same contest always maps to the
 * same event, which is what makes re-syncing idempotent.
 */
export const eventIdFor = (contestId: string): string =>
    crypto.createHash('sha256').update(contestId).digest('hex');

export const describeContest = (contest: {
    name: string; platform: string; url: string; startTime: Date; endTime: Date;
}): Omit<CalendarEvent, 'id' | 'reminderMinutes'> => ({
    summary: `[${contest.platform.toUpperCase()}] ${contest.name}`,
    description: `Coding contest on ${contest.platform}\n${contest.url}`,
    location: contest.url,
    startIso: contest.startTime.toISOString(),
    endIso: contest.endTime.toISOString(),
});

/** Sync one connected account. Returns how many events were written. */
const syncOne = async (subscription: ICalendarSync): Promise<number> => {
    const config = googleConfig();
    if (!config) throw new Error('Google OAuth is not configured');

    const accessToken = await refreshAccessToken(config, decryptSecret(subscription.refreshToken));

    // The user may have deleted the calendar from their own Google interface;
    // recreate it rather than failing every sync from then on.
    let calendarId = subscription.calendarId;
    if (!calendarId || !(await calendarExists(accessToken, calendarId))) {
        calendarId = await createCalendar(accessToken);
        subscription.calendarId = calendarId;
    }

    // Only contests that have not started: a reminder for a finished contest is
    // noise, and Google rejects reminders on events already in the past.
    const filter: Record<string, unknown> = { startTime: { $gt: new Date() } };
    if (subscription.platforms.length > 0) filter.platform = { $in: subscription.platforms };

    const contests = await Contest.find(filter).sort({ startTime: 1 }).limit(100).lean();

    let written = 0;
    for (const contest of contests) {
        try {
            await upsertEvent(accessToken, calendarId, {
                id: eventIdFor(contest.contestId),
                ...describeContest(contest),
                reminderMinutes: subscription.reminderMinutes,
            });
            written += 1;
        } catch (error) {
            // One bad event must not abandon the rest of the calendar.
            console.error(`Calendar event failed for ${contest.contestId}:`, describeError(error));
        }
    }

    return written;
};

/**
 * Called by the cron after contests are refreshed, so a newly announced contest
 * reaches every connected calendar without anyone pressing anything.
 */
export const syncAllCalendars = async (): Promise<void> => {
    if (!googleConfig()) {
        console.log('Google OAuth not configured - skipping calendar sync');
        return;
    }

    const subscriptions = await CalendarSync.find({});
    if (subscriptions.length === 0) return;

    console.log(`Syncing ${subscriptions.length} connected calendar(s)...`);

    for (const subscription of subscriptions) {
        try {
            const written = await syncOne(subscription);
            subscription.lastSyncedAt = new Date();
            subscription.lastSyncError = null;
            await subscription.save();
            console.log(`  ${subscription.email}: ${written} event(s) written`);
        } catch (error) {
            const message = describeError(error);

            // invalid_grant means the user revoked access or the token expired
            // for good. Retrying forever would be pointless, so the row is
            // removed and the user simply appears disconnected.
            const revoked = axios.isAxiosError(error)
                && error.response?.status === 400
                && JSON.stringify(error.response.data ?? '').includes('invalid_grant');

            if (revoked) {
                console.log(`  ${subscription.email}: access revoked, removing subscription`);
                await CalendarSync.deleteOne({ _id: subscription._id });
                continue;
            }

            subscription.lastSyncError = message.slice(0, 300);
            await subscription.save();
            console.error(`  ${subscription.email}: sync failed - ${message}`);
        }
    }
};

export const syncSubscriptionNow = async (googleSub: string): Promise<number> => {
    const subscription = await CalendarSync.findOne({ googleSub });
    if (!subscription) throw new Error('Not connected');

    const written = await syncOne(subscription);
    subscription.lastSyncedAt = new Date();
    subscription.lastSyncError = null;
    await subscription.save();
    return written;
};
