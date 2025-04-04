
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { BookmarkProvider } from "./contexts/BookmarkContext";
import { trackPageview } from "./analytics";
import { useEffect } from "react";

import Index from "./pages/Index";
import BookmarksPage from "./pages/BookmarksPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 12 * 60 * 60 * 1000, // 12hr
      refetchOnWindowFocus: false,
      staleTime: 6 * 60 * 60 * 1000, // 6hr
      retry: 2
    },
  },
});


function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
      <BookmarkProvider>
        <Toaster />
        <BrowserRouter>
          <AnalyticsTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </BookmarkProvider>
  </QueryClientProvider>
);

export default App;
