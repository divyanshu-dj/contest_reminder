
import Header from '@/components/Header';
import ContestList from '@/components/ContestList';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { groupContestsByStatus } from '@/utils/helpers';
import { Bookmark } from 'lucide-react';

const BookmarksPage = () => {
  const { bookmarkedContests } = useBookmarks();
  
  const groupedContests = groupContestsByStatus(bookmarkedContests);
  const { ONGOING, UPCOMING, COMPLETED } = groupedContests;
  
  const hasBookmarks = bookmarkedContests.length > 0;
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 text-center md:text-left">Bookmarked Contests</h1>
        
        {!hasBookmarks ? (
          <div className="text-center py-12">
            <div className="inline-flex rounded-full p-4 bg-muted mb-4">
              <Bookmark className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
            <p className="text-muted-foreground mb-6">
              Bookmark your favorite contests to keep track of them here
            </p>
          </div>
        ) : (
          <>
            {ONGOING.length > 0 && (
              <ContestList 
                title="Ongoing Contests" 
                contests={ONGOING} 
                initialDisplayCount={3}
              />
            )}
            
            {UPCOMING.length > 0 && (
              <ContestList 
                title="Upcoming Contests" 
                contests={UPCOMING} 
                initialDisplayCount={6}
              />
            )}
            
            {COMPLETED.length > 0 && (
              <ContestList 
                title="Past Contests" 
                contests={COMPLETED} 
                initialDisplayCount={6}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default BookmarksPage;
