import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GraduationCap,
  ShoppingBag,
  BookOpen,
  FileText,
  Trophy,
  Settings,
  LogOut,
  Languages,
  Coins,
  CreditCard,
  Store,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRoadmapStore } from "@/lib/roadmapStore";
import { useAuthStore } from "@/lib/authStore";
import { useI18n } from "@/lib/i18n";
import BlackLogo from "@/assets/black-logo.svg";
import WhiteLogo from "@/assets/white-logo.svg";
import { useMobileSidebar } from "./MobileSidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function AppSidebar({ onNavigate, isMobile = false }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isEffectiveCollapsed = isMobile ? false : collapsed;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const activeRoadmap = useRoadmapStore((s) => s.activeRoadmap);
  const { user, logout, creditBalance, plan, fetchProfile } = useAuthStore();
  const t = useI18n((s) => s.t);

  useEffect(() => {
    fetchProfile();
  }, []);

  const navItems = [
    { title: t("nav.home"), icon: Sparkles, path: "/dashboard", authRequired: true },
    { title: t("nav.myRoadmaps"), icon: GraduationCap, path: "/roadmaps", authRequired: true },
    { title: t("nav.marketplace") || "Marketplace", icon: Store, path: "/marketplace" },
    { title: t("nav.purchasedCourses") || "Xarid qilingan kurslar", icon: ShoppingBag, path: "/marketplace?tab=purchased", authRequired: true },
    { title: t("nav.purchaseHistory") || "Xaridlar tarixi", icon: FileText, path: "/marketplace?tab=history", authRequired: true },
    { title: t("nav.flashcards"), icon: Languages, path: "/flashcards", authRequired: true },
    { title: t("nav.pricing"), icon: CreditCard, path: "/pricing" },
    { title: t("nav.settings"), icon: Settings, path: "/settings", authRequired: true },
  ];

  const filteredNavItems = navItems.filter(item => !item.authRequired || user);

  const totalLessons = activeRoadmap?.lessons.length ?? 0;
  const completedLessons = activeRoadmap?.lessons.filter((l) => l.is_completed).length ?? 0;

  const handleNavClick = (path: string) => {
    useMobileSidebar.getState().closeSidebar();
    onNavigate?.();
    setTimeout(() => {
      navigate(path);
    }, 10);
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    setShowLogoutDialog(false);
    logout();
    // Force close sidebar then navigate
    document.dispatchEvent(new CustomEvent('sidebar-force-close'));
    navigate("/");
  };

  return (
    <>
      <motion.aside
        animate={{ width: isMobile ? "100%" : (isEffectiveCollapsed ? 72 : 260) }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`sticky top-0 flex flex-col bg-sidebar shrink-0 ${
          isMobile ? "border-r-0 w-full min-h-full h-auto" : "border-r border-sidebar-border h-screen"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={BlackLogo} alt="Iqro AI Logo" className={`h-8 dark:hidden ${isEffectiveCollapsed && !isMobile ? 'w-8 object-cover object-left' : 'w-auto'}`} />
            <img src={WhiteLogo} alt="Iqro AI Logo" className={`h-8 hidden dark:block ${isEffectiveCollapsed && !isMobile ? 'w-8 object-cover object-left' : 'w-auto'}`} />
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                useMobileSidebar.getState().closeSidebar();
                onNavigate?.();
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground hover:text-foreground transition-all border border-border/40 shadow-xs cursor-pointer shrink-0"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="py-4 px-2">
          <AnimatePresence>
            {!isEffectiveCollapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                {t("nav.navigation")}
              </motion.p>
            )}
          </AnimatePresence>
          <nav className="space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = (location.pathname + location.search) === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  <AnimatePresence>
                    {!isEffectiveCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium overflow-hidden whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Roadmap Lessons */}
        <AnimatePresence>
          {user && activeRoadmap && !isEffectiveCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-auto px-2 pb-2"
            >
              <div className="px-3 mb-2 flex items-center gap-2">
                <BookOpen className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("nav.lessons")}
                </span>
              </div>
              <div className="space-y-0.5 max-h-[170px] overflow-y-auto pr-1">
                {activeRoadmap.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleNavClick(`/learn/${activeRoadmap.id}/${lesson.id}`)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-sidebar-accent transition-colors truncate"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{lesson.title}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-20 z-30 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-md cursor-pointer"
          >
            {isEffectiveCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Bottom: progress + logout */}
        <div className="mt-auto">
          <AnimatePresence>
            {!isEffectiveCollapsed && activeRoadmap && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mx-3 mb-2 p-3 glass-card rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t("nav.progress")}</span>
                  </div>
                  <span className="text-xs font-medium">
                    {completedLessons}/{totalLessons}
                  </span>
                </div>
                <Progress
                  value={(completedLessons / Math.max(totalLessons, 1)) * 100}
                  className="h-1.5 bg-secondary"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credits Badge */}
          {user && !isEffectiveCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-3 mb-2 p-3 glass-card rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">{t("nav.credits")}</span>
              </div>
              <span className={`text-xs font-semibold ${creditBalance <= 5 ? "text-destructive" : ""}`}>
                {creditBalance}
              </span>
            </motion.div>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors border-t border-sidebar-border"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {!isEffectiveCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-medium overflow-hidden whitespace-nowrap"
                  >
                    {user?.first_name || t("nav.logout")}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth?mode=login")}
              className="w-full flex items-center gap-3 px-5 py-3 text-[#3a6651] hover:text-white hover:bg-[#3a6651] transition-colors border-t border-sidebar-border"
            >
              <LogOut className="w-4 h-4 shrink-0 rotate-180" />
              <AnimatePresence>
                {!isEffectiveCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="text-sm font-semibold overflow-hidden whitespace-nowrap"
                  >
                    Kirish
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Sign out confirmation dialog — rendered via portal so it survives sidebar unmount */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-sm z-[100]">
          <DialogHeader>
            <DialogTitle>{t("signOut.title")}</DialogTitle>
            <DialogDescription>{t("signOut.desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              {t("signOut.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              {t("signOut.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
