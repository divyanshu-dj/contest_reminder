
import { useState, useEffect, useCallback } from 'react';
import { Contest, ContestFilter, Platform } from '@/utils/types';
import { fetchAllContests } from '@/utils/api';
import { filterContests, groupContestsByStatus } from '@/utils/helpers';
import { toast } from '@/components/ui/use-toast';

interface UseContestsReturn {
  contests: Contest[];
  filteredContests: Contest[];
  groupedContests: Record<Contest['status'], Contest[]>;
  isLoading: boolean;
  error: string | null;
  filter: ContestFilter;
  setFilter: React.Dispatch<React.SetStateAction<ContestFilter>>;
  refreshContests: () => Promise<void>;
  togglePlatformFilter: (platform: Platform) => void;
}

export const useContests = (): UseContestsReturn => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContestFilter>({
    platforms: [],
    status: 'all',
    search: ''
  });

  const fetchContests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedContests = await fetchAllContests();
      setContests(fetchedContests);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contests';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchContests();
    
    // Set up a refresh interval (every 10 minutes)
    const intervalId = setInterval(() => {
      fetchContests();
    }, 10 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchContests]);

  // Filter contests based on current filter state
  const filteredContests = filterContests(contests, filter);
  
  // Group filtered contests by status
  const groupedContests = groupContestsByStatus(filteredContests);

  // Function to toggle a platform in the filter
  const togglePlatformFilter = (platform: Platform) => {
    setFilter(prev => {
      const isPlatformSelected = prev.platforms.includes(platform);
      
      if (isPlatformSelected) {
        // Remove the platform
        return {
          ...prev,
          platforms: prev.platforms.filter(p => p !== platform)
        };
      } else {
        // Add the platform
        return {
          ...prev,
          platforms: [...prev.platforms, platform]
        };
      }
    });
  };

  // Function to manually refresh contests
  const refreshContests = async () => {
    toast({
      title: "Refreshing",
      description: "Fetching the latest contest data...",
    });
    await fetchContests();
  };

  return {
    contests,
    filteredContests,
    groupedContests,
    isLoading,
    error,
    filter,
    setFilter,
    refreshContests,
    togglePlatformFilter
  };
};
