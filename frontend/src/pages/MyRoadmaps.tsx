import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Map, Plus, BookOpen, Clock, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useRoadmapStore } from "@/lib/roadmapStore";
import { useAuthStore } from "@/lib/authStore";
import { roadmapApi, type ApiRoadmap } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const MyRoadmaps = () => {
  const navigate = useNavigate();
  const { setActiveRoadmap, saveRoadmap, removeRoadmap } = useRoadmapStore();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const t = useI18n((s) => s.t);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Use React Query for caching and state management
  const { data: roadmaps = [], isLoading, isError } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: async () => {
      const data = await roadmapApi.list();
      const sorted = [...data].sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
      // Sync with store (optional, but keep for compatibility)
      sorted.forEach((r) => saveRoadmap(r));
      return sorted;
    },
    enabled: !!localStorage.getItem("edtrack-auth"), // Fetch whenever token/auth state exists
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
  });

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{ id: number; topic: string } | null>(null);
  const [codeInput, setCodeInput] = useState("");

  const generatedCode = useMemo(() => {
    if (!deleteDialog) return "";
    return String(Math.floor(1000 + Math.random() * 9000));
  }, [deleteDialog]);

  // Delete confirmation state

  const openDeleteDialog = (e: React.MouseEvent, roadmap: ApiRoadmap) => {
    e.stopPropagation();
    setCodeInput("");
    setDeleteDialog({ id: roadmap.id, topic: roadmap.topic });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog || codeInput !== generatedCode) return;
    const roadmapId = deleteDialog.id;
    setDeletingId(roadmapId);
    setDeleteDialog(null);
    try {
      await roadmapApi.deleteRoadmap(roadmapId);
      queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      removeRoadmap(roadmapId);
      toast({ title: t("myRoadmaps.deleted") });
    } catch {
      toast({ title: t("myRoadmaps.deleteFailed"), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="page-container flex flex-col items-center justify-center overflow-x-hidden pt-14 md:pt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto w-full"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-1">
          <div className="flex-1">
            <h1 className="text-3xl md:text-3xl font-display font-bold mb-1 text-left">
              {t("myRoadmaps.title")} <span className="gradient-text">{t("myRoadmaps.titleHighlight")}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {roadmaps.length} {t("myRoadmaps.pathsAvailable")}
            </p>
          </div>
          <Button
            onClick={() => navigate("/generate")}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-lg shadow-primary/20 w-full md:w-auto mt-2 md:mt-0"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span>{t("myRoadmaps.newRoadmap")}</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 animate-pulse border-border/40">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-muted rounded w-full" />
                  <div className="h-2 bg-muted rounded w-full opacity-50" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="glass-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <Map className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">{t("myRoadmaps.noRoadmaps")}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t("myRoadmaps.noRoadmapsDesc")}
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["roadmaps"] })}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("myRoadmaps.generateFirst")}
            </Button>
          </div>
        ) : roadmaps.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Map className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display font-semibold text-xl mb-2">{t("myRoadmaps.noRoadmaps")}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t("myRoadmaps.noRoadmapsDesc")}
            </p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("myRoadmaps.generateFirst")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {roadmaps.map((roadmap, i) => {
              const total = roadmap.lessons.length;
              const completed = roadmap.lessons.filter((l) => l.is_completed).length;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <motion.div
                  key={roadmap.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card p-5 md:p-6 hover:border-primary/50 transition-all cursor-pointer group active:scale-[0.98] border-border/40"
                  onClick={() => {
                    setActiveRoadmap(roadmap);
                    navigate(`/generate?id=${roadmap.id}&topic=${encodeURIComponent(roadmap.topic)}`);
                  }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-base md:text-lg leading-tight group-hover:text-primary transition-colors">
                        {roadmap.topic}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {roadmap.total_estimated_hours}h {t("myRoadmaps.total")}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-full bg-secondary/50 text-[10px] uppercase tracking-wider">
                          {roadmap.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button
                        onClick={(e) => openDeleteDialog(e, roadmap)}
                        disabled={deletingId === roadmap.id}
                        className="p-2 rounded-xl bg-destructive/5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 border border-destructive/10 shadow-sm"
                        title={t("myRoadmaps.delete")}
                      >
                        {deletingId === roadmap.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span>{t("myRoadmaps.courseProgress")}</span>
                      <span>{completed}/{total} {t("nav.lessons").toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={percent} className="h-2 flex-1 bg-secondary rounded-full overflow-hidden" />
                      <span className="text-xs font-bold text-primary w-10 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("myRoadmaps.deleteConfirm")}</DialogTitle>
            <DialogDescription>
              {t("myRoadmaps.areYouSure")} <strong>"{deleteDialog?.topic}"</strong>?
              <br />
              {t("myRoadmaps.deleteDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t("myRoadmaps.enterCode")}: <span className="font-mono font-bold text-foreground text-lg tracking-widest">{generatedCode}</span>
            </p>
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="0000"
              maxLength={4}
              className="text-center text-lg font-mono tracking-widest"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              {t("myRoadmaps.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={codeInput !== generatedCode}
            >
              {t("myRoadmaps.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRoadmaps;
