// Server-side input validation. The client-side checks in AdminForm are UX only;
// these are the actual trust boundary.

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

/**
 * Only https YouTube URLs may be stored. ContestCard renders this value
 * straight into an <a href>, so anything else (javascript:, data:, an
 * attacker-controlled host) is a stored-XSS / open-redirect vector.
 */
export const isAllowedYoutubeUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return url.protocol === 'https:' && YOUTUBE_HOSTS.has(url.hostname.toLowerCase());
};
