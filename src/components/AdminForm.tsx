import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Contest, Platform } from '@/utils/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Search, Youtube, Save } from 'lucide-react';
import { getPlatformDisplayName } from '@/utils/helpers';
import { addSolutionUrl } from '@/utils/api';

interface AdminContestFormProps {
  contests: Contest[];
}

const AdminForm: React.FC<AdminContestFormProps> = ({ contests }) => {

  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // Memoize filtered contests to prevent recalculation on every render
  const filteredContests = useMemo(() => {
    return contests.filter(contest => {
      if (contest.status !== 'COMPLETED') return false;
      if (selectedPlatform !== 'all' && contest.platform !== selectedPlatform) return false;
      if (searchTerm && !contest.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [contests, selectedPlatform, searchTerm]);
  
  // Handle saving the YouTube URL
  const handleSaveYoutubeUrl = async () => {
    if (!selectedContest) {
      toast({
        title: "No contest selected",
        description: "Please select a contest first",
        variant: "destructive",
      });
      return;
    }
    
    if (!youtubeUrl) {
      toast({
        title: "YouTube URL is required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }
    
    // Validate YouTube URL format
    const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!youtubeUrlPattern.test(youtubeUrl)) {
      toast({
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }
    
    // Add solution URL
    const updatedContest = await addSolutionUrl(selectedContest.contestId, youtubeUrl);
    if (!updatedContest) {
      toast({
        title: "Failed to save YouTube URL",
        description: "An error occurred while saving the YouTube URL",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "YouTube URL saved",
      description: `YouTube URL saved for contest: ${updatedContest.name}`,
    });
    
    console.log("Saved YouTube URL:", {
      contestId: updatedContest.contestId,
      contestName: updatedContest.name,
      platform: updatedContest.platform,
      youtubeUrl
    });
    
    // Reset form
    setSelectedContest(null);
    setYoutubeUrl('');
  };
  
  // Select a contest
  const handleSelectContest = (contest: Contest) => {
    setSelectedContest(contest);
    setYoutubeUrl(contest.youtubeVideo || '');
    
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add YouTube Solutions</CardTitle>
        <CardDescription>
          Associate YouTube solution videos with completed contests
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Platform selector */}
        <div>
          <h3 className="text-sm font-medium mb-2">Platform</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedPlatform === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedPlatform('all')}
              size="sm"
            >
              All Platforms
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedPlatform('codeforces')}
              size="sm"
              className={`border-[hsl(var(--codeforces))] ${
                selectedPlatform === 'codeforces' 
                  ? 'bg-[hsl(var(--codeforces))] text-white'
                  : 'text-[hsl(var(--codeforces))] hover:text-white hover:bg-[hsl(var(--codeforces))]'
              }`}
            >
              Codeforces
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedPlatform('codechef')}
              size="sm"
              className={`border-[hsl(var(--codechef))] ${
                selectedPlatform === 'codechef' 
                  ? 'bg-[hsl(var(--codechef))] text-white'
                  : 'text-[hsl(var(--codechef))] hover:text-white hover:bg-[hsl(var(--codechef))]'
              }`}
            >
              CodeChef
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedPlatform('leetcode')}
              size="sm"
              className={`border-[hsl(var(--leetcode))] ${
                selectedPlatform === 'leetcode' 
                  ? 'bg-[hsl(var(--leetcode))] text-white'
                  : 'text-[hsl(var(--leetcode))] hover:text-white hover:bg-[hsl(var(--leetcode))]'
              }`}
            >
              LeetCode
            </Button>
          </div>
        </div>
        
        {/* Search input */}
        <div>
          <h3 className="text-sm font-medium mb-2">Search Contest</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by contest name..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {/* Contest list */}
        <div>
          <h3 className="text-sm font-medium mb-2">
            {filteredContests.length > 0 
              ? `Select Contest (${filteredContests.length} completed contests)` 
              : 'No completed contests found'}
          </h3>
          
          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2 overflow-x-hidden">
            {filteredContests.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2 text-center">
                No contests match your search
              </p>
            ) : (
              filteredContests.map(contest => (
                <div 
                  key={contest.contestId} 
                  className={`p-3 rounded-md cursor-pointer border flex justify-between items-center ${
                    selectedContest?.contestId === contest.contestId 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => handleSelectContest(contest)}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ 
                        backgroundColor: 
                          contest.platform === 'codeforces' ? 'hsl(var(--codeforces))' :
                          contest.platform === 'codechef' ? 'hsl(var(--codechef))' : 
                          'hsl(var(--leetcode))'
                      }}
                    >
                      {getPlatformDisplayName(contest.platform)}
                    </span>
                    <span className="truncate">{contest.name}</span>
                  </div>
                  {contest.youtubeVideo && (
                    <Youtube className="h-4 w-4 text-red-500 ml-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* YouTube URL input */}
        <div>
          <h3 className="text-sm font-medium mb-2">YouTube Solution URL</h3>
          <div className="relative">
            <Youtube className="absolute left-2.5 top-2.5 h-4 w-4 text-red-500" />
            <Input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              className="pl-8"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={!selectedContest}
            />
          </div>
          {!selectedContest && (
            <p className="text-xs text-muted-foreground mt-1">
              Select a contest to add a YouTube solution URL
            </p>
          )}
        </div>
        
        {/* Save button */}
        <Button 
          onClick={handleSaveYoutubeUrl} 
          disabled={!selectedContest || !youtubeUrl}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          Save YouTube Solution
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminForm;