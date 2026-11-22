// Server-side input validation. The client-side checks in AdminForm are UX only;
// these are the actual trust boundary.

const MAX_LIMIT = 100;

export interface Pagination {
  offset: number;
  limit: number;
}

/**
 * Clamp user-supplied pagination so `?limit=999999` can't dump the collection
 * and a negative offset can't make Mongo throw. Also bounds the number of
 * distinct Redis cache keys a caller can mint.
 */
export const clampPagination = (
  rawOffset: unknown,
  rawLimit: unknown,
  defaultLimit: number
): Pagination => {
  const offset = Math.floor(Number(rawOffset));
  const limit = Math.floor(Number(rawLimit));

  return {
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : defaultLimit,
  };
};

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
