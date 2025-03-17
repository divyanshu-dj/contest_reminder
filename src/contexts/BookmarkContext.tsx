
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Contest, BookmarkedContest } from '@/utils/types';
import { toast } from '@/components/ui/use-toast';

interface BookmarkContextType {
  bookmarkedContests: BookmarkedContest[];
  addBookmark: (contest: Contest) => void;
  removeBookmark: (contestId: string) => void;
  isBookmarked: (contestId: string) => boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};

interface BookmarkProviderProps {
  children: React.ReactNode;
}

export const BookmarkProvider: React.FC<BookmarkProviderProps> = ({ children }) => {
  const [bookmarkedContests, setBookmarkedContests] = useState<BookmarkedContest[]>([]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('contest-bookmarks');
    if (savedBookmarks) {
      try {
        setBookmarkedContests(JSON.parse(savedBookmarks));
      } catch (error) {
        console.error('Failed to parse bookmarks from localStorage', error);
        localStorage.removeItem('contest-bookmarks');
      }
    }
  }, []);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('contest-bookmarks', JSON.stringify(bookmarkedContests));
  }, [bookmarkedContests]);

  const addBookmark = (contest: Contest) => {
    if (isBookmarked(contest.contestId)) {
      toast({
        title: "Already bookmarked",
        description: `${contest.name} is already in your bookmarks.`,
        variant: "default",
      });
      return;
    }
    
    const bookmarkedContest: BookmarkedContest = {
      ...contest,
      bookmarkedAt: new Date().toISOString()
    };
    
    setBookmarkedContests(prev => [...prev, bookmarkedContest]);
    
    toast({
      title: "Bookmarked",
      description: `${contest.name} has been added to your bookmarks.`,
      variant: "default",
    });
  };

  const removeBookmark = (contestId: string) => {
    const contest = bookmarkedContests.find(c => c.contestId === contestId);
    if (!contest) return;
    
    setBookmarkedContests(prev => prev.filter(c => c.contestId !== contestId));
    
    toast({
      title: "Removed bookmark",
      description: `${contest.name} has been removed from your bookmarks.`,
      variant: "default",
    });
  };

  const isBookmarked = (contestId: string): boolean => {
    return bookmarkedContests.some(contest => contest.contestId === contestId);
  };

  const value = {
    bookmarkedContests,
    addBookmark,
    removeBookmark,
    isBookmarked
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};
