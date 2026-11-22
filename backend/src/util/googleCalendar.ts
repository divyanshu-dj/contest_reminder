import crypto from 'crypto';
import axios from 'axios';
import { describeError } from './http';

/**
 * Google OAuth and Calendar access over plain HTTPS.
 *
 * The `googleapis` package would do this too, but the whole surface used here is
 * three documented endpoints - a token exchange, a calendar insert and an event
 * insert - so it is not worth a multi-megabyte dependency and the axios client
 * already in the project.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * Least privilege: `calendar.app.created` grants access only to calendars this
 * app itself created, so connecting cannot touch the user's existing calendars.
 * (If Google's verification requirements ever force a change, the broader
 * equivalent is `calendar.events`.)
 */
const SCOPES = [
    'openid',
    'email',
    'https://www.googleapis.com/auth/calendar.app.created',
].join(' ');

export const CALENDAR_NAME = 'Contest Reminder';

export interface GoogleConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export const googleConfig = (): GoogleConfig | null => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) return null;
    return { clientId, clientSecret, redirectUri };
};

/** PKCE: the verifier never leaves the server, only its hash goes to Google. */
export const createPkcePair = (): { verifier: string; challenge: string } => {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
};

export const buildAuthUrl = (
    config: GoogleConfig,
    state: string,
    codeChallenge: string
): string => {
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: SCOPES,
        // offline + consent is what actually yields a refresh token; without
        // both, a returning user gets only a one-hour access token and the
        // background sync has nothing durable to work with.
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    return `${AUTH_ENDPOINT}?${params.toString()}`;
};

export interface TokenResponse {
    accessToken: string;
    refreshToken: string | null;
    googleSub: string;
    email: string;
}

/**
 * The id_token is read without verifying its signature, which is correct here
 * and only here: it arrives in the response body of a TLS-authenticated call to
 * Google's own token endpoint, not from the browser. An id_token received by any
 * other route must be verified against Google's JWKS.
 */
const readIdentity = (idToken: string): { sub: string; email: string } => {
    const payload = idToken.split('.')[1];
    if (!payload) throw new Error('id_token has no payload');

    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.sub) throw new Error('id_token has no subject');

    return { sub: String(claims.sub), email: String(claims.email ?? '') };
};

export const exchangeCode = async (
    config: GoogleConfig,
    code: string,
    codeVerifier: string
): Promise<TokenResponse> => {
    const { data } = await axios.post<any>(TOKEN_ENDPOINT, new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const identity = readIdentity(data.id_token);

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        googleSub: identity.sub,
        email: identity.email,
    };
};

export const refreshAccessToken = async (
    config: GoogleConfig,
    refreshToken: string
): Promise<string> => {
    const { data } = await axios.post<any>(TOKEN_ENDPOINT, new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    return data.access_token;
};

export const revokeToken = async (refreshToken: string): Promise<void> => {
    try {
        await axios.post(REVOKE_ENDPOINT, new URLSearchParams({ token: refreshToken }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    } catch (error) {
        // Already-invalid tokens return 400. Disconnecting locally still matters.
        console.error('Google token revocation failed:', describeError(error));
    }
};

const authed = (accessToken: string) => ({ headers: { Authorization: `Bearer ${accessToken}` } });

export const createCalendar = async (accessToken: string): Promise<string> => {
    const { data } = await axios.post<any>(
        `${CALENDAR_API}/calendars`,
        { summary: CALENDAR_NAME, description: 'Coding contests synced from Contest Reminder.' },
        authed(accessToken)
    );
    return data.id;
};

export const calendarExists = async (accessToken: string, calendarId: string): Promise<boolean> => {
    try {
        await axios.get(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}`, authed(accessToken));
        return true;
    } catch (error) {
        // The user may have deleted the calendar from their own interface.
        if (axios.isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 410)) {
            return false;
        }
        throw error;
    }
};

export interface CalendarEvent {
    id: string;
    summary: string;
    description: string;
    location: string;
    startIso: string;
    endIso: string;
    reminderMinutes: number[];
}

const eventBody = (event: CalendarEvent) => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startIso },
    end: { dateTime: event.endIso },
    source: { title: CALENDAR_NAME, url: event.location },
    reminders: {
        useDefault: false,
        overrides: event.reminderMinutes.map(minutes => ({ method: 'popup', minutes })),
    },
});

/**
 * Insert, or update if the id is already present.
 *
 * The event id is derived from the contest id, so re-running a sync is a no-op
 * rather than a duplicate. Google documents client-supplied ids but warns that
 * "we cannot guarantee that ID collisions will be detected at event creation
 * time", so a 409 is an expected outcome and not an error - it means the event
 * is already there and only its details may need updating.
 */
export const upsertEvent = async (
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
): Promise<'created' | 'updated'> => {
    const base = `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;

    try {
        await axios.post(base, eventBody(event), authed(accessToken));
        return 'created';
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            await axios.put(`${base}/${event.id}`, eventBody(event), authed(accessToken));
            return 'updated';
        }
        throw error;
    }
};
