
import React, { useState } from 'react';
import { Calendar, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Contest, Platform } from '@/utils/types';
import { toast } from '@/components/ui/use-toast';

interface GoogleCalendarSyncProps {
  contests: Contest[];
}

const GoogleCalendarSync: React.FC<GoogleCalendarSyncProps> = ({ contests }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    'codeforces',
    'codechef',
    'leetcode',
  ]);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        return prev.filter((p) => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const createGoogleCalendarUrl = (contest: Contest) => {
    const startDate = new Date(contest.startTime);
    const endDate = new Date(contest.endTime);
    
    // Format dates for Google Calendar
    const startTimeStr = startDate.toISOString().replace(/-|:|\.\d+/g, '');
    const endTimeStr = endDate.toISOString().replace(/-|:|\.\d+/g, '');
    
    // Create URL parameters
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `[${contest.platform.toUpperCase()}] ${contest.name}`,
      dates: `${startTimeStr}/${endTimeStr}`,
      details: `Coding contest on ${contest.platform}\n${contest.url}`,
      location: contest.url,
      trp: 'false',
      sprop: 'website:contest-reminder'
    });
    
    return `https://www.google.com/calendar/render?${params.toString()}`;
  };

  const addAllEventsToCalendar = () => {
    const filteredContests = contests.filter(
      (contest) => 
        selectedPlatforms.includes(contest.platform) && 
        contest.status !== 'COMPLETED'
    );
    
    if (filteredContests.length === 0) {
      toast({
        title: "No contests to add",
        description: "Please select at least one platform with upcoming or ongoing contests",
        variant: "destructive",
      });
      return;
    }
    
    // First contest will open immediately
    window.open(createGoogleCalendarUrl(filteredContests[0]), '_blank');
    
    // Remaining contests will open with a delay to avoid popup blockers
    filteredContests.slice(1).forEach((contest, index) => {
      setTimeout(() => {
        window.open(createGoogleCalendarUrl(contest), '_blank');
      }, (index + 1) * 1000);
    });
    
    toast({
      title: "Adding to Calendar",
      description: `Adding ${filteredContests.length} contests to Google Calendar`,
    });
    
    setIsOpen(false);
  };

  return (
    <div className="my-4">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Sync with Google Calendar
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Google Calendar Sync</h4>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Select platforms to sync:</h5>
              <div className="space-y-2">
                {['codeforces', 'codechef', 'leetcode'].map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`platform-${platform}`} 
                      checked={selectedPlatforms.includes(platform as Platform)}
                      onCheckedChange={() => togglePlatform(platform as Platform)}
                    />
                    <Label htmlFor={`platform-${platform}`} className="capitalize">
                      {platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <Button onClick={addAllEventsToCalendar} className="w-full gap-2">
              <CheckSquare className="h-4 w-4" />
              Add Selected to Calendar
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Only upcoming and ongoing contests will be added to your calendar.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default GoogleCalendarSync;
