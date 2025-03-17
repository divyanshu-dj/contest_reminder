
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Clock, Calendar, Youtube, Video, Play } from 'lucide-react';
import { Contest } from '@/utils/types';
import { formatDate, getTimeRemaining, formatDuration, getPlatformColorClass, getPlatformDisplayName } from '@/utils/helpers';
import BookmarkButton from './BookmarkButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContestCardProps {
  contest: Contest;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(contest.startTime));
  const platformClass = getPlatformColorClass(contest.platform);
  
  // Update countdown timer every second for upcoming contests
  useEffect(() => {
    if (contest.status !== 'UPCOMING') return;
    
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(contest.startTime));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [contest.startTime, contest.status]);
  
  const renderCountdown = () => {
    if (contest.status !== 'UPCOMING') return null;
    
    if (timeLeft.total <= 0) {
      return <span className="text-red-500/80 font-bold">Started!</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-2 text-sm">
        {timeLeft.days > 0 && (
          <span className="px-2 py-1 rounded-md bg-secondary">
            {timeLeft.days}d
          </span>
        )}
        <span className="px-2 py-1 rounded-md bg-secondary">
          {String(timeLeft.hours).padStart(2, '0')}h
        </span>
        <span className="px-2 py-1 rounded-md bg-secondary">
          {String(timeLeft.minutes).padStart(2, '0')}m
        </span>
        <span className="px-2 py-1 rounded-md bg-secondary">
          {String(timeLeft.seconds).padStart(2, '0')}s
        </span>
      </div>
    );
  };
  
  const renderStatusBadge = () => {
    switch (contest.status) {
      case 'UPCOMING':
        return <Badge variant="outline" className="bg-secondary-foreground/10">Upcoming</Badge>;
      case 'ONGOING':
        return <Badge className="bg-green-500/90 hover:bg-green-500/80">Ongoing</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/20 flex flex-col glass">
      <CardHeader className="p-4 pb-0 flex-row justify-between items-start space-y-0">
        <div className="space-y-1.5">
          <Badge className={platformClass}>
            {getPlatformDisplayName(contest.platform)}
          </Badge>
          {renderStatusBadge()}
        </div>
        <BookmarkButton contest={contest} />
      </CardHeader>
      <CardContent className="p-4 pt-3 flex-grow">
        <CardTitle className="text-base sm:text-lg mb-2 line-clamp-2 text-balance">
          {contest.name}
        </CardTitle>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(contest.startTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Duration: {formatDuration(contest.duration)}</span>
          </div>
          {contest.status === 'UPCOMING' && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Starts in:</p>
              {renderCountdown()}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        {contest.status === 'COMPLETED' && (
          <>
            {contest.youtubeVideo ? (
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-full bg-red-500/90 hover:bg-red-500/80 text-white" 
                asChild
              >
                <a 
                  href={contest.youtubeVideo} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2"
                >
                  <Youtube className="h-4 w-4" />
                  <span>View Video Solution</span>
                </a>
              </Button>
            ) : (
              <div className="w-full px-2 py-1 text-xs text-center text-muted-foreground bg-muted/50 rounded-md">
                No video solution available yet
              </div>
            )}
          </>
        )}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a 
            href={contest.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <span>Visit Contest</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ContestCard;
