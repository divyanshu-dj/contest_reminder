import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContestFilter, Platform, UseContestsReturn } from '@/utils/types';
import { fetchAllContests } from '@/utils/api';
import { filterContests, groupContestsByStatus } from '@/utils/helpers';
import { toast } from '@/components/ui/use-toast';

export const useContests = (): UseContestsReturn => {
  const { data: contests = [], isLoading, error } = useQuery({
    queryKey: ['contests'],
    queryFn: fetchAllContests,
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

  const [filter, setFilter] = useState<ContestFilter>({
    platforms: [],
    status: 'all',
    search: ''
  });

  const filteredContests = useMemo(() => filterContests(contests, filter), [contests, filter]);
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
    contests,
    filteredContests,
    groupedContests,
    isLoading,
    error,
    filter,
    setFilter,
    togglePlatformFilter
  };
};