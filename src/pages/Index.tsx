
import { useContests } from '@/hooks/useContests';
import Header from '@/components/Header';
import ContestList from '@/components/ContestList';
import FilterSection from '@/components/FilterSection';
import { Skeleton } from '@/components/ui/skeleton';
import GoogleCalendarSync from '@/components/GoogleCalendarSync';

const Index = () => {
  const { 
    contests,
    groupedContests,
    isLoading,
    error,
    filter,
    setFilter,
    togglePlatformFilter
  } = useContests();
  
  // Render loading skeleton
  if (isLoading && contests.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-6 px-4 max-w-7xl">
          <div className="w-full mb-8">
            <Skeleton className="h-[150px] w-full rounded-lg" />
          </div>
          <h2 className="text-2xl font-semibold mb-4">Ongoing Contests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={`ongoing-${i}`} className="h-[250px] rounded-lg" />
            ))}
          </div>
          <h2 className="text-2xl font-semibold mb-4">Upcoming Contests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={`upcoming-${i}`} className="h-[250px] rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-6 px-4 max-w-7xl">
          <div className="p-8 text-center rounded-lg border border-destructive/50 bg-destructive/10">
            <h2 className="text-xl font-semibold mb-2">Error Loading Contests...Reload!</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
          </div>
        </main>
      </div>
    );
  }
  
  const { ONGOING, UPCOMING, COMPLETED } = groupedContests;
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold text-center md:text-left">Contest Tracker</h1>
          <GoogleCalendarSync contests={contests} />
        </div>
        
        <FilterSection
          filter={filter}
          setFilter={setFilter}
          togglePlatformFilter={togglePlatformFilter}
        />
        
        {ONGOING.length > 0 && (
          <ContestList 
            title="Ongoing Contests" 
            contests={ONGOING} 
            initialDisplayCount={3}
            emptyMessage="No ongoing contests match your filters"
          />
        )}
        
        <ContestList 
          title="Upcoming Contests" 
          contests={UPCOMING} 
          initialDisplayCount={6}
          emptyMessage="No upcoming contests match your filters"
        />
        
        <ContestList 
          title="Past Contests" 
          contests={COMPLETED} 
          initialDisplayCount={6}
          emptyMessage="No past contests match your filters"
        />
      </main>
    </div>
  );
};

export default Index;
