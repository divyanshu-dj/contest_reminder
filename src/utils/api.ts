
import { Contest } from './types';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { QueryClient } from "@tanstack/react-query";


const client = 'http://localhost:5000';

export const fetchAllContests = async (): Promise<Contest[]> => {
  try {
    const response = await axios(`${client}/api/contests`);
    const data = response.data;

    if (!data) {
      console.error('Invalid API response:', data);
      return [];
    }

    return data
  } catch (error) {
    console.error('Error fetching contests:', error);
    return [];
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
  try {
    const { data } = await axios.post(`${client}/api/contests/sync`);

    if (!data) throw new Error("Invalid API response");

    toast({ title: "Sync complete", description: "Contests updated!" });

    queryClient.invalidateQueries(['contests']); // ✅ Refetch contests after sync
  } catch (error) {
    toast({ title: "Sync failed", description: "An error occurred", variant: "destructive" });
  }
};




