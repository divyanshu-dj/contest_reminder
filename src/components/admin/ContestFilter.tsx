import React, { useCallback } from "react"; 
import { Platform } from "@/utils/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContestFilterProps {
  platformFilter: Platform | "all";
  setPlatformFilter: (platform: Platform | "all") => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const ContestFilter: React.FC<ContestFilterProps> = React.memo(
  ({ platformFilter, setPlatformFilter, searchTerm, setSearchTerm }) => {
    
    const handlePlatformChange = useCallback(
      (value: string) => setPlatformFilter(value as Platform | "all"),
      [setPlatformFilter]
    );

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Platform Filter</label>
            <Select value={platformFilter} onValueChange={handlePlatformChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="codeforces">Codeforces</SelectItem>
                <SelectItem value="codechef">CodeChef</SelectItem>
                <SelectItem value="leetcode">LeetCode</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Search Contest</label>
            <Input
              placeholder="Search contest name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default ContestFilter;
