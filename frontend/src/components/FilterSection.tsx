
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { ContestFilter, Platform } from '@/utils/types';
import { getPlatformDisplayName, getPlatformColorClass } from '@/utils/helpers';

interface FilterSectionProps {
  filter: ContestFilter;
  setFilter: React.Dispatch<React.SetStateAction<ContestFilter>>;
  togglePlatformFilter: (platform: Platform) => void;
}

const platformOptions: Platform[] = ['codeforces', 'codechef', 'leetcode'];

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' }
];

const FilterSection: React.FC<FilterSectionProps> = ({ 
  filter, 
  setFilter, 
  togglePlatformFilter 
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, search: e.target.value }));
  };
  
  const clearSearch = () => {
    setFilter(prev => ({ ...prev, search: '' }));
  };
  
  const handleStatusChange = (status: string) => {
    setFilter(prev => ({ 
      ...prev, 
      status: status as ContestFilter['status']
    }));
  };
  
  const isPlatformSelected = (platform: Platform) => {
    return filter.platforms.includes(platform);
  };
  
  const allOrNoPlatformsSelected = filter.platforms.length === 0 || filter.platforms.length === platformOptions.length;
  
  return (
    <div className="w-full mb-8 backdrop-blur-sm bg-white/20 dark:bg-black/20 rounded-lg p-4 border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-auto flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            placeholder="Search contests..."
            value={filter.search}
            onChange={handleSearchChange}
            className="pl-10 pr-10"
          />
          {filter.search && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={clearSearch}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium mb-2">Platforms</h3>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map(platform => (
              <Badge
                key={platform}
                className={`cursor-pointer transition-all ${
                  isPlatformSelected(platform) || allOrNoPlatformsSelected
                    ? getPlatformColorClass(platform)
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                onClick={() => togglePlatformFilter(platform)}
              >
                {getPlatformDisplayName(platform)}
              </Badge>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">Status</h3>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(option => (
              <Badge
                key={option.value}
                variant={filter.status === option.value ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleStatusChange(option.value)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
