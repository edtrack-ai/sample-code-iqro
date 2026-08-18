import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Loader2, ClipboardCheck, Code2, MessageSquare, ThumbsUp, 
  ThumbsDown, RotateCcw, Copy, FunctionSquare, Languages, FlaskConical, 
  Menu, RefreshCw, BookOpen, Edit, Bold, Italic, Heading2, Heading3, 
  List, ListOrdered, Table2, Variable, Plus, Eye, Trash, Code, AlertCircle
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { VisualEditor } from "@/components/VisualEditor";
import { TextSelectionPopover } from "@/components/TextSelectionPopover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Lazy-loaded components for better performance
const CodePlayground = lazy(() => import("@/components/CodePlayground").then(m => ({ default: m.CodePlayground })));
const MathPlayground = lazy(() => import("@/components/MathPlayground").then(m => ({ default: m.MathPlayground })));
const LanguagePlayground = lazy(() => import("@/components/LanguagePlayground").then(m => ({ default: m.LanguagePlayground })));
const DynamicPlayground = lazy(() => import("@/components/DynamicPlayground").then(m => ({ default: m.DynamicPlayground })));
const QuizPanel = lazy(() => import("@/components/QuizPanel").then(m => ({ default: m.QuizPanel })));
const ChatPanel = lazy(() => import("@/components/ChatPanel").then(m => ({ default: m.ChatPanel })));
import { ModeSelector } from "@/components/ModeSelector";
import { CreditAlert } from "@/components/CreditAlert";
// ComingSoonOverlay removed — playground is now live
import { MobileSidebarTrigger } from "@/components/MobileSidebar";
import { BackButton } from "@/components/BackButton";
import { roadmapApi, marketplaceApi, type ApiLesson, type QuizData, type LessonMode, type PlaygroundStatus } from "@/lib/api";
import { handleApiError } from "@/lib/errorHandler";
import { connectLessonStream, type WSHandle } from "@/lib/ws";
import { useRoadmapStore } from "@/lib/roadmapStore";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const PanelLoader = ({ label }: { label: string }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-card/10 animate-pulse">
    <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
  </div>
);

