import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type Redis from 'ioredis';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest();

const matchesSecret = (provided: string, expected: string): boolean =>
  // Hash first so both buffers are 32 bytes; timingSafeEqual throws on length mismatch
  // and a raw length comparison would leak the secret's length.
  crypto.timingSafeEqual(sha256(provided), sha256(expected));

/**
 * Shared-secret gate for the write endpoints. Fails closed: if ADMIN_TOKEN is
 * unset the routes are unreachable rather than public.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    console.error('ADMIN_TOKEN is not set - refusing admin request');
    res.status(503).json({ error: 'Admin endpoints are not configured' });
    return;
  }

  const header = req.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!provided || !matchesSecret(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

interface RateLimitOptions {
  prefix: string;
  windowSec: number;
  max: number;
}

/**
 * Fixed-window per-IP rate limiter backed by the Redis instance we already run.
 * ponytail: fixed window, not sliding - a caller can burst 2x across a window
 * boundary. Swap for a sliding window (sorted set) only if that matters.
 * Fails open on Redis errors: a cache outage shouldn't take the API down.
 */
export const rateLimit =
  (redis: Redis, { prefix, windowSec, max }: RateLimitOptions) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rl:${prefix}:${req.ip}`;
      const hits = await redis.incr(key);
      if (hits === 1) await redis.expire(key, windowSec);

      if (hits > max) {
        res.status(429).json({ error: 'Too many requests' });
        return;
      }
    } catch (error) {
      console.error('Rate limiter degraded (allowing request):', error);
    }

    next();
  };
