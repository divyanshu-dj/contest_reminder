
export type Platform = 'codeforces' | 'codechef' | 'leetcode';

export interface Contest {
  contestId: string;
  name: string;
  platform: Platform;
  url: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // in seconds
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  youtubeVideo?: string; // YouTube link for solutions
}

export interface BookmarkedContest extends Contest {
  bookmarkedAt: string; // ISO string
}

export interface ContestFilter {
  platforms: Platform[];
  status: 'all' | 'upcoming' | 'ongoing' | 'completed';
  search: string;
}

export interface UseContestsReturn {
  contests: Contest[];
  filteredContests: Contest[];
  groupedContests: Record<Contest['status'], Contest[]>;
  isLoading: boolean;
  error: Error | null;
  filter: ContestFilter;
  setFilter: React.Dispatch<React.SetStateAction<ContestFilter>>;
  togglePlatformFilter: (platform: Platform) => void;
}
