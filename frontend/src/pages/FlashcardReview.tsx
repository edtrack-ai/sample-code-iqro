import { useState, useEffect, useMemo } from "react";
import { Languages, Loader2, Sparkles, MapPin, BookOpen, ChevronRight, ArrowLeft, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { roadmapApi, type Flashcard } from "@/lib/api";
import { FlashcardViewer } from "@/components/FlashcardViewer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface RoadmapGroup {
  id: number;
  title: string;
  totalCards: number;
  lessons: {
    id: number;
    title: string;
    cardsCount: number;
  }[];
}

const FlashcardReview = () => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation levels: null = level 1 (roadmaps list), number = level 2 (lessons list), { roadmapId, lessonId } = level 3 (practice mode)
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<number | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null | "ALL">(null);

  const t = useI18n((s) => s.t);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await roadmapApi.getFlashcardsForReview();
        setCards(data);
      } catch (err) {
        console.error("Error fetching review cards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  // Group all flashcards by Roadmap and Lesson
  const roadmapGroups = useMemo<RoadmapGroup[]>(() => {
    const groupMap = new Map<number, { title: string; lessonsMap: Map<number, { title: string; cardsCount: number }> }>();

    cards.forEach((card) => {
      const rmId = card.roadmap_id || 0;
      const rmTitle = card.roadmap_title || "Umumiy Yo'l xaritasi";
      const lsnId = card.lesson || 0;
      const lsnTitle = card.lesson_title || `Dars #${lsnId}`;

      if (!groupMap.has(rmId)) {
        groupMap.set(rmId, { title: rmTitle, lessonsMap: new Map() });
      }
      const rmEntry = groupMap.get(rmId)!;

      if (!rmEntry.lessonsMap.has(lsnId)) {
        rmEntry.lessonsMap.set(lsnId, { title: lsnTitle, cardsCount: 0 });
      }
      const lsnEntry = rmEntry.lessonsMap.get(lsnId)!;
      lsnEntry.cardsCount += 1;
    });

    const result: RoadmapGroup[] = [];
    groupMap.forEach((val, rmId) => {
      const lessonsList: { id: number; title: string; cardsCount: number }[] = [];
      let total = 0;
      val.lessonsMap.forEach((lsn, lsnId) => {
        lessonsList.push({ id: lsnId, title: lsn.title, cardsCount: lsn.cardsCount });
        total += lsn.cardsCount;
      });
      result.push({
        id: rmId,
        title: val.title,
        totalCards: total,
        lessons: lessonsList,
      });
    });

    return result;
  }, [cards]);

  const activeRoadmap = useMemo(() => {
    return roadmapGroups.find((rg) => rg.id === selectedRoadmapId) || null;
  }, [roadmapGroups, selectedRoadmapId]);

  const activeLesson = useMemo(() => {
    if (!activeRoadmap || selectedLessonId === null || selectedLessonId === "ALL") return null;
    return activeRoadmap.lessons.find((l) => l.id === selectedLessonId) || null;
  }, [activeRoadmap, selectedLessonId]);

  const activePracticeCards = useMemo(() => {
    if (!selectedRoadmapId) return [];
    if (selectedLessonId === "ALL") {
      return cards.filter((c) => (c.roadmap_id || 0) === selectedRoadmapId);
    }
    if (typeof selectedLessonId === "number") {
      return cards.filter((c) => (c.lesson || 0) === selectedLessonId);
    }
    return [];
  }, [cards, selectedRoadmapId, selectedLessonId]);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header & Breadcrumb */}
        <div className="space-y-4">
          {/* Main Title Row */}
          <div className="flex items-center gap-3 pl-12 md:pl-0 pt-1 md:pt-0">
            <div className="w-10 h-10 rounded-xl bg-[#3a6651]/10 flex items-center justify-center border border-[#3a6651]/20 shrink-0">
              <Languages className="w-5 h-5 text-[#3a6651]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {t("flashcards.title") || "Kartochkalarni takrorlash"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("flashcards.desc") || "O'rgangan darslaringizdan to'plangan barcha lug'atlarni mashq qiling."}
              </p>
            </div>
          </div>

          {/* Breadcrumb Pill Navigation with Back Action */}
          {selectedRoadmapId !== null && (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/50 px-3 py-2 rounded-xl border border-border/60 overflow-x-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedLessonId !== null) {
                    setSelectedLessonId(null);
                  } else {
                    setSelectedRoadmapId(null);
                  }
                }}
                className="h-7 px-2 text-xs font-bold text-[#3a6651] hover:bg-[#3a6651]/10 gap-1 rounded-lg shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Orqaga</span>
              </Button>

              <span className="text-border/80 font-light select-none">|</span>

              <button
                onClick={() => {
                  setSelectedRoadmapId(null);
                  setSelectedLessonId(null);
                }}
                className="hover:text-foreground shrink-0 transition-colors"
              >
                {t("nav.flashcards") || "Kartochkalar"}
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />

              {selectedLessonId === null ? (
                <span className="text-foreground font-bold truncate">
                  {activeRoadmap?.title}
                </span>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedLessonId(null)}
                    className="hover:text-foreground truncate transition-colors shrink-0 max-w-[140px]"
                  >
                    {activeRoadmap?.title}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-foreground font-bold truncate">
                    {selectedLessonId === "ALL"
                      ? (t("flashcards.reviewAll") || "Barcha kartochkalar")
                      : activeLesson?.title}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Content Views */}
        {loading ? (
          <div className="glass-card py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#3a6651]" />
            <p className="text-xs text-muted-foreground">Kartochkalar yuklanmoqda...</p>
          </div>
        ) : cards.length === 0 ? (
          /* Empty State */
          <div className="glass-card p-8 py-14 flex flex-col items-center justify-center text-center space-y-5 border-dashed border-2">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <Sparkles className="w-6 h-6 text-[#3a6651]" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="font-bold text-base text-foreground">
                Kartochkalar mavjud emas
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("flashcards.emptyState") || "Hali hech qanday til o'rganish yo'l xaritasini boshlamadingiz. Yangi til o'rganish yo'l xaritasini yarating va so'zlarni to'plashni boshlang!"}
              </p>
            </div>
            <Button
              onClick={() => navigate("/roadmaps")}
              className="bg-[#3a6651] hover:bg-[#2e5241] text-white font-bold rounded-xl text-xs h-10 px-6 shadow-sm"
            >
              Yo'l xaritalariga o'tish
            </Button>
          </div>
        ) : selectedRoadmapId === null ? (
          /* LEVEL 1: Roadmap Cards Grid */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground/90 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#3a6651]" />
                <span>{t("flashcards.selectRoadmap") || "Yo'l xaritalari ro'yxati"}</span>
              </h2>
              <span className="text-xs text-muted-foreground">{roadmapGroups.length} ta yo'l xaritasi</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmapGroups.map((rg) => (
                <div
                  key={rg.id}
                  onClick={() => setSelectedRoadmapId(rg.id)}
                  className="glass-card p-5 cursor-pointer hover:border-[#3a6651]/50 transition-all duration-200 group flex flex-col justify-between space-y-4 border border-border/70 hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-foreground group-hover:text-[#3a6651] transition-colors line-clamp-2">
                        {rg.title}
                      </h3>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground/70" />
                      <span>{rg.lessons.length} ta dars</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#3a6651]/10 text-[#3a6651] font-bold">
                      <Layers className="w-3.5 h-3.5" />
                      {rg.totalCards} {t("flashcards.cardsCount") || "ta kartochka"}
                    </span>
                    <span className="text-muted-foreground font-medium group-hover:text-[#3a6651] transition-colors">
                      Tanlash &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedLessonId === null ? (
          /* LEVEL 2: Lessons Cards List inside selected Roadmap */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-card p-4 border border-border/60">
              <div>
                <h2 className="font-bold text-base text-foreground">{activeRoadmap?.title}</h2>
                <p className="text-xs text-muted-foreground">
                  Jami {activeRoadmap?.totalCards} ta kartochka ({activeRoadmap?.lessons.length} ta dars)
                </p>
              </div>
              <Button
                onClick={() => setSelectedLessonId("ALL")}
                className="bg-[#3a6651] hover:bg-[#2e5241] text-white font-bold text-xs rounded-xl h-9 px-4 shrink-0 shadow-sm"
              >
                {t("flashcards.reviewAll") || "Barcha kartochkalarni takrorlash"}
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Darslar ro'yxati
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {activeRoadmap?.lessons.map((lsn) => (
                  <div
                    key={lsn.id}
                    onClick={() => setSelectedLessonId(lsn.id)}
                    className="glass-card p-4 cursor-pointer hover:border-[#3a6651]/40 transition-all flex items-center justify-between border border-border/60 group hover:shadow-sm"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground group-hover:text-[#3a6651] transition-colors">
                        {lsn.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {lsn.cardsCount} {t("flashcards.cardsCount") || "ta kartochka"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* LEVEL 3: Flashcard Practice Viewer */
          <div className="space-y-4">
            <FlashcardViewer
              lessonId={typeof selectedLessonId === "number" ? selectedLessonId : undefined}
              flashcards={activePracticeCards}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardReview;
