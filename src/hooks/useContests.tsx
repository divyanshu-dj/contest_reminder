import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Contest, ContestFilter, Platform} from '@/utils/types';
import { fetchContests } from '@/utils/api';
import { filterContests, groupContestsByStatus } from '@/utils/helpers';
import { toast } from '@/components/ui/use-toast';

interface UseContestsReturn {
  contests: Contest[];
  filteredContests: Contest[];
  groupedContests: Record<string, Contest[]>;
  isLoading: boolean;
  error: any;
  filter: ContestFilter;
  setFilter: React.Dispatch<React.SetStateAction<ContestFilter>>;
  togglePlatformFilter: (platform: Platform) => void;
  fetchNextPage: () => Promise<any>;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}

export const useContests = (): UseContestsReturn => {
  // const { data: contests = [], isLoading, error } = useQuery({
  //   queryKey: ['contests'],
  //   queryFn: fetchContests,
  //   refetchInterval: 6 * 60 * 60 * 1000,
  //   refetchOnMount: true,
  //   refetchOnReconnect: 'always',
  // });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['contests'],
    queryFn: ({ pageParam = 0 }) => fetchContests({ pageParam }),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextOffset : undefined,
    initialPageParam: 0,
    refetchInterval: 6 * 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: 'always',
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
   }, [error]);

   // Combine contests from all pages
  const allContests = useMemo(() => {
    return data?.pages.flatMap(page => page.contests) ?? [];
  }, [data]);

  const [filter, setFilter] = useState<ContestFilter>({
    platforms: [],
    status: 'all',
    search: ''
  });

  const filteredContests = useMemo(() => filterContests(allContests, filter), [allContests, filter]);
  const groupedContests = useMemo(() => groupContestsByStatus(filteredContests), [filteredContests]);

  const togglePlatformFilter = useCallback((platform: Platform) => {
    setFilter(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  }, []);

  return {
    contests: allContests,
    filteredContests,
    groupedContests,
    isLoading,
    error,
    filter,
    setFilter,
    togglePlatformFilter,
    // Expose these for infinite scroll
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
};