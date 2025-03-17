
import React, { useState } from 'react';
import { Contest } from '@/utils/types';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { getPlatformDisplayName } from '@/utils/helpers';
import { toast } from '@/components/ui/use-toast';
import { addSolutionUrl } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormValues {
  contestId: string;
  youtubeUrl: string;
}

interface ManualSolutionFormProps {
  filteredContests: Contest[];
}

const ManualSolutionForm: React.FC<ManualSolutionFormProps> = ({ filteredContests }) => {
  const form = useForm<FormValues>({
    defaultValues: {
      contestId: '',
      youtubeUrl: '',
    },
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Validate YouTube URL
      const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
      
      if (!youtubeUrlPattern.test(data.youtubeUrl)) {
        toast({
          title: "Invalid YouTube URL",
          description: "Please enter a valid YouTube URL",
          variant: "destructive",
        });
        return;
      }
      
      // Add solution URL
      addSolutionUrl(data.contestId, data.youtubeUrl);
      
      // Show success message
      toast({
        title: "Solution added",
        description: "The YouTube solution link has been added successfully",
        variant: "default",
      });
      
      // Reset form
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add solution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (filteredContests.length === 0) {
    return (
      <div className="p-4 bg-muted/40 rounded-md text-center">
        <p className="text-muted-foreground">No completed contests found with the current filters</p>
      </div>
    );
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="contestId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contest</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contest" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[300px]">
                  {filteredContests.map((contest) => (
                    <SelectItem key={contest.contestId} value={contest.contestId}>
                      <span className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
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
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="youtubeUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>YouTube URL</FormLabel>
              <FormControl>
                <Input placeholder="https://www.youtube.com/watch?v=..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Solution"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ManualSolutionForm;
