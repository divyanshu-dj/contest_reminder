import cron from 'node-cron';
import fetchAllContests from './fetchContests';
import { youtubeSolution } from './youtubeSolution';
import { invalidateContestCache } from '../config/redis';
import { syncAllCalendars } from './calendarSync';

// Runs every 6 hours (use '*/30 * * * * *' to exercise it locally).
const SCHEDULE = '0 */6 * * *';

/**
 * Refresh contests, then attach YouTube solutions to the ones that just
 * completed. The solution matching used to be reachable only through an admin
 * button, which meant solutions appeared only when someone clicked; it is
 * idempotent and skips contests that already have a link, so it belongs here.
 */
const refreshContests = async (): Promise<void> => {
    try {
        console.log('Running cron job to fetch contest details...');
        await fetchAllContests();
        await youtubeSolution();
        await invalidateContestCache();
        // Push newly announced contests to every connected Google Calendar, so
        // a contest appearing upstream becomes a reminder without any action.
        await syncAllCalendars();
        console.log('Cron refresh complete.');
    } catch (error) {
        // Never let a failed run take the process down with an unhandled rejection.
        console.error('Cron refresh failed:', error);
    }
};

const job = cron.schedule(SCHEDULE, refreshContests);

console.log('Cron job scheduled to fetch contest details every 6hr.');
job.start();