const LearnMode = () => {
  const navigate = useNavigate();
  const { roadmapId, lessonId } = useParams<{ roadmapId: string; lessonId: string }>();
  const { activeRoadmap, updateRoadmap } = useRoadmapStore();
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const t = useI18n((s) => s.t);

  const [lesson, setLesson] = useState<ApiLesson | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isStreamingContent, setIsStreamingContent] = useState(false);
  const [selectedTextForChat, setSelectedTextForChat] = useState("");
  const [rightTab, setRightTab] = useState("chat");
  const [mobileTab, setMobileTab] = useState<"lesson" | "chat">("lesson");

  const [playgroundCode, setPlaygroundCode] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [generatingPlayground, setGeneratingPlayground] = useState(false);
  const [hasStreamError, setHasStreamError] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [savingContent, setSavingContent] = useState(false);

  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [editedQuizJson, setEditedQuizJson] = useState("");
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>>([]);

  const [editorTab, setEditorTab] = useState<"visual" | "markdown" | "preview">("visual");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const numericLessonId = Number(lessonId);
  const lessonMode = lesson?.mode || "GENERAL";

  // Reset mobile view back to lesson when switching lessons
  useEffect(() => {
    setMobileTab("lesson");
  }, [numericLessonId]);

  useEffect(() => {
    if (content) {
      setEditedContent(content);
    }
  }, [content]);

  const handleCopyContent = () => {
    if (!content) return;
    navigator.clipboard.writeText(content)
      .then(() => {
        toast({
          title: "Nusxalandi",
          description: "Dars matni nusxalandi.",
        });
      })
      .catch((err) => {
        console.error("Nusxalashda xatolik:", err);
        try {
          const textarea = document.createElement("textarea");
          textarea.value = content;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          toast({
            title: "Nusxalandi",
            description: "Dars matni nusxalandi.",
          });
        } catch (e) {
          toast({
            title: "Xatolik",
            description: "Nusxalashda xatolik yuz berdi.",
            variant: "destructive",
          });
        }
      });
  };

  // Auto-scroll during streaming
  const scrollToBottom = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: contentRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    if (isStreamingContent) {
      scrollToBottom();
    }
  }, [content, isStreamingContent, scrollToBottom]);

  // Safety net: Automatically turn off streaming cursor 3s after the last text chunk arrives
  useEffect(() => {
    if (!isStreamingContent || !content) return;
    const timer = setTimeout(() => {
      setIsStreamingContent(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [content, isStreamingContent]);

  // Use React Query for initial lesson data
  const { data: initialLesson, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ["lesson", numericLessonId],
    queryFn: async () => {
      if (!numericLessonId) return null;
      await roadmapApi.unlockLesson(numericLessonId);
      const updatedRoadmap = await roadmapApi.getDetails(Number(roadmapId));
      const foundLesson = updatedRoadmap.lessons.find((l) => l.id === numericLessonId);
      return foundLesson || null;
    },
    enabled: !!numericLessonId,
    staleTime: 0, // Always fetch fresh lesson content to avoid stale empty content cache
  });

  // 1. Sync state with loaded initialLesson from React Query
  useEffect(() => {
    if (lessonError) {
      handleApiError(lessonError, {
        toast,
        navigate,
        onCreditsError: (msg) => setCreditError(msg),
      });
      setLoading(false);
      setIsStreamingContent(false);
      return;
    }

    if (initialLesson) {
      setLesson(initialLesson);
      setQuizData(initialLesson.quiz || null);
      setPlaygroundCode(initialLesson.code_editor?.initial_code || null);
      if (initialLesson.content) {
        setContent(initialLesson.content);
        setIsStreamingContent(false);
        setLoading(false);
      } else if (!hasStreamError) {
        setLoading(false);
        setIsStreamingContent(true);
      }
    } else if (lessonLoading) {
      setLoading(true);
    }
  }, [initialLesson, lessonLoading, lessonError, toast, navigate, hasStreamError]);

  // 2. Persistent WebSocket connection for lesson events (chunks, metadata, done)
  useEffect(() => {
    if (!numericLessonId) return;

    let wsHandle: WSHandle | null = null;
    let accumulated = "";

    wsHandle = connectLessonStream(numericLessonId, {
      onChunk: (chunk) => {
        accumulated += chunk;
        setContent(accumulated);
        setLoading(false);
        setIsStreamingContent(true);
      },
      onContentReady: (fullContent) => {
        accumulated = fullContent;
        setContent(fullContent);
        setIsStreamingContent(false);
        setLoading(false);
      },
      onDone: () => {
        setIsStreamingContent(false);
        setLoading(false);
        // Refetch roadmap details so React Query cache gets updated DB content
        if (roadmapId) {
          roadmapApi.getDetails(Number(roadmapId)).then((updatedRoadmap) => {
            const found = updatedRoadmap.lessons.find((l) => l.id === numericLessonId);
            if (found && found.content) {
              setLesson(found);
            }
          }).catch(() => {});
        }
      },
      onMetadataReady: (metadata) => {
        setLesson((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, ...metadata } as ApiLesson;
          if (updated.quiz) setQuizData(updated.quiz);
          return updated;
        });
        if (metadata.playground_status === "ready" || metadata.has_playground) {
          setGeneratingPlayground(false);
        }
      },
      onPlaygroundStatus: (payload) => {
        if (payload.status === "ready") {
          setGeneratingPlayground(false);
        } else if (payload.status === "generating") {
          setGeneratingPlayground(true);
        }
      },
      onError: (err) => {
        console.warn("Lesson stream WS Error:", err);
        // Only show error if we are actively expecting data
        if (isStreamingContent || generatingPlayground) {
          setIsStreamingContent(false);
          setHasStreamError(true);
          setLoading(false);
          toast({
            title: "Ulanish uzildi",
            description: "Server bilan aloqa yo'qoldi. Iltimos, sahifani yangilang.",
            variant: "destructive"
          });
        }
      },
      onFatalError: (msg) => {
        setIsStreamingContent(false);
        setHasStreamError(true);
        setLoading(false);
        toast({
          title: "Xatolik yuz berdi",
          description: msg === "Unknown error" ? "Serverda xatolik yuz berdi." : msg,
          variant: "destructive"
        });
      },
    });

    return () => {
      wsHandle?.close();
    };
  }, [numericLessonId]);

  const extractPlayground = (rawContent: string) => {
    const codeMatch = rawContent.match(/```(?:python|javascript|js|ts|typescript)\n([\s\S]*?)(?:```|$)/);
    if (codeMatch && codeMatch[1].trim().length > 5) {
      setPlaygroundCode(codeMatch[1].trim());
    }
  };

  const insertFormatting = (before: string, after = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + (selected || "matn") + after;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setEditedContent(newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || "matn").length);
    }, 50);
  };

  const handleSaveContent = async () => {
    if (!numericLessonId) return;
    setSavingContent(true);
    try {
      await marketplaceApi.editCourseLesson(numericLessonId, { content: editedContent });
      setContent(editedContent);
      if (lesson) {
        setLesson({ ...lesson, content: editedContent });
      }
      setIsEditingContent(false);
      toast({
        title: "Muvaffaqiyatli",
        description: "Dars matni yangilandi.",
      });
    } catch (err: any) {
      toast({
        title: "Tahrir xatoligi",
        description: err.message || "Dars matnini saqlab bo'lmadi. (Siz ushbu darslik yaratuvchisi emassiz).",
        variant: "destructive",
      });
    } finally {
      setSavingContent(false);
    }
  };

  const handleOpenQuizEditor = () => {
    const questions = quizData?.questions || [];
    setQuizQuestions(JSON.parse(JSON.stringify(questions)));
    setIsEditingQuiz(true);
  };

  const handleSaveQuiz = async () => {
    if (!numericLessonId) return;
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.question.trim()) {
        toast({
          title: "Xatolik",
          description: `${i + 1}-savol matni bo'sh bo'lishi mumkin emas.`,
          variant: "destructive",
        });
        return;
      }
      if (q.options.some((o) => !o.trim())) {
        toast({
          title: "Xatolik",
          description: `${i + 1}-savolning barcha variantlari to'ldirilishi shart.`,
          variant: "destructive",
        });
        return;
      }
    }

    setSavingQuiz(true);
    try {
      const payload = { questions: quizQuestions };
      await marketplaceApi.editCourseLesson(numericLessonId, { quiz: payload });
      setQuizData(payload);
      setIsEditingQuiz(false);
      toast({
        title: "Muvaffaqiyatli",
        description: "Quiz muvaffaqiyatli yangilandi.",
      });
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Quizni saqlashda xatolik yuz berdi.",
        variant: "destructive",
      });
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleAskAI = (text: string) => {
    setSelectedTextForChat(`Explain this: "${text}"`);
    setRightTab("chat");
    if (isMobile) setMobileTab("chat");
  };

  const handleModeSwitch = async (mode: LessonMode | null) => {
    if (!mode || !numericLessonId || mode === lessonMode) return;
    setSwitchingMode(true);
    try {
      const updatedLesson = await roadmapApi.setLessonMode(numericLessonId, mode);
      setLesson(updatedLesson);
      if (updatedLesson.code_editor?.initial_code) {
        setPlaygroundCode(updatedLesson.code_editor.initial_code);
      }
      if (updatedLesson.quiz) setQuizData(updatedLesson.quiz);
      setRightTab("playground");
      toast({ title: t("learn.modeSwitched"), description: `${t("learn.switchedTo")} ${mode} ${t("learn.mode")}` });
    } catch (err) {
      handleApiError(err, { toast, navigate, onCreditsError: (msg) => setCreditError(msg) });
    } finally {
      setSwitchingMode(false);
    }
  };

  const handleQuizComplete = async (score: number) => {
    if (score >= 80 && roadmapId) {
      try {
        const updatedRoadmap = await roadmapApi.getDetails(Number(roadmapId));
        updateRoadmap(updatedRoadmap);
        const updatedLesson = updatedRoadmap.lessons.find((l) => l.id === numericLessonId);
        if (updatedLesson) setLesson(updatedLesson);
      } catch {
        // Non-blocking
      }
    }
  };

  const handleTaskSubmitted = async () => {
    if (!roadmapId) return;
    try {
      const updatedRoadmap = await roadmapApi.getDetails(Number(roadmapId));
      updateRoadmap(updatedRoadmap);
      const updatedLesson = updatedRoadmap.lessons.find((l) => l.id === numericLessonId);
      if (updatedLesson) setLesson(updatedLesson);
      toast({ title: t("playground.taskSubmitted"), description: t("playground.answerRecorded") });
    } catch {
      // Non-blocking
    }
  };

  const handleGeneratePlayground = async () => {
    if (!numericLessonId) return;
    setGeneratingPlayground(true);
    // Optimistically update playground_status
    setLesson((prev) => prev ? { ...prev, playground_status: "generating" as PlaygroundStatus } : prev);
    try {
      await roadmapApi.generatePlayground(numericLessonId);
      toast({ title: t("playground.generating"), description: t("playground.beingBuilt") });
    } catch (err) {
      handleApiError(err, { toast, navigate, onCreditsError: (msg) => setCreditError(msg) });
      setGeneratingPlayground(false);
      setLesson((prev) => prev ? { ...prev, playground_status: "not_started" as PlaygroundStatus } : prev);
    }
  };

  // Determine playground availability using new contract fields, with legacy fallback
  const playgroundStatus: PlaygroundStatus = lesson?.playground_status || "not_started";
  const hasDynamicBundle =
    (lesson?.has_playground && !!lesson?.playground_code) ||
    (lesson?.playground?.type === "dynamic_bundle" && !!lesson.playground.html_bundle);
  const playgroundHtmlCode = lesson?.playground_code || lesson?.playground?.html_bundle || "";
  // const hasPlayground = true; // Always show tab — generate button or rendered playground
  const hasPlayground = false;
  const hasQuiz = true;

  const getPlaygroundIcon = () => {
    switch (lessonMode) {
      case "MATH": return <FunctionSquare className="w-3.5 h-3.5" />;
      case "LANGUAGE": return <Languages className="w-3.5 h-3.5" />;
      default: return <Code2 className="w-3.5 h-3.5" />;
    }
  };

  const getPlaygroundLabel = () => {
    switch (lessonMode) {
      case "MATH": return t("learn.mathLab");
      case "LANGUAGE": return t("learn.languageLab");
      default: return t("learn.playground");
    }
  };

  const renderPlayground = () => {
    // Dynamic bundle ready — render iframe
    if (hasDynamicBundle && playgroundHtmlCode) {
      return (
        <Suspense fallback={<PanelLoader label="Loading Simulation..." />}>
          <DynamicPlayground
            htmlBundle={playgroundHtmlCode}
            lessonId={numericLessonId}
            onTaskSubmitted={handleTaskSubmitted}
            onRegenerate={handleGeneratePlayground}
            regenerating={generatingPlayground}
          />
        </Suspense>
      );
    }

    // Currently generating (from playground_status or local state)
    if (playgroundStatus === "generating" || generatingPlayground) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
            {getPlaygroundIcon()}
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {getPlaygroundLabel()}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-primary/5 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">{t("playground.buildingSimulation")}</p>
                <p className="text-xs text-muted-foreground">{t("playground.mayTake")}</p>
              </div>
            </motion.div>
          </div>
        </div>
      );
    }

    // Failed state
    if (playgroundStatus === "failed") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
            {getPlaygroundIcon()}
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {getPlaygroundLabel()}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <FlaskConical className="w-7 h-7 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{t("playground.failed")}</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">{t("playground.failedDesc")}</p>
              </div>
              <Button
                onClick={handleGeneratePlayground}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t("playground.retry")}
              </Button>
            </motion.div>
          </div>
        </div>
      );
    }

    // Not started — show generate button or specific playgrounds if data exists
    const hasAnyContent = (lessonMode === "MATH" && (lesson?.latex_formulas?.length || lesson?.graph_plotter)) ||
      (lessonMode === "CODE" && playgroundCode) ||
      (lessonMode === "LANGUAGE");

    if (hasAnyContent) {
      return (
        <div className="flex flex-col h-full bg-card/30">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
            {getPlaygroundIcon()}
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {getPlaygroundLabel()}
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <Suspense fallback={<PanelLoader label="Loading Lab..." />}>
              {lessonMode === "MATH" ? (
                <MathPlayground
                  lessonId={numericLessonId}
                  onTaskSubmitted={handleTaskSubmitted}
                  latexFormulas={lesson?.latex_formulas}
                  graphPlotter={lesson?.graph_plotter}
                />
              ) : lessonMode === "LANGUAGE" ? (
                <LanguagePlayground
                  lessonId={numericLessonId}
                  onTaskSubmitted={handleTaskSubmitted}
                />
              ) : (
                <CodePlayground
                  initialCode={playgroundCode || ""}
                  language={lesson?.language?.toLowerCase() || "python"}
                  lessonId={numericLessonId}
                  onTaskSubmitted={handleTaskSubmitted}
                />
              )}
            </Suspense>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
          {getPlaygroundIcon()}
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {getPlaygroundLabel()}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <FlaskConical className="w-7 h-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t("playground.noPlayground")}</p>
              <p className="text-xs text-muted-foreground max-w-[240px]">{t("playground.noPlaygroundDesc")}</p>
            </div>
            <Button
              onClick={handleGeneratePlayground}
              className="gap-2 bg-primary hover:bg-primary/90"
              disabled={isStreamingContent}
            >
              <FlaskConical className="w-4 h-4" />
              {t("playground.generateBtn")}
            </Button>
          </motion.div>
        </div>
      </div>
    );
  };

  const lessonContentPanel = (
    <div ref={contentRef} className="h-full overflow-auto relative">
      <div className="px-6 py-8 md:px-12 md:py-10 max-w-none">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <div className="p-4 rounded-2xl bg-primary/10 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{t("learn.aiThinking")}</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {isEditingContent ? (
              <div className="space-y-4 max-w-[720px] bg-card border border-border rounded-xl p-4 shadow-sm">
                {/* Editor Tabs & Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-3 border-b border-border/60">
                   <div className="flex gap-1.5 bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setEditorTab("visual")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        editorTab === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Vizual tahrirlash
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("markdown")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        editorTab === "markdown" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Markdown kod
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("preview")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        editorTab === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        Ko'rib chiqish
                      </span>
                    </button>
                  </div>

                  {/* Visual Formatting Toolbar */}
                  {editorTab === "markdown" && (
                    <div className="flex flex-wrap gap-1 items-center bg-muted/40 p-1 rounded-lg border border-border/40">
                      <button
                        type="button"
                        title="Qalin (Bold)"
                        onClick={() => insertFormatting("**", "**")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Kursiv (Italic)"
                        onClick={() => insertFormatting("*", "*")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Sarlavha 2"
                        onClick={() => insertFormatting("\n## ")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Heading2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Sarlavha 3"
                        onClick={() => insertFormatting("\n### ")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Heading3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Oddiy ro'yxat"
                        onClick={() => insertFormatting("\n- ")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Raqamli ro'yxat"
                        onClick={() => insertFormatting("\n1. ")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Jadval"
                        onClick={() => insertFormatting("\n| Ustun 1 | Ustun 2 |\n|---|---|\n| Qiymat 1 | Qiymat 2 |\n")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Table2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Formula"
                        onClick={() => insertFormatting("$ ", " $")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Variable className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Kod bloki"
                        onClick={() => insertFormatting("\n```python\n", "\n```\n")}
                        className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {editorTab === "visual" ? (
                  <VisualEditor value={editedContent} onChange={setEditedContent} />
                ) : editorTab === "markdown" ? (
                  <textarea
                    ref={textareaRef}
                    className="w-full min-h-[450px] p-4 text-sm font-mono border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-[#3a6651]"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                  />
                ) : (
                  <div className="min-h-[450px] p-4 border border-border rounded-xl bg-background overflow-y-auto max-h-[60vh]">
                    <MarkdownRenderer content={editedContent} />
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-3 border-t border-border/40">
                  <Button size="sm" variant="outline" onClick={() => setIsEditingContent(false)}>
                    Bekor qilish
                  </Button>
                  <Button size="sm" onClick={handleSaveContent} disabled={savingContent} className="bg-[#3a6651] hover:bg-[#2e5241] text-white">
                    {savingContent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Saqlash"}
                  </Button>
                </div>
              </div>
            ) : content ? (
              <div className="max-w-[720px]">
                <MarkdownRenderer content={content} />
              </div>
            ) : isStreamingContent ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{t("learn.generatingContent")}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Generatsiya to'xtatildi yoki xatolik yuz berdi</p>
                  <p className="text-sm mt-1">AI xizmatlarida limitga tushgan bo'lishingiz mumkin. Iltimos biroz kutib, qayta urinib ko'ring.</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()} className="mt-2">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Qayta yuklash
                </Button>
              </div>
            )}

            {/* Streaming cursor */}
            {isStreamingContent && content && (
              <span className="streaming-cursor" />
            )}

            {/* Gemini-style action bar */}
            {!isStreamingContent && content && (
              <div className="flex items-center gap-1 mt-6 pt-4 border-t border-border/40">
                <button
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  onClick={handleCopyContent}
                  title="Nusxalash"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* Creator Edit Controls */}
                <button
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3a6651]/20 bg-[#3a6651]/5 text-[#3a6651] hover:bg-[#3a6651]/10 transition-colors text-xs font-bold"
                  onClick={() => setIsEditingContent(true)}
                >
                  <Edit className="w-3.5 h-3.5" />
                  Darsni tahrirlash
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3a6651]/20 bg-[#3a6651]/5 text-[#3a6651] hover:bg-[#3a6651]/10 transition-colors text-xs font-bold"
                  onClick={handleOpenQuizEditor}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Quizni tahrirlash
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {contentRef.current && (
        <TextSelectionPopover
          containerRef={contentRef as React.RefObject<HTMLElement>}
          onAskAI={handleAskAI}
        />
      )}
    </div>
  );

  const rightPanelTabs = (
    <Tabs value={rightTab} onValueChange={setRightTab} className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b border-border bg-card/60 px-2 h-10 shrink-0">
        <TabsTrigger
          value="chat"
          className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5 text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {t("learn.aiChat")}
        </TabsTrigger>
        {hasPlayground && (
          <TabsTrigger
            value="playground"
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5 text-xs"
          >
            {getPlaygroundIcon()}
            {getPlaygroundLabel()}
          </TabsTrigger>
        )}
        {hasQuiz && (
          <TabsTrigger
            value="quiz"
            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5 text-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            {t("learn.quiz")}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
        <Suspense fallback={<PanelLoader label="Opening Chat..." />}>
          <ChatPanel
            lessonId={numericLessonId}
            initialQuery={selectedTextForChat}
            onClearInitialQuery={() => setSelectedTextForChat("")}
          />
        </Suspense>
      </TabsContent>

      {/* Playground — always rendered (hidden when not active) to persist iframe state */}
      {hasPlayground && (
        <div className={`flex-1 m-0 overflow-hidden ${rightTab === "playground" ? "" : "hidden"}`}>
          {renderPlayground()}
        </div>
      )}

      {hasQuiz && (
        <TabsContent value="quiz" className="flex-1 m-0 overflow-auto">
          <Suspense fallback={<PanelLoader label="Loading Quiz..." />}>
            <QuizPanel
              key={numericLessonId}
              lessonId={numericLessonId}
              cachedQuiz={quizData}
              lastScore={lesson?.last_quiz_score}
              onQuizLoaded={(quiz) => setQuizData(quiz)}
              onComplete={handleQuizComplete}
              onNextLesson={() => {
                if (!activeRoadmap) return;
                const currentIdx = activeRoadmap.lessons.findIndex((l) => l.id === numericLessonId);
                const nextLesson = activeRoadmap.lessons[currentIdx + 1];
                if (nextLesson) {
                  if (isMobile) {
                    // Mobile: navigate to the next lesson page
                    navigate(`/learn/${roadmapId}/${nextLesson.id}`);
                  } else {
                    // PC: stay on page, navigate to next lesson and auto-show quiz
                    navigate(`/learn/${roadmapId}/${nextLesson.id}`);
                    setRightTab("quiz");
                  }
                } else {
                  navigate(`/generate?id=${roadmapId}`);
                }
              }}
            />
          </Suspense>
        </TabsContent>
      )}
    </Tabs>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-16 md:h-12 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card/80 backdrop-blur-md z-40 sticky top-0 pt-[env(safe-area-inset-top,0px)]">
        {/* The Menu/Back button is now provided by AppLayout, but it's fixed. 
            We leave a placeholder space of 48px on mobile to prevent overlapping. */}
        <div className="w-12 md:hidden" />

        <div className="flex-1 flex items-center justify-center md:justify-start overflow-hidden">
          <span className="text-sm md:text-sm font-semibold truncate text-center md:text-left">
            {lesson?.title || t("learn.loading")}
          </span>
        </div>

        {!isStreamingContent && content && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3a6651]/20 bg-[#3a6651]/5 text-[#3a6651] hover:bg-[#3a6651]/10 transition-colors text-xs font-bold"
              onClick={() => setIsEditingContent(true)}
            >
              <Edit className="w-3.5 h-3.5" />
              Darsni tahrirlash
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3a6651]/20 bg-[#3a6651]/5 text-[#3a6651] hover:bg-[#3a6651]/10 transition-colors text-xs font-bold"
              onClick={handleOpenQuizEditor}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              Quizni tahrirlash
            </button>
          </div>
        )}

        {/* Commented out ModeSelector as per user request
        <div className="hidden md:flex">
          <ModeSelector
            selected={lessonMode as LessonMode}
            onChange={handleModeSwitch}
            disabled={switchingMode || isStreamingContent}
          />
        </div>
        */}
        {switchingMode && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        <div className="w-12 md:hidden" /> {/* Spacer for symmetry on mobile if needed */}
      </div>

      {/* Credit alert */}
      {creditError && (
        <div className="px-container-px py-2 border-b border-border">
          <CreditAlert message={creditError} onDismiss={() => setCreditError(null)} />
        </div>
      )}



      {/* Main content */}
      {isMobile ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto pb-24">
            {mobileTab === "lesson" ? lessonContentPanel : rightPanelTabs}
          </div>

          {/* Bottom tab bar — Floating one-to-one with image */}
          <div className="fixed bottom-6 left-4 right-4 z-50 pointer-events-none">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3 pointer-events-auto">
              {/* Left Circle: Menu */}
              <button
                onClick={() => {
                  document.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'));
                }}
                className="w-14 h-14 rounded-full bg-white dark:bg-card border border-border/40 shadow-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Middle Pill: Lesson / Chat */}
              <div className="flex-1 h-14 bg-white/95 dark:bg-card/95 backdrop-blur-md border border-border/40 rounded-full shadow-lg flex p-1 gap-1">
                <button
                  onClick={() => setMobileTab("lesson")}
                  className={`flex-1 rounded-full text-sm transition-all ${mobileTab === "lesson" ? "text-foreground font-bold bg-muted/50" : "text-muted-foreground font-medium hover:text-foreground"
                    }`}
                >
                  {t("learn.lesson")}
                </button>
                <button
                  onClick={() => { setMobileTab("chat"); setRightTab("chat"); }}
                  className={`flex-1 rounded-full text-sm transition-all ${mobileTab === "chat" && rightTab === "chat" ? "text-foreground font-bold bg-muted/50" : "text-muted-foreground font-medium hover:text-foreground"
                    }`}
                >
                  {t("learn.chat")}
                </button>
              </div>

              {/* Right Pill: Quiz */}
              <button
                onClick={() => { setMobileTab("chat"); setRightTab("quiz"); }}
                className={`h-14 px-6 rounded-full bg-white dark:bg-card border border-border/40 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${mobileTab === "chat" && rightTab === "quiz" ? "text-foreground font-bold bg-muted/50" : "text-muted-foreground font-medium"
                  }`}
              >
                <ClipboardCheck className="w-5 h-5" />
                <span className="text-sm">{t("quiz.quizLabel")}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: resizable panels */
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={55} minSize={35}>
              {lessonContentPanel}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} minSize={25}>
              {rightPanelTabs}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* Quiz Editor Modal */}
      <Dialog open={isEditingQuiz} onOpenChange={setIsEditingQuiz}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz tahrirlovchi</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {quizQuestions.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Ushbu dars uchun savollar mavjud emas.</p>
              </div>
            ) : (
              quizQuestions.map((q, idx) => (
                <div key={idx} className="border border-border/80 rounded-xl p-4 bg-secondary/5 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3a6651] bg-[#3a6651]/15 px-2.5 py-0.5 rounded-full">
                      Savol #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = quizQuestions.filter((_, i) => i !== idx);
                        setQuizQuestions(next);
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="Savolni o'chirish"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Savol matni</Label>
                    <Input
                      value={q.question}
                      onChange={(e) => {
                        const next = [...quizQuestions];
                        next[idx].question = e.target.value;
                        setQuizQuestions(next);
                      }}
                      placeholder="Savol matnini kiriting..."
                      className="text-sm font-semibold h-9 focus-visible:ring-[#3a6651]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                      Variantlar (To'g'ri javobni tanlang)
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 border border-border/60 rounded-lg p-2.5 bg-background shadow-sm">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correct_index === optIdx}
                            onChange={() => {
                              const next = [...quizQuestions];
                              next[idx].correct_index = optIdx;
                              setQuizQuestions(next);
                            }}
                            className="w-4 h-4 text-[#3a6651] border-border/60 focus:ring-[#3a6651] accent-[#3a6651] cursor-pointer"
                          />
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const next = [...quizQuestions];
                              next[idx].options[optIdx] = e.target.value;
                              setQuizQuestions(next);
                            }}
                            placeholder={`Variant ${optIdx + 1}`}
                            className="h-8 text-xs flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tushuntirish (Izoh)</Label>
                    <textarea
                      value={q.explanation}
                      onChange={(e) => {
                        const next = [...quizQuestions];
                        next[idx].explanation = e.target.value;
                        setQuizQuestions(next);
                      }}
                      placeholder="To'g'ri javobga izoh yozing..."
                      className="w-full text-xs p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#3a6651]"
                      rows={2}
                    />
                  </div>
                </div>
              ))
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setQuizQuestions([
                  ...quizQuestions,
                  { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" },
                ])
              }
              className="w-full border-dashed gap-1 text-xs py-5 border-border hover:border-[#3a6651]/40 hover:bg-[#3a6651]/5 text-muted-foreground hover:text-[#3a6651] rounded-xl font-bold"
            >
              <Plus className="w-4 h-4" />
              Yangi savol qo'shish
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditingQuiz(false)}>
              Bekor qilish
            </Button>
            <Button size="sm" onClick={handleSaveQuiz} disabled={savingQuiz} className="bg-[#3a6651] hover:bg-[#2e5241] text-white">
              {savingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearnMode;
