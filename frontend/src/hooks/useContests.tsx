import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Contest, ContestFilter, Platform } from '@/utils/types';
import { fetchContests } from '@/utils/api';
import { groupContestsByStatus } from '@/utils/helpers';
import { useDebounced } from '@/hooks/useDebounced';
import { toast } from '@/components/ui/use-toast';

interface UseContestsReturn {
  contests: Contest[];
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
  const [filter, setFilter] = useState<ContestFilter>({
    platforms: [],
    status: 'all',
    search: ''
  });

  // Typing stays responsive while the query waits for the user to stop.
  const debouncedSearch = useDebounced(filter.search, 300);

  const query = useMemo(
    () => ({ ...filter, search: debouncedSearch }),
    [filter.platforms, filter.status, debouncedSearch]
  );

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    // The filter is part of the key, so changing it refetches from the server
    // rather than re-filtering rows that happen to be loaded.
    queryKey: ['contests', query.platforms, query.status, query.search],
    queryFn: ({ pageParam }) => fetchContests({ pageParam, filter: query }),
    // Cursor over (startTime, _id). Offsets shifted whenever the cron inserted
    // a contest between page requests, duplicating or skipping rows.
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    initialPageParam: null as string | null,
    refetchInterval: 6 * 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: 'always',
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load contests",
        variant: "destructive",
      });
    }
  }, [error]);

  const allContests = useMemo(
    () => data?.pages.flatMap(page => page.contests) ?? [],
    [data]
  );

  const groupedContests = useMemo(() => groupContestsByStatus(allContests), [allContests]);

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
    groupedContests,
    isLoading,
    error,
    filter,
    setFilter,
    togglePlatformFilter,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
};
