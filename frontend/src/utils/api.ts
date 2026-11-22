
import { Contest, ContestFilter } from './types';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';

const client = ""

export const ADMIN_TOKEN_KEY = 'contest-admin-token';

export const getAdminToken = (): string => {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

export const setAdminToken = (token: string): void => {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private mode); the caller still works for
    // this page load because the token is read back per request.
  }
};

// The write endpoints require a shared secret; the token is never sent to the
// public read endpoint.
const adminConfig = () => ({
  headers: { Authorization: `Bearer ${getAdminToken()}` },
});

const adminErrorMessage = (error: unknown): string => {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401) return 'Invalid or missing admin token';
  if (status === 503) return 'Admin endpoints are not configured on the server';
  if (status === 429) return 'Rate limited - try again later';
  if (status === 400) return 'Only https YouTube links are accepted';
  return 'An error occurred';
};

export interface ContestPage {
  contests: Contest[];
  nextCursor: string | null;
  hasMore: boolean;
}

const PAGE_SIZE = 30;

/**
 * Filtering and search happen on the server. They used to run client-side over
 * whatever pages had been loaded, so searching for an old contest returned
 * nothing until the user had scrolled far enough to load it, and narrowing to one
 * platform showed a nearly empty page.
 *
 * Errors propagate instead of resolving to an empty list: with server-side
 * search, a swallowed failure is indistinguishable from "no contests matched".
 */
export const fetchContests = async (
  { pageParam, filter }: { pageParam?: string | null; filter: ContestFilter }
): Promise<ContestPage> => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (filter.platforms.length > 0) params.set('platforms', filter.platforms.join(','));
  if (filter.status !== 'all') params.set('status', filter.status);
  if (filter.search) params.set('q', filter.search);
  if (pageParam) params.set('cursor', pageParam);

  const { data } = await axios.get(`${client}/api/contests?${params.toString()}`);

  return {
    contests: data?.contests ?? [],
    nextCursor: data?.nextCursor ?? null,
    hasMore: Boolean(data?.hasMore),
  };
};

export const addSolutionUrl = async (contestId: string, url: string): Promise<Contest | null> => {
  try {
    const { data } = await axios.patch(
      `${client}/api/contests/${contestId}/solution`,
      { url },
      adminConfig()
    );

    return data;
  } catch (error) {
    console.error('Error adding solution URL:', error);
    toast({
      title: 'Failed to save YouTube URL',
      description: adminErrorMessage(error),
      variant: 'destructive',
    });
    return null;
  }
};
