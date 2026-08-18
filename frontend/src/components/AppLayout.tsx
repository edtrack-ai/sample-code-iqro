import { Outlet, useLocation, Navigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { MobileSidebarTrigger } from "./MobileSidebar";
import { BackButton } from "./BackButton";
import { useAuthStore } from "@/lib/authStore";

function getBackTarget(pathname: string, search: string): string | null {
  // Lesson page → back to roadmap view
  const learnMatch = pathname.match(/^\/learn\/(\d+)\/\d+$/);
  if (learnMatch) {
    return `/generate?id=${learnMatch[1]}`;
  }
  // Generate/roadmap view with id → back to roadmaps list
  if (pathname === "/generate" && search.includes("id=")) {
    return "/roadmaps";
  }
  
  // Top-level main pages should show MobileSidebarTrigger (hamburger menu), not global back button
  const topLevelPages = [
    "/dashboard", "/roadmaps", "/marketplace", "/flashcards", 
    "/pricing", "/settings", "/profile", "/favorites", "/leaderboard", "/generate"
  ];
  if (topLevelPages.includes(pathname)) {
    return null;
  }

  return "/dashboard";
}

export function AppLayout() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Check if token exists in localStorage
  let hasToken = false;
  try {
    const stored = localStorage.getItem("edtrack-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      hasToken = !!parsed?.state?.accessToken;
    }
  } catch {}

  // If user is not authenticated and has no active token, redirect to login
  if (!isAuthenticated && !hasToken) {
    return <Navigate to="/auth?mode=login" state={{ from: location }} replace />;
  }

  const backTarget = getBackTarget(location.pathname, location.search);
  const showBackButton = backTarget !== null;

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      {/* Mobile drawer sidebar / Back Button */}
      <div className="md:hidden">
        {showBackButton && (
          <div className="fixed top-[env(safe-area-inset-top,0px)] left-0 z-50 w-[60px] h-[60px] flex items-center justify-center">
            <BackButton to={backTarget} />
          </div>
        )}
        <MobileSidebarTrigger show={!showBackButton} />
      </div>

      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
