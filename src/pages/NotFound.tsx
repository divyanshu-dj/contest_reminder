
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { Link } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center backdrop-blur-sm bg-white/20 dark:bg-black/20 rounded-lg p-8 border max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl mb-6 text-muted-foreground">
          Oops! The page you're looking for doesn't exist.
        </p>
        
        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link to="/">Return to Home</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link to="/bookmarks">View Bookmarks</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
