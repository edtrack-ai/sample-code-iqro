import { useEffect } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { create } from "zustand";
import { AppSidebar } from "./AppSidebar";

interface MobileSidebarStore {
  isOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useMobileSidebar = create<MobileSidebarStore>((set) => ({
  isOpen: false,
  openSidebar: () => set({ isOpen: true }),
  closeSidebar: () => set({ isOpen: false }),
  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export function MobileSidebarTrigger({ show = true }: { show?: boolean }) {
  const { isOpen, openSidebar, closeSidebar, toggleSidebar } = useMobileSidebar();
  const location = useLocation();

  // Close sidebar automatically whenever URL path or search query changes
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, location.search, location.hash]);

  // Listen for legacy custom events
  useEffect(() => {
    const handleToggle = () => toggleSidebar();
    const handleForceClose = () => closeSidebar();

    document.addEventListener("toggle-mobile-sidebar", handleToggle);
    document.addEventListener("sidebar-force-close", handleForceClose);

    return () => {
      document.removeEventListener("toggle-mobile-sidebar", handleToggle);
      document.removeEventListener("sidebar-force-close", handleForceClose);
    };
  }, [toggleSidebar, closeSidebar]);

  return (
    <>
      {/* Hamburger button */}
      {show && !isOpen && (
        <button
          onClick={openSidebar}
          className="md:hidden fixed top-[env(safe-area-inset-top,0px)] left-0 z-50 w-[60px] h-[60px] flex items-center justify-center text-foreground"
          aria-label="Open menu"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-background/90 blur-backdrop border border-border/60 shadow-sm">
            <Menu className="w-5 h-5 text-[#3a6651]" />
          </div>
        </button>
      )}

      {/* Overlay + Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dark Backdrop Overlay */}
            <motion.div
              key="mobile-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                closeSidebar();
              }}
            />

            {/* Sidebar Drawer Container */}
            <motion.div
              key="mobile-sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed top-0 left-0 bottom-0 z-[70] w-[280px] max-w-[85vw] bg-sidebar border-r border-sidebar-border shadow-2xl flex flex-col"
            >
              <div className="h-full overflow-y-auto">
                <AppSidebar isMobile={true} onNavigate={closeSidebar} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
