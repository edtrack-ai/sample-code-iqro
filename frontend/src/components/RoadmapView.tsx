import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, RotateCcw, Sparkles, BookOpen, Settings2, Lock, Play, RefreshCw, Loader2, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LessonCardSkeleton } from "@/components/LessonCardSkeleton";
import { useI18n } from "@/lib/i18n";
import type { ApiRoadmap, ApiLesson } from "@/lib/api";
import type { RoadmapProgressStatus } from "@/lib/ws";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RoadmapViewProps {
  roadmap: ApiRoadmap;
  onStartLearning: (lessonId: number) => void;
  onReplan: () => void;
  onContinueGenerating?: () => void;
  isGenerating?: boolean;
  generationStatus?: RoadmapProgressStatus | null;
}

interface WeekGroup {
  weekNumber: number;
  weekTitle: string;
  lessons: { lesson: ApiLesson; globalIndex: number }[];
}

function getLessonState(lesson: ApiLesson, index: number, lessons: ApiLesson[]): "completed" | "available" | "locked" {
  if (lesson.is_completed) return "completed";
  return "available";
}

function groupByWeek(lessons: ApiLesson[]): WeekGroup[] {
  const map = new Map<number, WeekGroup>();
  lessons.forEach((lesson, i) => {
    const wn = lesson.week_number ?? 1;
    const wt = lesson.week_title ?? `Week ${wn}`;
    if (!map.has(wn)) {
      map.set(wn, { weekNumber: wn, weekTitle: wt, lessons: [] });
    }
    map.get(wn)!.lessons.push({ lesson, globalIndex: i });
  });
  return Array.from(map.values()).sort((a, b) => a.weekNumber - b.weekNumber);
}

