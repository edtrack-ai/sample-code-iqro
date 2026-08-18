import { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { Send, Loader2, Shuffle, GripVertical, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roadmapApi } from "@/lib/api";
import type { Flashcard } from "@/lib/api";
import { FlashcardViewer } from "@/components/FlashcardViewer";

interface LanguagePlaygroundProps {
  lessonId: number;
  flashcards?: Flashcard[];
  onTaskSubmitted?: () => void;
}

interface WordItem {
  id: number;
  text: string;
  originalIndex: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function LanguagePlayground({
  lessonId,
  flashcards,
  onTaskSubmitted,
}: LanguagePlaygroundProps) {
  // Scrambled sentence exercise
  const sampleSentence = "The quick brown fox jumps over the lazy dog";
  const words = sampleSentence.split(" ");

  const [items, setItems] = useState<WordItem[]>(() =>
    shuffleArray(words.map((text, i) => ({ id: i, text, originalIndex: i })))
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleShuffle = useCallback(() => {
    setItems(shuffleArray(words.map((text, i) => ({ id: i, text, originalIndex: i }))));
    setResult(null);
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    const userAnswer = items.map((item) => item.originalIndex);
    try {
      const res = await roadmapApi.submitTask(lessonId, userAnswer);
      setResult(res.detail);
      onTaskSubmitted?.();
    } catch {
      setResult("Could not submit answer. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60">
        <Languages className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Language Lab
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Flashcards */}
        {flashcards && flashcards.length > 0 && (
          <FlashcardViewer lessonId={lessonId} flashcards={flashcards} />
        )}

        {/* Scrambled Sentence */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Arrange the Sentence</h4>
            <Button variant="ghost" size="sm" onClick={handleShuffle} className="gap-1.5 h-7 text-xs">
              <Shuffle className="w-3.5 h-3.5" />
              Reshuffle
            </Button>
          </div>

          <Reorder.Group
            axis="x"
            values={items}
            onReorder={setItems}
            className="flex flex-wrap gap-2"
          >
            {items.map((item) => (
              <Reorder.Item
                key={item.id}
                value={item}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary/50 border border-border cursor-grab active:cursor-grabbing hover:border-primary/40 transition-colors select-none"
              >
                <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{item.text}</span>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <div className="flex justify-end mt-4">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit
            </Button>
          </div>

          {result && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg"
            >
              {result}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
