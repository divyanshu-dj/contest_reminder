import { Router } from 'express';
import { CalendarSync } from '../model/CalendarSync';
import { encryptSecret, hasEncryptionKey, randomToken } from './secrets';
import { describeError } from './http';
import {
    buildAuthUrl,
    createPkcePair,
    exchangeCode,
    googleConfig,
    revokeToken,
} from './googleCalendar';
import { normalisePlatforms, normaliseReminders, syncSubscriptionNow, REMINDER_PRESETS } from './calendarSync';
import { consumeOAuthState, currentSubject, endSession, saveOAuthState, startSession } from './session';
import { decryptSecret } from './secrets';

const frontendOrigin = () => process.env.FRONTEND_ORIGIN ?? '';

/** Where the browser lands after the Google round trip. */
const backToApp = (outcome: string) => `${frontendOrigin()}/?calendar=${outcome}`;

export const calendarRouter = Router();

/**
 * Both the OAuth client and the encryption key are required. Without the key
 * the refresh token could only be stored in plaintext, so the feature refuses
 * to operate rather than quietly downgrading its own security.
 */
const configurationProblem = (): string | null => {
    if (!googleConfig()) return 'Google OAuth is not configured on the server';
    if (!hasEncryptionKey()) return 'TOKEN_ENCRYPTION_KEY is not configured on the server';
    return null;
};

calendarRouter.get('/config', (_req, res) => {
    res.json({
        available: configurationProblem() === null,
        reminderPresets: REMINDER_PRESETS,
    });
});

calendarRouter.get('/connect', async (_req, res) => {
    const problem = configurationProblem();
    if (problem) {
        res.status(503).json({ error: problem });
        return;
    }

    try {
        const { verifier, challenge } = createPkcePair();
        // state defends the callback against cross-site request forgery: a
        // callback that does not carry a state we issued is not ours.
        const state = randomToken(16);
        await saveOAuthState(state, verifier);

        res.redirect(buildAuthUrl(googleConfig()!, state, challenge));
    } catch (error) {
        console.error('❌ Failed to start Google OAuth:', describeError(error));
        res.status(500).json({ error: 'Could not start the Google authorisation flow' });
    }
});

calendarRouter.get('/callback', async (req, res) => {
    if (configurationProblem()) {
        res.redirect(backToApp('unavailable'));
        return;
    }

    // The user pressed "Cancel" on Google's consent screen.
    if (req.query.error) {
        res.redirect(backToApp('denied'));
        return;
    }

    const verifier = await consumeOAuthState(req.query.state);
    if (!verifier || typeof req.query.code !== 'string') {
        res.redirect(backToApp('invalid'));
        return;
    }

    try {
        const tokens = await exchangeCode(googleConfig()!, req.query.code, verifier);

        // Google only returns a refresh token when it decides to. A returning
        // user who already consented can come back without one, so an existing
        // stored token must be kept rather than overwritten with nothing.
        const existing = await CalendarSync.findOne({ googleSub: tokens.googleSub });
        if (!tokens.refreshToken && !existing) {
            res.redirect(backToApp('norefresh'));
            return;
        }

        await CalendarSync.findOneAndUpdate(
            { googleSub: tokens.googleSub },
            {
                $set: {
                    email: tokens.email,
                    ...(tokens.refreshToken ? { refreshToken: encryptSecret(tokens.refreshToken) } : {}),
                },
                $setOnInsert: { platforms: [], reminderMinutes: [60] },
            },
            { upsert: true, new: true }
        );

        await startSession(res, tokens.googleSub);

        // Fill the calendar immediately; waiting for the next cron would make
        // connecting look like it did nothing.
        try {
            await syncSubscriptionNow(tokens.googleSub);
        } catch (error) {
            console.error('❌ First calendar sync failed:', describeError(error));
        }

        res.redirect(backToApp('connected'));
    } catch (error) {
        console.error('❌ Google OAuth callback failed:', describeError(error));
        res.redirect(backToApp('error'));
    }
});

calendarRouter.get('/me', async (req, res) => {
    const googleSub = await currentSubject(req);
    if (!googleSub) {
        res.json({ connected: false });
        return;
    }

    const subscription = await CalendarSync.findOne({ googleSub }).lean();
    if (!subscription) {
        res.json({ connected: false });
        return;
    }

    // The refresh token is never part of a response.
    res.json({
        connected: true,
        email: subscription.email,
        platforms: subscription.platforms,
        reminderMinutes: subscription.reminderMinutes,
        lastSyncedAt: subscription.lastSyncedAt,
        lastSyncError: subscription.lastSyncError,
    });
});

calendarRouter.patch('/preferences', async (req, res) => {
    const googleSub = await currentSubject(req);
    if (!googleSub) {
        res.status(401).json({ error: 'Not connected' });
        return;
    }

    const platforms = normalisePlatforms(req.body?.platforms);
    const reminderMinutes = normaliseReminders(req.body?.reminderMinutes);

    const subscription = await CalendarSync.findOneAndUpdate(
        { googleSub },
        { $set: { platforms, reminderMinutes } },
        { new: true }
    );

    if (!subscription) {
        res.status(404).json({ error: 'Not connected' });
        return;
    }

    // Apply the new reminder offsets to the events already in the calendar;
    // otherwise the change would only affect contests announced later.
    let resynced = 0;
    let resyncError: string | null = null;
    try {
        resynced = await syncSubscriptionNow(googleSub);
    } catch (error) {
        resyncError = describeError(error);
        console.error('❌ Resync after preference change failed:', resyncError);
    }

    res.json({ platforms, reminderMinutes, resynced, resyncError });
});

calendarRouter.post('/sync', async (req, res) => {
    const googleSub = await currentSubject(req);
    if (!googleSub) {
        res.status(401).json({ error: 'Not connected' });
        return;
    }

    try {
        res.json({ synced: await syncSubscriptionNow(googleSub) });
    } catch (error) {
        console.error('❌ Manual calendar sync failed:', describeError(error));
        res.status(502).json({ error: 'Sync failed' });
    }
});

calendarRouter.delete('/disconnect', async (req, res) => {
    const googleSub = await currentSubject(req);
    if (!googleSub) {
        res.status(401).json({ error: 'Not connected' });
        return;
    }

    const subscription = await CalendarSync.findOne({ googleSub });

    // Revoke at Google as well as locally. Deleting only our row would leave a
    // working credential in existence that the user believes they have removed.
    if (subscription) {
        try {
            await revokeToken(decryptSecret(subscription.refreshToken));
        } catch (error) {
            console.error('❌ Could not decrypt token for revocation:', describeError(error));
        }
        await CalendarSync.deleteOne({ _id: subscription._id });
    }

    await endSession(req, res);
    res.json({ disconnected: true });
});
