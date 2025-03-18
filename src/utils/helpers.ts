
import { Contest, ContestFilter, Platform } from './types';

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeRemaining = (dateString: string) => {
  const now = new Date().getTime();
  const targetDate = new Date(dateString).getTime();
  const timeRemaining = targetDate - now;
  
  // If date is in the past, return zero values
  if (timeRemaining <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  
  const seconds = Math.floor((timeRemaining / 1000) % 60);
  const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
  const hours = Math.floor((timeRemaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  
  return { days, hours, minutes, seconds, total: timeRemaining };
};


export const formatDuration = (durationInSeconds: number): string => {
  const days = Math.floor(durationInSeconds / 86400);
  const hours = Math.floor((durationInSeconds % 86400) / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};


export const getPlatformColorClass = (platform: Platform): string => {
  switch (platform) {
    case 'codeforces':
      return 'platform-codeforces';
    case 'codechef':
      return 'platform-codechef';
    case 'leetcode':
      return 'platform-leetcode';
    default:
      return '';
  }
};

export const getPlatformDisplayName = (platform: Platform): string => {
  switch (platform) {
    case 'codeforces':
      return 'Codeforces';
    case 'codechef':
      return 'CodeChef';
    case 'leetcode':
      return 'LeetCode';
    default:
      return platform;
  }
};

export const filterContests = (contests: Contest[], filter: ContestFilter): Contest[] => {
  return contests.filter(contest => {
    // Filter by platform
    if (filter.platforms.length > 0 && !filter.platforms.includes(contest.platform)) {
      return false;
    }
    // Filter by status
    if (filter.status !== 'all' && filter.status !== contest.status.toLowerCase()) {
      return false;
    }
    // Filter by search term
    if (filter.search && !contest.name.toLowerCase().includes(filter.search.toLowerCase())) {
      return false;
    }
    
    return true;
  });
};

export const sortContestsByTime = (contests: Contest[], ascending = true): Contest[] => {
  return [...contests].sort((a, b) => {
    const timeA = new Date(a.startTime).getTime();
    const timeB = new Date(b.startTime).getTime();
    return ascending ? timeA - timeB : timeB - timeA;
  });
};

export const groupContestsByStatus = (contests: Contest[]): Record<Contest['status'], Contest[]> => {
  const grouped = {
    UPCOMING: [] as Contest[],
    ONGOING: [] as Contest[],
    COMPLETED: [] as Contest[]
  };
  
  contests.forEach(contest => {
    grouped[contest.status].push(contest);
  });
  
  // Sort upcoming and ongoing by start time ascending (closest first)
  grouped.UPCOMING = sortContestsByTime(grouped.UPCOMING, true);
  grouped.ONGOING = sortContestsByTime(grouped.ONGOING, true);
  
  // Sort completed by start time descending (most recent first)
  grouped.COMPLETED = sortContestsByTime(grouped.COMPLETED, false);
  
  return grouped;
};
