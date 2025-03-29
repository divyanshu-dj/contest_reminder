
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, BookmarkMinus, Loader2 } from 'lucide-react';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { Contest } from '@/utils/types';

interface BookmarkButtonProps {
  contest: Contest;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ 
  contest, 
  variant = 'ghost',
  size = 'icon'
}) => {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const bookmarked = isBookmarked(contest.contestId);
  
  const handleBookmarkToggle = async () => {
    setIsProcessing(true);
    
    // Simulate a small delay to show the loading state
    setTimeout(() => {
      if (bookmarked) {
        removeBookmark(contest.contestId);
      } else {
        addBookmark(contest);
      }
      setIsProcessing(false);
    }, 300);
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleBookmarkToggle}
      disabled={isProcessing}
      className="transition-all"
      title={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : bookmarked ? (
        <BookmarkMinus className="h-4 w-4 text-primary" />
      ) : (
        <BookmarkPlus className="h-4 w-4" />
      )}
    </Button>
  );
};

export default BookmarkButton;
