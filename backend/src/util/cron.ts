import cron from 'node-cron';
import fetchAllContests from './fetchContests';

// Run job every 6hr  (30 sec - */30 * * * * *)
const job = cron.schedule('0 */6 * * *', async () => {
    console.log('Running cron job to fetch contest details...');
    fetchAllContests();
});

console.log('Cron job scheduled to fetch contest details every 6hr.');
job.start();
