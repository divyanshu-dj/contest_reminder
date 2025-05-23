
import { Contest } from './types';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { trackEvent } from '@/analytics';

const client = ""

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

export const addSolutionUrl = async(contestId: string, url: string): Promise<Contest> => {
  try {
    const {data} = await axios.patch(`${client}/api/contests/${contestId}/solution`, {url});
    
    return data;
  } catch (error) {
    console.error('Error adding solution URL:', error);
    return null;
  }
};

export const handleAutoSync = async (queryClient) => {
  trackEvent("Button", "Clicked Auto Sync", "Admin Page Auto Sync Button");
  toast({ title: "Syncing...", description: "Please wait..." });
  try {
    const { data } = await axios.post(`${client}/api/contests/sync`);

    if (!data) throw new Error("Invalid API response");

    toast({ title: "Sync complete", description: "Contests updated!" });

    queryClient.invalidateQueries(['contests']); // ✅ Refetch contests after sync
  } catch (error) {
    toast({ title: "Sync failed", description: "An error occurred", variant: "destructive" });
  }
};




