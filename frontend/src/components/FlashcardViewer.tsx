import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { marketplaceApi, type Flashcard } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FlashcardViewerProps {
  lessonId?: number;
  flashcards: Flashcard[];
}

export function FlashcardViewer({ lessonId, flashcards: initialFlashcards }: FlashcardViewerProps) {
  const [cards, setCards] = useState<Flashcard[]>(initialFlashcards);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<"text" | "image">("text");
  
  // Generating states
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  
  const t = useI18n((s) => s.t);
  const { toast } = useToast();

  // Sync state if initialFlashcards changes
  useEffect(() => {
    setCards(initialFlashcards);
    setActiveIndex(0);
    setFlipped(false);
  }, [initialFlashcards]);

  if (cards.length === 0) return null;
  const card = cards[activeIndex];

  const goTo = (idx: number) => {
    setActiveIndex(idx);
    setFlipped(false);
  };

  const handleGenerateSingle = async (e: React.MouseEvent, cardId: number) => {
    e.stopPropagation(); // Avoid flipping the card when clicking the button
    setGeneratingId(cardId);
    try {
      const targetLessonId = lessonId || card.lesson;
      if (!targetLessonId) {
        throw new Error("Dars aniqlanmadi.");
      }
      const res = await marketplaceApi.generateFlashcardImage(targetLessonId, cardId);
      if (res.flashcard) {
        setCards(prev => prev.map(c => c.id === cardId ? res.flashcard! : c));
        toast({
          title: t("marketplace.creator.withdrawSuccess") || "Muvaffaqiyatli",
          description: res.detail || "Rasm muvaffaqiyatli yaratildi!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Rasm yaratishda xatolik yuz berdi.",
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateBulk = async () => {
    setBulkGenerating(true);
    try {
      const res = await marketplaceApi.generateFlashcardImage(lessonId);
      if (res.flashcards) {
        setCards(res.flashcards);
        toast({
          title: t("marketplace.creator.withdrawSuccess") || "Muvaffaqiyatli",
          description: res.detail || "Barcha rasmlar muvaffaqiyatli yaratildi!",
        });
      }
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Barcha rasmlarni yaratishda xatolik yuz berdi.",
        variant: "destructive",
      });
    } finally {
      setBulkGenerating(false);
    }
  };

  const hasMissingImages = cards.some(c => !c.image_url);

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header and Toggle Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground/90">
          <span>{t("nav.flashcards") || "Kartochkalar"}</span>
          <span className="text-xs text-muted-foreground font-normal">({activeIndex + 1}/{cards.length})</span>
        </h4>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Mode Toggles */}
          <div className="flex bg-secondary/50 border border-border/80 p-0.5 rounded-lg text-xs w-full sm:w-auto">
            <button
              onClick={() => { setStudyMode("text"); setFlipped(false); }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${
                studyMode === "text"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {t("flashcards.modeText") || "Matn"}
            </button>
            <button
              onClick={() => { setStudyMode("image"); setFlipped(false); }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1 ${
                studyMode === "image"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              {t("flashcards.modeImage") || "Rasm"}
            </button>
          </div>

          {/* Bulk Generation Button */}
          {lessonId && hasMissingImages && (
            <Button
              size="sm"
              variant="outline"
              disabled={bulkGenerating}
              onClick={handleGenerateBulk}
              className="border-[#3a6651]/30 hover:bg-[#3a6651]/10 text-[#3a6651] font-bold text-xs h-9 gap-1.5 rounded-lg shrink-0"
            >
              {bulkGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{t("flashcards.generateAll") || "Barcha rasmlarni yaratish"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Flashcard Body */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped(!flipped)}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative min-h-[180px] w-full"
        >
          {/* FRONT SIDE */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl bg-secondary/20 border border-border flex flex-col items-center justify-center p-6 shadow-sm transition-opacity duration-300 ${
              flipped ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            {studyMode === "text" ? (
              <div className="text-center space-y-2">
                <p className="text-2xl font-display font-extrabold text-foreground text-center tracking-wide leading-relaxed">
                  {card.front_content}
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center text-center space-y-2">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt="flashcard prompt illustration"
                    className="max-h-28 max-w-full rounded-xl object-contain border border-border bg-white shadow-inner"
                  />
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {t("flashcards.noImageYet") || "Bu karta uchun hali rasm yaratilmagan."}
                    </p>
                    <Button
                      size="sm"
                      onClick={(e) => handleGenerateSingle(e, card.id)}
                      disabled={generatingId === card.id}
                      className="bg-[#3a6651] hover:bg-[#2e5241] text-white gap-1.5 font-bold rounded-lg"
                    >
                      {generatingId === card.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {t("flashcards.generateSingle") || "Rasm yaratish"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-wider font-semibold opacity-60">
              {t("flashcards.tapToFlip") || "Aylantirish uchun bosing"}
            </p>
          </div>

          {/* BACK SIDE */}
          <div
            className={`absolute inset-0 w-full h-full rounded-2xl bg-[#3a6651]/5 border border-[#3a6651]/30 flex flex-col items-center justify-center p-6 shadow-sm transition-opacity duration-300 ${
              flipped ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-center space-y-2">
              <p className="text-2xl font-display font-extrabold text-[#3a6651] text-center tracking-wide leading-relaxed">
                {card.back_content}
              </p>
              {studyMode === "image" && (
                <p className="text-sm font-semibold text-muted-foreground">{card.front_content}</p>
              )}
              {card.phonetic && (
                <p className="text-xs font-mono text-muted-foreground bg-secondary/60 px-3 py-1 rounded-full inline-block border border-border/50">
                  {card.phonetic}
                </p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-wider font-semibold opacity-60">
              {t("flashcards.tapToFlip") || "Aylantirish uchun bosing"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={activeIndex === 0}
          onClick={() => goTo(activeIndex - 1)}
          className="rounded-xl border-border h-9 font-semibold text-xs gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("flashcards.previous") || "Oldingi"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={activeIndex >= cards.length - 1}
          onClick={() => goTo(activeIndex + 1)}
          className="rounded-xl border-border h-9 font-semibold text-xs gap-1"
        >
          {t("flashcards.next") || "Keyingi"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Bullet Dot Indicators */}
      <div className="flex justify-center flex-wrap gap-1">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${
              i === activeIndex ? "bg-[#3a6651] scale-110" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
