
import React, { useState } from 'react';
import { Calendar, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Contest, Platform } from '@/utils/types';
import { downloadIcs } from '@/utils/calendar';
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

  const addAllEventsToCalendar = () => {
    const selected = contests.filter(
      (contest) =>
        selectedPlatforms.includes(contest.platform) &&
        contest.status !== 'COMPLETED'
    );

    if (selected.length === 0) {
      toast({
        title: "No contests to add",
        description: "Please select at least one platform with upcoming or ongoing contests",
        variant: "destructive",
      });
      return;
    }

    downloadIcs(selected);

    toast({
      title: "Calendar file downloaded",
      description: `Open contests.ics to add ${selected.length} contest${selected.length === 1 ? '' : 's'} to your calendar`,
    });

    setIsOpen(false);
  };

  return (
    <div className="my-4">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Add to Calendar
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Add to Calendar</h4>
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
              Download .ics
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Downloads one calendar file for the selected platforms. Only upcoming and
              ongoing contests are included. Works with Google, Apple and Outlook calendars.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default GoogleCalendarSync;
