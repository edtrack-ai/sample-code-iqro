import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

// Lazy-load pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GenerateRoadmap = lazy(() => import("./pages/GenerateRoadmap"));
const MyRoadmaps = lazy(() => import("./pages/MyRoadmaps"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const LearnMode = lazy(() => import("./pages/LearnMode"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const FlashcardReview = lazy(() => import("./pages/FlashcardReview"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="p-4 rounded-2xl bg-primary/10 animate-pulse">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading...</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/generate" element={<GenerateRoadmap />} />
              <Route path="/roadmaps" element={<MyRoadmaps />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/flashcards" element={<FlashcardReview />} />
              <Route path="/learn/:roadmapId/:lessonId" element={<LearnMode />} />
              <Route path="/marketplace" element={<Marketplace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
