import { Types } from 'mongoose';

export const PLATFORMS = ['codeforces', 'codechef', 'leetcode'] as const;
export type Platform = typeof PLATFORMS[number];

export const STATUSES = ['all', 'upcoming', 'ongoing', 'completed'] as const;
export type StatusFilter = typeof STATUSES[number];

const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;

/** Caller-supplied text goes into a RegExp, so metacharacters must be escaped. */
export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const clampLimit = (raw: unknown, defaultLimit: number): number => {
    const limit = Math.floor(Number(raw));
    return Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : defaultLimit;
};

export const parsePlatforms = (raw: unknown): Platform[] => {
    if (typeof raw !== 'string' || !raw) return [];
    const requested = new Set(raw.split(',').map(p => p.trim().toLowerCase()));
    return PLATFORMS.filter(p => requested.has(p));
};

export const parseStatus = (raw: unknown): StatusFilter =>
    typeof raw === 'string' && (STATUSES as readonly string[]).includes(raw)
        ? (raw as StatusFilter)
        : 'all';

export const parseSearch = (raw: unknown): string =>
    typeof raw === 'string' ? raw.trim().slice(0, MAX_SEARCH_LENGTH) : '';

export interface Cursor {
    startTime: Date;
    id: Types.ObjectId;
}

/**
 * Rows are paginated by (startTime, _id) rather than by a numeric offset.
 * startTime alone is not unique - contests on different platforms start at the
 * same instant - so _id breaks the tie and keeps the sequence total.
 *
 * skip()/limit() was unstable here: the cron inserts rows between a visitor's
 * page requests, which shifts every later row and makes the infinite scroll
 * repeat or skip contests.
 */
export const encodeCursor = (doc: { startTime: Date; _id: unknown }): string =>
    Buffer.from(`${doc.startTime.toISOString()}|${String(doc._id)}`).toString('base64url');

export const decodeCursor = (raw: unknown): Cursor | null => {
    if (typeof raw !== 'string' || !raw) return null;

    try {
        const [iso, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
        const startTime = new Date(iso);
        if (Number.isNaN(startTime.getTime()) || !Types.ObjectId.isValid(id)) return null;
        return { startTime, id: new Types.ObjectId(id) };
    } catch {
        return null;
    }
};

export interface ContestQuery {
    platforms: Platform[];
    status: StatusFilter;
    search: string;
    cursor: Cursor | null;
}

/**
 * Status is not a stored field, so filtering by it means comparing dates. This
 * keeps the one definition of "ongoing" in step with util/status.ts: the window
 * is inclusive at both ends.
 */
export const buildContestFilter = (query: ContestQuery, now: Date): Record<string, unknown> => {
    const clauses: Record<string, unknown>[] = [];

    if (query.platforms.length > 0) {
        clauses.push({ platform: { $in: query.platforms } });
    }

    if (query.status === 'upcoming') {
        clauses.push({ startTime: { $gt: now } });
    } else if (query.status === 'ongoing') {
        clauses.push({ startTime: { $lte: now }, endTime: { $gte: now } });
    } else if (query.status === 'completed') {
        clauses.push({ endTime: { $lt: now } });
    }

    if (query.search) {
        clauses.push({ name: { $regex: escapeRegex(query.search), $options: 'i' } });
    }

    if (query.cursor) {
        clauses.push({
            $or: [
                { startTime: { $lt: query.cursor.startTime } },
                { startTime: query.cursor.startTime, _id: { $lt: query.cursor.id } },
            ],
        });
    }

    // $and rather than a merged object: several clauses constrain startTime, and
    // merging them would silently drop all but the last.
    return clauses.length > 0 ? { $and: clauses } : {};
};

/**
 * Only the unfiltered-by-text first page is cached. Search terms and cursors are
 * caller-controlled and unbounded, so keying the cache on them would let anyone
 * fill Redis with single-use entries; platform and status are small enums.
 */
export const cacheKeyFor = (query: ContestQuery, limit: number, version: string): string | null => {
    if (query.search || query.cursor) return null;
    return `contests:v${version}:${query.platforms.join('+') || 'all'}:${query.status}:${limit}`;
};
