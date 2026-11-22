import type { Request, Response } from 'express';
import { redis } from '../config/redis';
import { randomToken } from './secrets';

/**
 * Minimal server-side sessions, so a connected user is still recognised on a
 * later visit. The project has no accounts of its own - Google's sign-in during
 * the calendar connect flow is the identity - and this only has to answer one
 * question: which Google subject is this browser?
 *
 * Sessions live in Redis rather than in a signed token so that disconnecting
 * actually ends them. A stateless JWT cannot be revoked before it expires, which
 * would mean "Disconnect" left a usable credential behind.
 */

const COOKIE_NAME = 'cr_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const readCookie = (req: Request, name: string): string | null => {
    const header = req.headers.cookie;
    if (!header) return null;

    for (const part of header.split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return decodeURIComponent(rest.join('='));
    }
    return null;
};

/**
 * `Secure` is omitted over plain http, because a browser silently discards a
 * Secure cookie on an insecure origin - which would break local development in
 * a way that looks like a logic bug.
 */
const isSecureContext = (): boolean =>
    process.env.NODE_ENV === 'production'
    || (process.env.GOOGLE_REDIRECT_URI ?? '').startsWith('https://');

const serialiseCookie = (value: string, maxAgeSeconds: number): string => [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'HttpOnly',               // not readable from JavaScript, so an XSS cannot steal it
    'SameSite=Lax',           // still sent on the top-level redirect back from Google
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    ...(isSecureContext() ? ['Secure'] : []),
].join('; ');

export const startSession = async (res: Response, googleSub: string): Promise<void> => {
    const id = randomToken();
    await redis.set(`sess:${id}`, googleSub, 'EX', SESSION_TTL_SECONDS);
    res.setHeader('Set-Cookie', serialiseCookie(id, SESSION_TTL_SECONDS));
};

export const currentSubject = async (req: Request): Promise<string | null> => {
    const id = readCookie(req, COOKIE_NAME);
    if (!id) return null;

    try {
        return await redis.get(`sess:${id}`);
    } catch (error) {
        // Unlike the rate limiter, this fails closed: if we cannot confirm who
        // the caller is, they are nobody.
        console.error('Session lookup failed:', error);
        return null;
    }
};

export const endSession = async (req: Request, res: Response): Promise<void> => {
    const id = readCookie(req, COOKIE_NAME);
    if (id) {
        try { await redis.del(`sess:${id}`); } catch (error) { console.error('Session delete failed:', error); }
    }
    res.setHeader('Set-Cookie', serialiseCookie('', 0));
};

/** Short-lived store for the OAuth state and PKCE verifier between redirects. */
const OAUTH_STATE_TTL_SECONDS = 600;

export const saveOAuthState = async (state: string, verifier: string): Promise<void> => {
    await redis.set(`oauth:${state}`, verifier, 'EX', OAUTH_STATE_TTL_SECONDS);
};

/**
 * Single-use: the verifier is deleted as it is read, so a replayed callback
 * cannot be exchanged a second time.
 */
export const consumeOAuthState = async (state: unknown): Promise<string | null> => {
    if (typeof state !== 'string' || !state) return null;

    const key = `oauth:${state}`;
    const verifier = await redis.get(key);
    if (verifier) await redis.del(key);
    return verifier;
};
