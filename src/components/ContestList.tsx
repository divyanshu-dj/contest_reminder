
import { useState } from 'react';
import { Contest } from '@/utils/types';
import ContestCard from './ContestCard';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ContestListProps {
  title: string;
  contests: Contest[];
  initialDisplayCount?: number;
  emptyMessage?: string;
}

const ContestList: React.FC<ContestListProps> = ({ 
  title, 
  contests, 
  initialDisplayCount = 6,
  emptyMessage = 'No contests found' 
}) => {
  const [displayCount, setDisplayCount] = useState(initialDisplayCount);
  const hasMore = contests.length > displayCount;
  
  const showMore = () => {
    setDisplayCount(prev => prev + 6);
  };
  
  const showLess = () => {
    setDisplayCount(Math.min(initialDisplayCount, 6));
  };
  
  if (contests.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">{title}</h2>
        <div className="p-8 text-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contests.slice(0, displayCount).map(contest => (
          <ContestCard key={contest.contestId} contest={contest} />
        ))}
      </div>
      
      {contests.length > initialDisplayCount && (
        <div className="mt-6 text-center">
          {hasMore ? (
            <Button 
              variant="ghost" 
              onClick={showMore}
              className="flex items-center gap-1"
            >
              <span>Show More</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              onClick={showLess}
              className="flex items-center gap-1"
            >
              <span>Show Less</span>
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContestList;
