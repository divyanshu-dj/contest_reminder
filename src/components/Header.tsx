
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Moon,
  Sun,
  Calendar,
  Menu,
  X
} from 'lucide-react';
import { useBookmarks } from '@/contexts/BookmarkContext';

interface HeaderProps {
  refreshContests?: () => Promise<void>;
}

const Header: React.FC<HeaderProps> = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { bookmarkedContests } = useBookmarks();
  const location = useLocation();

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';

      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Save preference to localStorage
      localStorage.setItem('theme', newTheme);

      return newTheme;
    });
  };

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    }
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/90 border-b">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-semibold tracking-tight transition-colors"
          >
            <Calendar className="h-6 w-6" />
            <span className="hidden sm:inline-block">Contest Cosmos Tracker</span>
            <span className="sm:hidden">CosmoTrack</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        {/* md:flex overides hidden when screensize>md and shows the component */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className={`nav-item ${isActive('/') ? 'nav-item-active' : 'hover:text-foreground hover:bg-muted'}`}
          >
            Home
          </Link>
          <Link
            to="/bookmarks"
            className={`nav-item ${isActive('/bookmarks') ? 'nav-item-active' : 'hover:text-foreground hover:bg-muted'}`}
          >
            Bookmarks {bookmarkedContests.length > 0 && <span className="ml-1 inline-block px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">{bookmarkedContests.length}</span>}
          </Link>
          <Link
            to="/admin"
            className={`nav-item ${isActive('/admin') ? 'nav-item-active' : 'hover:text-foreground hover:bg-muted'}`}
          >
            Admin
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="rounded-full transition-all hover:bg-primary/10"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden gap-4">

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="rounded-full transition-all hover:bg-primary/10"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-full transition-all hover:bg-primary/10"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/') ? 'nav-item-active' : 'hover:text-foreground hover:bg-muted'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/bookmarks"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/bookmarks') ? 'nav-item-active' : 'hover:text-foreground hover:bg-muted'} flex items-center`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>Bookmarks</span>
              {bookmarkedContests.length > 0 && (
                <span className="ml-2 inline-block px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                  {bookmarkedContests.length}
                </span>
              )}
            </Link>
            <Link
              to="/admin"
              className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/admin') ? 'nav-item-active' : 'hover:text-foreground hover:bg-muted'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Admin
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
