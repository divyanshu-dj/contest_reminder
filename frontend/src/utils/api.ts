
import { Contest } from './types';
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

export const fetchContests = async  ({ pageParam = 0 }): Promise<{ contests: Contest[]; nextOffset: number; hasMore: boolean }> => {
  try {
    const response = await axios(`${client}/api/contests?offset=${pageParam}&limit=30`);
    const data = response.data;

    if (!data) {
      console.error('Invalid API response:', data);
      return { 
        contests: [], 
        nextOffset: pageParam, 
        hasMore: false,
      };
    }

    return { 
      contests: data.contests, 
      nextOffset: pageParam + 30, 
      hasMore: data.hasMore 
    }
  } catch (error) {
    console.error('Error fetching contests:', error);
    return { 
      contests: [], 
      nextOffset: pageParam, 
      hasMore: false,
    };
  }
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
