import { Contest } from '@/utils/types';

const toIcsStamp = (date: Date): string => date.toISOString().replace(/[-:]|\.\d{3}/g, '');

export const createGoogleCalendarUrl = (contest: Contest) => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[${contest.platform.toUpperCase()}] ${contest.name}`,
    dates: `${toIcsStamp(new Date(contest.startTime))}/${toIcsStamp(new Date(contest.endTime))}`,
    details: `Coding contest on ${contest.platform}\n${contest.url}`,
    location: contest.url,
    trp: 'false',
    sprop: 'website:contest-reminder'
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
};

/** RFC 5545 escaping: backslash, semicolon, comma and newlines are special. */
const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/**
 * Content lines are limited to 75 octets, continued by CRLF + a single space.
 * Long contest names exceed that and strict parsers reject the file without it.
 */
const foldLine = (line: string): string => {
  if (line.length <= 75) return line;

  const parts: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join('\r\n ');
};

export const buildIcs = (contests: Contest[], now: Date = new Date()): string => {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//contest-reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const contest of contests) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(contest.contestId)}@contest-reminder`,
      `DTSTAMP:${toIcsStamp(now)}`,
      `DTSTART:${toIcsStamp(new Date(contest.startTime))}`,
      `DTEND:${toIcsStamp(new Date(contest.endTime))}`,
      `SUMMARY:${escapeIcsText(`[${contest.platform.toUpperCase()}] ${contest.name}`)}`,
      `DESCRIPTION:${escapeIcsText(`Coding contest on ${contest.platform}\n${contest.url}`)}`,
      `URL:${escapeIcsText(contest.url)}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');

  // CRLF is required by the spec, not a stylistic choice.
  return lines.map(foldLine).join('\r\n') + '\r\n';
};

/**
 * One file for every selected contest, instead of one browser tab per contest on
 * a timer - browsers block all but the first of those, so the old flow silently
 * dropped most of the selection. A downloaded .ics also imports into Apple
 * Calendar and Outlook, not just Google.
 */
export const downloadIcs = (contests: Contest[], filename = 'contests.ics'): void => {
  const blob = new Blob([buildIcs(contests)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};
