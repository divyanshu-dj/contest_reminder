export type ContestStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

/**
 * Contest status is a pure function of the clock, so it is derived on read
 * rather than stored. It used to be written at fetch time and refreshed only by
 * the 6-hourly cron, which meant a contest could advertise itself as UPCOMING
 * for hours after it had started - and the response cache stacked on top of that.
 *
 * The window is inclusive at both ends: a contest exactly at its start or end
 * instant counts as ONGOING.
 */
export const statusFor = (startTime: Date, endTime: Date, now: Date = new Date()): ContestStatus => {
    const t = now.getTime();
    if (t < startTime.getTime()) return 'UPCOMING';
    if (t > endTime.getTime()) return 'COMPLETED';
    return 'ONGOING';
};