export function RoadmapView({ roadmap, onStartLearning, onReplan, onContinueGenerating, isGenerating, generationStatus }: RoadmapViewProps) {
  const t = useI18n((s) => s.t);
  const totalLessons = roadmap.lessons.length;
  const completedLessons = roadmap.lessons.filter((l) => l.is_completed).length;
  const totalPlanned = roadmap.total_lessons_count ?? totalLessons;
  const generated = roadmap.generated_lessons_count ?? totalLessons;
  const isComplete = generated >= totalPlanned;

  const weeks = groupByWeek(roadmap.lessons);
  // Assign sequential display numbers to avoid gaps (e.g. W3→W5 becomes W3→W4)
  const numberedWeeks = weeks.map((w, i) => ({ ...w, displayNumber: i + 1 }));
  const prevLessonCountRef = useRef(roadmap.lessons.length);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => {
    const firstAvailableWeek = numberedWeeks.find((w) =>
      w.lessons.some(({ lesson, globalIndex }) =>
        getLessonState(lesson, globalIndex, roadmap.lessons) === "available"
      )
    );
    return new Set([firstAvailableWeek?.weekNumber ?? weeks[0]?.weekNumber ?? 1]);
  });

  // Auto-open weeks when new lessons arrive during generation
  useEffect(() => {
    if (roadmap.lessons.length > prevLessonCountRef.current) {
      const newWeekNumbers = new Set(numberedWeeks.map((w) => w.weekNumber));
      setOpenWeeks((prev) => {
        const next = new Set(prev);
        newWeekNumbers.forEach((wn) => next.add(wn));
        return next;
      });
    }
    prevLessonCountRef.current = roadmap.lessons.length;
  }, [roadmap.lessons.length]);

  const toggleWeek = (wn: number) => {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(wn)) next.delete(wn);
      else next.add(wn);
      return next;
    });
  };

  return (
    <div>
      {/* Roadmap Title Card - Redesigned to match "how it works" style */}
      <div className="bg-white dark:bg-card border border-primary/20 rounded-2xl p-5 mb-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1 block">
                {t("roadmap.aiGenerated")}
              </span>
              <h2 className="text-xl md:text-2xl font-display font-bold break-words leading-tight">
                {roadmap.topic}
              </h2>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-secondary shrink-0 gap-2 font-semibold h-9 rounded-xl"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("roadmap.replan")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ishonchingiz komilmi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ushbu yo'l xaritasini qayta rejalashtirish mavjud barcha darslar, materiallar va testlarni o'chirib yuboradi hamda yangidan yaratishni boshlaydi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                  <AlertDialogAction onClick={onReplan} className="bg-[#3a6651] hover:bg-[#2e5241] text-white">
                    Qayta yaratish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs md:text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
              <Clock className="w-3.5 h-3.5" />
              {roadmap.total_estimated_hours} {t("roadmap.hoursTotal")}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
              <BookOpen className="w-3.5 h-3.5" />
              {numberedWeeks.length} {t("roadmap.weeks")}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50">
              <Settings2 className="w-3.5 h-3.5" />
              {roadmap.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{t("roadmap.overallProgress")}</span>
          <span className="text-sm font-semibold">
            {completedLessons}/{totalLessons} {t("roadmap.lessonsCompleted")}
          </span>
        </div>
        <Progress
          value={(completedLessons / Math.max(totalLessons, 1)) * 100}
          className="h-2 bg-secondary"
        />
      </div>

      {/* Info Banner */}
      <div className="glass-card p-4 mb-6 flex items-start gap-3 border-primary/20 bg-primary/5">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground mb-0.5">{t("roadmap.infoTitle")}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{t("roadmap.infoDesc")}</p>
        </div>
      </div>

      {/* Week Groups */}
      <div className="space-y-4">
        {numberedWeeks.map((week) => {
          const isOpen = openWeeks.has(week.weekNumber);
          const weekCompleted = week.lessons.filter(({ lesson }) => lesson.is_completed).length;
          const weekTotal = week.lessons.length;
          const weekProgress = (weekCompleted / Math.max(weekTotal, 1)) * 100;

          return (
            <div key={week.weekNumber} className="glass-card overflow-hidden">
              {/* Week Header */}
              <button
                onClick={() => toggleWeek(week.weekNumber)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">W{week.displayNumber}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm break-words">{week.weekTitle}</p>
                  <p className="text-xs text-muted-foreground">{weekTotal} {t("nav.lessons").toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Progress value={weekProgress} className="h-1.5 w-20 bg-secondary" />
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"
                      }`}
                  />
                </div>
              </button>

              {/* Lessons */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1.5">
                      {week.lessons.map(({ lesson, globalIndex }, localIndex) => {
                        const state = getLessonState(lesson, globalIndex, roadmap.lessons);
                        const isLocked = state === "locked";
                        const isCompleted = state === "completed";

                        return (
                          <motion.div
                            key={lesson.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: localIndex * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                            className={`flex items-center gap-4 px-4 py-3 rounded-lg border border-border/50 transition-colors ${isLocked
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-secondary/30 cursor-pointer"
                              }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${isCompleted
                                  ? "bg-success/20 text-success"
                                  : isLocked
                                    ? "bg-muted text-muted-foreground"
                                    : "bg-primary/20 text-primary"
                                }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isLocked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <span>{globalIndex + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-semibold text-sm">{lesson.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {lesson.duration} · {lesson.description}
                                </p>
                                {lesson.last_quiz_score != null && (
                                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${lesson.last_quiz_score >= 80
                                      ? "bg-success/10 text-success"
                                      : "bg-warning/10 text-warning"
                                    }`}>
                                    Quiz: {lesson.last_quiz_score}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => onStartLearning(lesson.id)}
                              disabled={isLocked}
                              className={
                                isCompleted
                                  ? "bg-success/10 text-success border border-success/20 hover:bg-success/20"
                                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
                              }
                            >
                              {isCompleted ? t("roadmap.review") : lesson.is_unlocked ? t("roadmap.continue") : t("roadmap.start")}
                            </Button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Skeleton placeholders while generating */}
        {isGenerating && <LessonCardSkeleton count={3} />}
      </div>

      {/* Continue Generating for incomplete roadmaps */}
      {!isComplete && !isGenerating && onContinueGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          <p className="text-sm text-muted-foreground">
            {generated} {t("roadmap.ofLessonsGenerated")} {totalPlanned} {t("roadmap.lessonsGenerated")}
          </p>
          <Button onClick={onContinueGenerating} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-8" size="lg">
            <RefreshCw className="w-4 h-4" />
            {t("roadmap.generateNext")}
          </Button>
        </motion.div>
      )}

      {isGenerating && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {generationStatus === "analyzing" ? t("roadmap.analyzingTopic")
            : generationStatus === "planning" ? t("roadmap.structuringNext")
              : generationStatus === "saving" ? t("roadmap.savingLessons")
                : t("roadmap.generatingBatch")}
        </div>
      )}

      {isComplete && totalPlanned > 0 && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          ✓ {t("roadmap.fullyPlanned")} — {totalLessons} {t("nav.lessons").toLowerCase()}
        </div>
      )}
    </div>
  );
}
