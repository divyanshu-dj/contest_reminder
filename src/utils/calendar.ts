
import { Contest } from '@/utils/types';

export const createGoogleCalendarUrl = (contest: Contest) => {
  const startDate = new Date(contest.startTime);
  const endDate = new Date(contest.endTime);
  
  // Format dates for Google Calendar
  const startTimeStr = startDate.toISOString().replace(/-|:|\.\d+/g, '');
  const endTimeStr = endDate.toISOString().replace(/-|:|\.\d+/g, '');
  
  // Create URL parameters
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[${contest.platform.toUpperCase()}] ${contest.name}`,
    dates: `${startTimeStr}/${endTimeStr}`,
    details: `Coding contest on ${contest.platform}\n${contest.url}`,
    location: contest.url,
    trp: 'false',
    sprop: 'website:contest-cosmos-tracker'
  });
  
  return `https://www.google.com/calendar/render?${params.toString()}`;
};
