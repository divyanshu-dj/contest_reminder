import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redis = new Redis(process.env.REDIS_URL || '', {
    retryStrategy(times) {
        return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: 5,
});

redis.on('error', (err) => {
    console.error('❌ Redis Error (event):', err);
});

redis.ping()
    .then(res => console.log('✅ Redis Connected:', res))
    .catch(err => console.error('❌ Redis Connection Error:', err));

const VERSION_KEY = 'contests:version';

/**
 * Cache keys are namespaced by this counter, so invalidation is a single INCR
 * rather than a KEYS scan - KEYS is O(number of keys) and blocks Redis while
 * it runs. Stale entries under the old version are never read again and expire
 * on their own TTL.
 */
export const contestCacheVersion = async (): Promise<string> => {
    try {
        return (await redis.get(VERSION_KEY)) ?? '0';
    } catch (error) {
        console.error('❌ Failed to read cache version:', error);
        return 'unavailable';
    }
};

export const invalidateContestCache = async (): Promise<void> => {
    try {
        await redis.incr(VERSION_KEY);
    } catch (error) {
        console.error('❌ Failed to invalidate contest cache:', error);
    }
};

/**
 * Cache access is best-effort on both sides. A Redis outage used to surface as
 * a 500 from the only public read endpoint, because the rejected get() landed
 * in the route's catch block; now it degrades to a cache miss and the request
 * is served from Mongo.
 */
export const cacheGet = async (key: string): Promise<string | null> => {
    try {
        return await redis.get(key);
    } catch (error) {
        console.error('❌ Cache read failed (serving uncached):', error);
        return null;
    }
};

export const cacheSet = async (key: string, value: string, ttlSeconds: number): Promise<void> => {
    try {
        await redis.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
        console.error('❌ Cache write failed:', error);
    }
};
