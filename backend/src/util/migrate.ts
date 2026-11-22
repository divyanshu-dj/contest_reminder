import mongoose from 'mongoose';
import connectDB from '../config/db';
import { Contest } from '../model/Contest';

/**
 * One-off migration for data written before startTime/endTime became Date and
 * before `status` stopped being stored.
 *
 * Needed because a collection holding both strings and dates sorts by BSON type
 * bracket first, so `sort({ startTime: -1 })` would interleave the two groups
 * rather than ordering by time. The cron rewrites whatever the upstream APIs
 * still return, but CodeChef only serves a recent window, so older rows would
 * keep their string dates indefinitely without this.
 *
 * Safe to run more than once: it only touches documents still holding strings.
 */
const migrate = async (): Promise<void> => {
    await connectDB();
    const collection = Contest.collection;

    const stringDated = await collection.countDocuments({ startTime: { $type: 'string' } });
    const withStatus = await collection.countDocuments({ status: { $exists: true } });
    console.log(`Found ${stringDated} documents with string dates, ${withStatus} with a stored status.`);

    if (stringDated > 0) {
        // Aggregation-pipeline update so Mongo does the conversion server-side.
        const result = await collection.updateMany(
            { startTime: { $type: 'string' } },
            [{ $set: { startTime: { $toDate: '$startTime' }, endTime: { $toDate: '$endTime' } } }]
        );
        console.log(`Converted dates on ${result.modifiedCount} documents.`);
    }

    if (withStatus > 0) {
        const result = await collection.updateMany(
            { status: { $exists: true } },
            { $unset: { status: '' } }
        );
        console.log(`Removed the stored status from ${result.modifiedCount} documents.`);
    }

    // Build the startTime index now rather than on first write under load.
    await Contest.syncIndexes();
    console.log('Indexes synced:', (await collection.indexes()).map(i => i.name).join(', '));

    const remaining = await collection.countDocuments({ startTime: { $type: 'string' } });
    if (remaining > 0) throw new Error(`${remaining} documents still hold string dates`);

    console.log('✅ Migration complete.');
    await mongoose.disconnect();
};

migrate().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
