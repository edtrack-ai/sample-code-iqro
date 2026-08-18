import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  ChevronRight,
  Sparkles,
  Loader2,
  History,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { roadmapApi, type QuizQuestion, type QuizData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface QuizPanelProps {
  lessonId: number;
  cachedQuiz?: QuizData | null;
  lastScore?: number | null;
  onQuizLoaded?: (quiz: QuizData) => void;
  onComplete?: (score: number) => void;
  onNextLesson?: () => void;
}

type Phase = "idle" | "generating" | "active" | "finished";

export function QuizPanel({
  lessonId,
  cachedQuiz,
  lastScore,
  onQuizLoaded,
  onComplete,
  onNextLesson,
}: QuizPanelProps) {
  const { toast } = useToast();
  const t = useI18n((s) => s.t);

  const isQuizValid = (quiz?: QuizData | null) => {
    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return false;
    const firstQ = quiz.questions[0];
    if (!firstQ) return false;
    const opts = Array.isArray(firstQ.options) ? firstQ.options : Array.isArray((firstQ as any).choices) ? (firstQ as any).choices : Array.isArray((firstQ as any).answers) ? (firstQ as any).answers : [];
    return opts.length > 0;
  };

  const [phase, setPhase] = useState<Phase>(isQuizValid(cachedQuiz) ? "active" : "idle");
  const [questions, setQuestions] = useState<QuizQuestion[]>(isQuizValid(cachedQuiz) ? cachedQuiz!.questions : []);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  useEffect(() => {
    const valid = isQuizValid(cachedQuiz);
    setPhase(valid ? "active" : "idle");
    setQuestions(valid ? cachedQuiz!.questions : []);
    setCurrentQ(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setFinalScore(null);
  }, [lessonId, cachedQuiz]);

  const question = questions[currentQ];
  const isCorrect = selected === question?.correct_index;

  const handleGenerate = async () => {
    setPhase("generating");
    try {
      const res = await roadmapApi.generateQuiz(lessonId);
      setQuestions(res.quiz.questions);
      onQuizLoaded?.(res.quiz);
      setPhase("active");
      if (!res.is_cached) {
        toast({ title: t("quiz.generated"), description: t("quiz.creditsUsed") });
      }
    } catch {
      toast({ title: t("quiz.failedGenerate"), description: t("quiz.tryAgainLater"), variant: "destructive" });
      setPhase("idle");
    }
  };

  const handleSelect = (index: number) => { if (!answered) setSelected(index); };

  const handleConfirm = () => {
    if (selected === null) return;
    setAnswered(true);
    setResults((prev) => [...prev, selected === question.correct_index]);
  };

  const handleNext = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      const score = [...results].filter(Boolean).length;
      const percentage = Math.round((score / questions.length) * 100);
      setFinalScore(percentage);
      setPhase("finished");
      try { await roadmapApi.submitQuiz(lessonId, percentage); } catch {}
      onComplete?.(percentage);
    }
  };

  const handleRetry = () => {
    setCurrentQ(0); setSelected(null); setAnswered(false); setResults([]); setFinalScore(null); setPhase("active");
  };

  if (phase === "idle" || phase === "generating") {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full gap-6">
        <div className="p-4 rounded-2xl bg-primary/10">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{t("quiz.lessonAssessment")}</h3>
          <p className="text-sm text-muted-foreground max-w-[280px]">{t("quiz.generateDesc")}</p>
        </div>
        {lastScore != null && (
          <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${lastScore >= 80 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
            <History className="w-3.5 h-3.5" />
            {t("quiz.lastAttempt")}: {lastScore}%
            {lastScore >= 80 && <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <Button onClick={handleGenerate} disabled={phase === "generating"} className="bg-primary text-primary-foreground gap-2">
            {phase === "generating" ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t("quiz.generating")}</>
            ) : (
              <><Sparkles className="w-4 h-4" />{lastScore != null ? t("quiz.retakeQuiz") : t("quiz.generateQuiz")}</>
            )}
          </Button>
          {lastScore != null && lastScore >= 80 && onNextLesson && (
            <Button onClick={onNextLesson} variant="outline" className="gap-2 border-success/30 text-success hover:bg-success/10">
              {t("quiz.nextLesson")}<ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "finished") {
    const finScore = finalScore ?? 0;
    const finPassed = finScore >= 80;
    const correctCount = results.filter(Boolean).length;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6">
        <div className="text-center py-8">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${finPassed ? "bg-success/20" : "bg-warning/20"}`}
          >
            {finPassed ? <Trophy className="w-9 h-9 text-success" /> : <RefreshCw className="w-9 h-9 text-warning" />}
          </motion.div>
          <h3 className="text-3xl font-display font-bold mb-1">{finScore}%</h3>
          <p className="text-muted-foreground text-sm">{correctCount} {t("quiz.of")} {questions.length} {t("quiz.correct")}</p>
          <p className={`text-sm font-medium mt-2 ${finPassed ? "text-success" : "text-warning"}`}>
            {finPassed ? t("quiz.passed") : t("quiz.failed")}
          </p>
          <div className="flex flex-col items-center gap-2 mt-6">
            <Button onClick={handleRetry} variant={finPassed ? "outline" : "default"} className={finPassed ? "border-border text-foreground" : "bg-primary text-primary-foreground"}>
              <RefreshCw className="w-4 h-4 mr-2" />{t("quiz.retakeQuiz")}
            </Button>
            {finPassed && onNextLesson && (
              <Button onClick={onNextLesson} className="bg-success hover:bg-success/90 text-success-foreground gap-2">
                {t("quiz.nextLesson")}<ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }



  if (!question || questions.length === 0) {
    return (
      <div className="p-6 text-center flex flex-col items-center justify-center h-full gap-4">
        <XCircle className="w-12 h-12 text-destructive opacity-50" />
        <p className="text-muted-foreground">
          {t("quiz.failedGenerate") || "Failed to generate questions. Please try again."}
        </p>
        <Button onClick={() => setPhase("idle")} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> {t("quiz.retakeQuiz") || "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex gap-1.5 mb-6">
        {questions.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i === currentQ ? "bg-primary" : i < currentQ ? results[i] ? "bg-success" : "bg-destructive/60" : "bg-secondary"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{t("quiz.question")} {currentQ + 1} {t("quiz.of")} {questions.length}</p>
      <AnimatePresence mode="wait">
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <h3 className="text-base font-semibold mb-5 text-foreground leading-relaxed">{question.question}</h3>
          <div className="space-y-2.5 mb-6">
            {(() => {
              const opts = Array.isArray(question.options) 
                ? question.options 
                : Array.isArray((question as any).choices) 
                  ? (question as any).choices 
                  : Array.isArray((question as any).answers) 
                    ? (question as any).answers 
                    : [];
              
              if (opts.length === 0) {
                return <p className="text-sm text-destructive">Malformed question data. Please regenerate the quiz.</p>;
              }

              return opts.map((opt, i) => {
                let style = "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground";
                if (answered) {
                  if (i === question.correct_index) style = "border-success bg-success/10 text-foreground";
                  else if (i === selected) style = "border-destructive bg-destructive/10 text-foreground";
                  else style = "border-border bg-secondary/20 text-muted-foreground/50";
                } else if (selected === i) {
                  style = "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30";
                }
                return (
                  <button key={i} onClick={() => handleSelect(i)} disabled={answered} className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${style}`}>
                    <span className="w-7 h-7 rounded-full border border-current/20 flex items-center justify-center text-xs font-semibold shrink-0">{String.fromCharCode(65 + i)}</span>
                    <span className="text-sm flex-1">{opt}</span>
                    {answered && i === question.correct_index && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                    {answered && i === selected && i !== question.correct_index && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                  </button>
                );
              });
            })()}
          </div>
          <AnimatePresence>
            {answered && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`rounded-xl p-4 mb-4 border ${isCorrect ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                <p className="text-sm text-muted-foreground leading-relaxed">{question.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-end gap-2">
            {!answered ? (
              <Button onClick={handleConfirm} disabled={selected === null} className="bg-primary text-primary-foreground" size="sm">{t("quiz.confirmAnswer")}</Button>
            ) : (
              <Button onClick={handleNext} className="bg-primary text-primary-foreground" size="sm">
                {currentQ < questions.length - 1 ? (<>{t("quiz.nextQuestion")}<ChevronRight className="w-4 h-4 ml-1" /></>) : t("quiz.viewResults")}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
