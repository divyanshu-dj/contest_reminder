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

/**
 * Drop the cached contest pages. The cron is the only writer of contest data,
 * so without this a refresh is invisible for up to the full cache TTL.
 *
 * ponytail: KEYS is O(number of keys) and blocks Redis. Fine at this key
 * count; if it grows, switch the cache keys to `contests:v{n}:...` and make
 * invalidation an INCR of the version counter.
 */
export const invalidateContestCache = async (): Promise<void> => {
    try {
        const keys = await redis.keys('contests:*');
        if (keys.length) await redis.del(...keys);
    } catch (error) {
        console.error('❌ Failed to invalidate contest cache:', error);
    }
};
