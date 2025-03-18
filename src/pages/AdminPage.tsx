
import { useContests } from '@/hooks/useContests';
import AdminForm from '@/components/AdminForm';
import Header from '@/components/Header';
import { Skeleton } from '@/components/ui/skeleton';

const AdminPage = () => {
  const { contests, isLoading, error} = useContests();
  
  if (isLoading && contests.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 px-4 max-w-7xl">
          <h1 className="text-3xl font-bold mb-8 text-center">Admin Panel</h1>
          <Skeleton className="h-[400px] w-full max-w-2xl mx-auto rounded-lg" />
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 px-4 max-w-7xl">
          <h1 className="text-3xl font-bold mb-8 text-center">Admin Panel</h1>
          <div className="p-8 text-center rounded-lg border border-destructive/50 bg-destructive/10 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-2">Error Loading Contests...Reload!</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8 text-center">Admin Panel</h1>
        <AdminForm contests={contests} />
      </main>
    </div>
  );
};

export default AdminPage;
