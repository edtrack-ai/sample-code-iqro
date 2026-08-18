import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Plus, Mic, ChevronDown, Send, Code2, Languages, FunctionSquare, Maximize2, Minimize2, FileText, Link, Globe, Check, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RoadmapView } from "@/components/RoadmapView";
import { LessonCardSkeleton } from "@/components/LessonCardSkeleton";
import { CreditAlert } from "@/components/CreditAlert";
import { useRoadmapStore } from "@/lib/roadmapStore";
import { useAuthStore } from "@/lib/authStore";
import {
  roadmapApi,
  type ApiRoadmap,
  type LessonMode,
} from "@/lib/api";
import { handleApiError } from "@/lib/errorHandler";
import { connectRoadmapProgress, type WSHandle, type RoadmapProgressStatus } from "@/lib/ws";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

const GenerateRoadmap = () => {
  const [searchParams] = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState<ApiRoadmap | null>(null);
  const [selectedMode, setSelectedMode] = useState<LessonMode | null>(
    (searchParams.get("mode") as LessonMode) || null
  );

  const [attachedSources, setAttachedSources] = useState<any[]>([]);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [activeInputType, setActiveInputType] = useState<'FILE' | 'URL' | 'TEXT' | null>(null);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Location state is handled in the mount effect below to avoid state race conditions.
  const { setActiveRoadmap, saveRoadmap, savedRoadmaps } = useRoadmapStore();
  const { setCreditBalance } = useAuthStore();
  const { toast } = useToast();
  const t = useI18n((s) => s.t);

  const genModes: { value: LessonMode | null; label: string; icon: React.ReactNode }[] = [
    { value: null, label: t("mode.auto"), icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "MATH", label: t("mode.math"), icon: <FunctionSquare className="w-3.5 h-3.5" /> },
    { value: "LANGUAGE", label: t("mode.language"), icon: <Languages className="w-3.5 h-3.5" /> },
    { value: "CODE", label: t("mode.code"), icon: <Code2 className="w-3.5 h-3.5" /> },
  ];
  const wsRef = useRef<WSHandle | null>(null);
  const activeRoadmapIdRef = useRef<number | null>(null);
  const [generationStatus, setGenerationStatus] = useState<RoadmapProgressStatus | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{ generated: number; total: number } | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  // Stable refs so the WS callback never goes stale and never causes re-creation
  const stableRefs = useRef({ setActiveRoadmap, saveRoadmap, setCreditBalance, toast, topic });
  useEffect(() => {
    stableRefs.current = { setActiveRoadmap, saveRoadmap, setCreditBalance, toast, topic };
  });

  // Cleanup WS + polling on unmount only – empty deps so React never tears it down mid-generation
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    if (isExpanded) {
      el.style.height = "320px";
      el.style.overflowY = "auto";
      return;
    }

    // Auto resize text area
    el.style.height = "auto";
    const currentScrollHeight = el.scrollHeight;

    if (currentScrollHeight > 120) {
      el.style.height = "120px";
      el.style.overflowY = "auto";
    } else {
      el.style.height = `${currentScrollHeight}px`;
      el.style.overflowY = "hidden";
    }
  }, [topic, isExpanded]);


  const startProgressWS = useCallback((roadmapId: number) => {
    wsRef.current?.close();


    wsRef.current = connectRoadmapProgress(roadmapId, {
      onProgress: (p) => {
        setGenerationStatus(p.status);
        const generated = p.generated_count ?? 0;
        const total = p.total_count ?? 0;
        setGenerationProgress({ generated, total });

        const refs = stableRefs.current;

        // Update credit balance from WS
        if (p.remaining_credits != null) {
          refs.setCreditBalance(p.remaining_credits);
          if (p.remaining_credits <= 5 && p.remaining_credits > 0) {
            refs.toast({
              title: "Low on credits!",
              description: "You're running low. Top up soon to continue learning.",
            });
          }
        }

        if (p.status === "failed") {
          refs.toast({
            title: "Generation Failed",
            description: "An error occurred during roadmap generation.",
            variant: "destructive",
          });
          wsRef.current?.close();
          setGenerating(false);
          setGenerationStatus(null);
          setGenerationProgress(null);
          return;
        }

        const rid = p.id ?? activeRoadmapIdRef.current;

        // Function to perform a final clean sync with the database
        const syncRoadmap = async (id: number) => {
          try {
            const fresh = await roadmapApi.getDetails(id);
            // Apply fresh data only if it doesn't represent a "rollback" (fewer lessons than current state)
            setRoadmap(prev => {
              if (prev && fresh.lessons.length < prev.lessons.length) {
                console.warn("[Sync] API returned fewer lessons than currently displayed, ignoring to prevent rollback.");
                return prev;
              }
              return fresh;
            });
            refs.setActiveRoadmap(fresh);
            refs.saveRoadmap(fresh);

            // COMPLETION: Close WS and stop spinner ONLY after data is confirmed
            wsRef.current?.close();
            setGenerating(false);
            setGenerationStatus(null);
            setGenerationProgress(null);
          } catch (err) {
            console.error("Failed to sync roadmap:", err);
            // Fallback: stop spinner so UI isn't stuck
            setGenerating(false);
          }
        };

        // Directly update UI from WS payload if lessons are present
        if (p.lessons && Array.isArray(p.lessons) && p.lessons.length > 0) {
          if (rid) {
            const fresh: ApiRoadmap = {
              ...(p as unknown as ApiRoadmap),
              id: rid,
              topic: p.topic || stableRefs.current.topic || "",
              lessons: p.lessons as ApiRoadmap["lessons"],
              status: p.status === "ready" ? "ready" : p.status === "is_partial" ? "is_partial" : "generating",
              total_estimated_hours: (p as any).total_estimated_hours ?? 0,
              difficulty: (p as any).difficulty ?? "",
              total_lessons_count: p.total_count ?? p.total_lessons_count ?? p.lessons.length,
              generated_lessons_count: p.generated_count ?? p.generated_lessons_count ?? p.lessons.length,
            };
            setRoadmap(fresh);
            refs.setActiveRoadmap(fresh);
            refs.saveRoadmap(fresh);
          }
        }

        // If generation finished, trigger the final sync
        if (p.status === "ready" || p.status === "is_partial") {
          if (rid) {
            syncRoadmap(rid);
          } else {
            // Fallback if no ID available (unlikely)
            setGenerating(false);
          }
        }
      },
      onError: () => {
        // Don't kill the generation state immediately on mobile.
        // The new WS handle will try to reconnect automatically behind the scenes.
        console.warn("WebSocket connection interrupted. Attempting to reconnect...");

        // Only show a toast if we haven't received data in a while
        // (Optional: add a timeout check here if needed)
      },
    });
  }, []);

  useEffect(() => {
    const t = searchParams.get("topic");
    const idParam = searchParams.get("id");

    let initialSources: any[] = [];
    if (location.state && location.state.attachedSources) {
      initialSources = location.state.attachedSources;
      setAttachedSources(location.state.attachedSources);
      window.history.replaceState({}, document.title);
    }

    if (idParam && idParam !== "undefined" && idParam !== "null") {
      // Load roadmap by ID from API to get fresh counts
      const id = Number(idParam);
      if (id && !isNaN(id) && id > 0) {
        setTopic(t || "");
        roadmapApi.getDetails(id).then((fresh) => {
          setRoadmap(fresh);
          setActiveRoadmap(fresh);
          saveRoadmap(fresh);
          if (t) setTopic(fresh.topic);
        }).catch(() => {
          // Fallback to saved
          const existing = savedRoadmaps.find((r) => r.id === id);
          if (existing) {
            setRoadmap(existing);
            setActiveRoadmap(existing);
            if (t) setTopic(t);
          }
        });
        return;
      }
    }
    if (t) {
      setTopic(t);
      const existing = savedRoadmaps.find(
        (r) => r.topic.toLowerCase() === t.toLowerCase()
      );
      if (existing) {
        // Re-fetch from API to get fresh lesson counts
        roadmapApi.getDetails(existing.id).then((fresh) => {
          setRoadmap(fresh);
          setActiveRoadmap(fresh);
          saveRoadmap(fresh);
        }).catch(() => {
          setRoadmap(existing);
          setActiveRoadmap(existing);
        });
        return;
      }
      // Only auto-generate if explicitly requested via location state or query param
      const isAutoStart = searchParams.get("autostart") === "true" || (location.state as any)?.autoGenerate === true;
      if (!roadmap && isAutoStart) {
        doGenerate(t, initialSources);
      }
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file count constraint (max 1 file)
    const fileCount = attachedSources.filter(s => s.source_type === 'FILE').length;
    if (fileCount >= 1) {
      toast({
        title: "Limit exceeded",
        description: "Siz faqat bitta fayl biriktirishingiz mumkin.",
        variant: "destructive",
      });
      return;
    }

    // Check file size constraint (warning for 30MB)
    if (file.size > 30 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Fayl hajmi juda katta. Fayl hajmi 30MB dan oshmasligi tavsiya etiladi.",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are supported currently.",
        variant: "destructive",
      });
      return;
    }
    setUploadingSource(true);
    try {
      const newSrc = await roadmapApi.uploadSource('FILE', { file });
      setAttachedSources(prev => [...prev, newSrc]);
      toast({ title: "Source uploaded", description: `${file.name} has been attached.` });
      setActiveInputType(null);
    } catch (err) {
      toast({ title: "Upload failed", description: "Failed to upload source file.", variant: "destructive" });
    } finally {
      setUploadingSource(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    // Check URL count constraint (max 4 links)
    const urlCount = attachedSources.filter(s => s.source_type === 'URL').length;
    if (urlCount >= 4) {
      toast({
        title: "Limit exceeded",
        description: "Maksimal 4 ta havola biriktirish mumkin.",
        variant: "destructive",
      });
      return;
    }

    setUploadingSource(true);
    try {
      const newSrc = await roadmapApi.uploadSource('URL', { url: urlInput.trim() });
      setAttachedSources(prev => [...prev, newSrc]);
      setUrlInput("");
      setActiveInputType(null);
      toast({ title: "Source added", description: "Website parsed successfully." });
    } catch (err) {
      toast({ title: "Failed to parse", description: "Could not retrieve web contents.", variant: "destructive" });
    } finally {
      setUploadingSource(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    // Check character limit constraint (max 5000 characters)
    if (textInput.trim().length > 5000) {
      toast({
        title: "Limit exceeded",
        description: "Matn uzunligi 5000 belgidan oshmasligi kerak.",
        variant: "destructive",
      });
      return;
    }

    setUploadingSource(true);
    try {
      const newSrc = await roadmapApi.uploadSource('TEXT', { text_content: textInput.trim() });
      setAttachedSources(prev => [...prev, newSrc]);
      setTextInput("");
      setActiveInputType(null);
      toast({ title: "Source added", description: "Text notes added." });
    } catch (err) {
      toast({ title: "Failed to add", description: "Could not add text source.", variant: "destructive" });
    } finally {
      setUploadingSource(false);
    }
  };

  const removeAttachment = (id: number) => {
    setAttachedSources(prev => prev.filter(x => x.id !== id));
  };

  const doGenerate = async (t: string, overrideSources?: any[]) => {
    setGenerating(true);
    setRoadmap(null);

    try {
      const sourcesToUse = overrideSources !== undefined ? overrideSources : attachedSources;
      const sourceIds = sourcesToUse.map(s => s.id);
      const res = await roadmapApi.generate(t, selectedMode || undefined, sourceIds);
      setCreditError(null);
      const id = res.roadmap_id || res.id;
      activeRoadmapIdRef.current = id;
      
      // Clear attachments upon successful generate trigger
      setAttachedSources([]);

      // If the response already contains the full roadmap, display it immediately
      if (res.lessons && Array.isArray(res.lessons) && res.lessons.length > 0) {
        const fresh = res as unknown as ApiRoadmap;
        setRoadmap(fresh);
        setActiveRoadmap(fresh);
        saveRoadmap(fresh);
      }

      // Connect WebSocket for real-time progress updates
      startProgressWS(id);
    } catch (err) {
      handleApiError(err, {
        toast,
        navigate,
        onCreditsError: (msg) => setCreditError(msg),
      });
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (!topic.trim() && attachedSources.length === 0) return;
    doGenerate(topic.trim());
  };

  const handleReplan = () => {
    if (!topic.trim() && attachedSources.length === 0) return;
    setRoadmap(null);
    doGenerate(topic.trim());
  };

  const handleContinueGenerating = async () => {
    if (!roadmap) return;
    setGenerating(true);
    try {
      const res = await roadmapApi.continueGenerating(roadmap.id);
      setCreditError(null);
      const id = res.roadmap_id || res.id || roadmap.id;
      activeRoadmapIdRef.current = id;

      // If response contains updated roadmap data, apply immediately
      if (res.lessons && Array.isArray(res.lessons) && res.lessons.length > 0) {
        const fresh = res as unknown as ApiRoadmap;
        setRoadmap(fresh);
        setActiveRoadmap(fresh);
        saveRoadmap(fresh);
      }

      // Connect WS for progress on the continuation batch
      startProgressWS(id);
    } catch (err) {
      handleApiError(err, {
        toast,
        navigate,
        onCreditsError: (msg) => setCreditError(msg),
      });
      setGenerating(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-center md:justify-start gap-3 mb-6 md:mb-8">
        <span className="font-display font-semibold">Iqro AI</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Credit alert */}
        {creditError && (
          <div className="mb-6">
            <CreditAlert message={creditError} onDismiss={() => setCreditError(null)} />
          </div>
        )}

        {!roadmap && !generating && (
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-display font-bold mb-2">
              <span className="gradient-text">{t("genRoadmap.title")}</span> {t("genRoadmap.yourRoadmap")}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-6">
              {t("genRoadmap.desc")}
            </p>
            <div className="chat-input-glow">
              <div className="relative rounded-2xl bg-card flex flex-col z-10">
                {/* Attached sources pills */}
                {attachedSources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1 border-b border-border/40">
                    {attachedSources.map((src) => (
                      <div
                        key={src.id}
                        className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-[11px] font-medium border border-border/60 group"
                      >
                        {src.source_type === 'FILE' ? (
                          <FileText className="w-3 h-3 text-orange-500" />
                        ) : src.source_type === 'URL' ? (
                          <Globe className="w-3 h-3 text-blue-500" />
                        ) : (
                          <Link className="w-3 h-3 text-green-500" />
                        )}
                        <span className="truncate max-w-[150px]">
                          {src.source_type === 'FILE' ? src.file_name : src.source_type === 'URL' ? src.url : "Notes"}
                        </span>
                        <button
                          onClick={() => removeAttachment(src.id)}
                          className="text-muted-foreground/60 hover:text-foreground rounded-full transition-colors"
                          title="Remove source"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Textarea
                  ref={inputRef}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") {
                      e.stopPropagation();
                      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                        e.nativeEvent.stopImmediatePropagation();
                      }
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder={t("genRoadmap.placeholder")}
                  rows={1}
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground min-h-[40px] resize-none outline-none px-4 pt-4 pb-1 text-sm break-words whitespace-pre-wrap py-2"
                />
                <div className="flex items-center gap-2 px-3 pb-3 pt-1">
                  <div className="relative">
                    <button
                      onClick={() => setShowSourceMenu(!showSourceMenu)}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${showSourceMenu ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                      title="Attach learning source (PDF, Web, Text)"
                    >
                      <Plus className={`w-3.5 h-3.5 transition-transform ${showSourceMenu ? "rotate-45" : ""}`} />
                    </button>
                    {showSourceMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-xl shadow-lg py-1.5 min-w-[180px] z-[9999]">
                        <label className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 cursor-pointer transition-colors">
                          <FileText className="w-3.5 h-3.5 text-orange-500" />
                          Upload PDF
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploadingSource}
                          />
                        </label>
                        <button
                          onClick={() => {
                            setActiveInputType('URL');
                            setShowSourceMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                          Add Website Link
                        </button>
                        <button
                          onClick={() => {
                            setActiveInputType('TEXT');
                            setShowSourceMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <Link className="w-3.5 h-3.5 text-green-500" />
                          Add Text Notes
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => {
                        const el = document.getElementById("gen-mode-dropdown");
                        el?.classList.toggle("hidden");
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                    >
                      {genModes.find((m) => m.value === selectedMode)?.icon}
                      {genModes.find((m) => m.value === selectedMode)?.label}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <div id="gen-mode-dropdown" className="hidden absolute bottom-full left-0 mb-1.5 bg-popover border border-border rounded-xl shadow-lg py-1.5 min-w-[160px] z-[9999]">
                      {genModes.map((mode) => (
                        <button
                          key={mode.label}
                          onClick={() => {
                            setSelectedMode(mode.value);
                            document.getElementById("gen-mode-dropdown")?.classList.add("hidden");
                          }}
                          className={`flex items-center gap-2 w-full px-3 py-2 text-xs font-medium transition-colors ${selectedMode === mode.value ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted/50"}`}
                        >
                          {mode.icon}{mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1" />

                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground/70 hover:bg-muted/30 transition-colors"
                    title={isExpanded ? "Collapse input" : "Expand input"}
                  >
                    {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => toast({ title: "Coming soon", description: "Voice input is under development." })}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground/50 hover:bg-muted/30 transition-colors cursor-default"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Voice
                  </button>

                  <Button size="icon" onClick={handleGenerate} disabled={generating || (!topic.trim() && attachedSources.length === 0)} className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Inline dialogs for inputs */}
            {activeInputType === 'URL' && (
              <div className="mt-3 p-3 bg-card border border-border/85 rounded-2xl flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Add Website Source</span>
                  <button onClick={() => setActiveInputType(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-primary transition-colors"
                  />
                  <Button size="sm" onClick={handleUrlSubmit} disabled={uploadingSource} className="h-8 text-xs px-4">
                    {uploadingSource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Attach"}
                  </Button>
                </div>
              </div>
            )}

            {activeInputType === 'TEXT' && (
              <div className="mt-3 p-3 bg-card border border-border/85 rounded-2xl flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Add Notes/Text Source</span>
                  <button onClick={() => setActiveInputType(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  placeholder="Paste your notes or curriculum syllabus here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={4}
                  className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:border-primary resize-none transition-colors"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={handleTextSubmit} disabled={uploadingSource} className="h-8 text-xs px-4">
                    {uploadingSource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Attach Notes"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial loading state — skeleton cards */}
        <AnimatePresence>
          {generating && !roadmap && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {generationStatus === "analyzing" ? t("genRoadmap.analyzing")
                    : generationStatus === "planning" ? t("genRoadmap.planning")
                      : generationStatus === "saving" ? t("genRoadmap.saving")
                        : t("genRoadmap.creating")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {generationStatus === "analyzing" ? t("genRoadmap.analyzingHint")
                    : generationStatus === "planning" ? t("genRoadmap.planningHint")
                      : generationStatus === "saving" ? t("genRoadmap.savingHint")
                        : t("genRoadmap.creatingHint")}
                </p>
              </div>
              {/* Progress bar */}
              {generationProgress && generationProgress.total > 0 && (
                <div className="px-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">
                      {generationProgress.generated} / {generationProgress.total} {t("genRoadmap.lessons")}
                    </span>
                    <span className="text-xs font-medium">
                      {Math.round((generationProgress.generated / generationProgress.total) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(generationProgress.generated / generationProgress.total) * 100}
                    className="h-2 bg-secondary"
                  />
                </div>
              )}
              <div className="space-y-2">
                <LessonCardSkeleton count={5} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show roadmap once we have data */}
        <AnimatePresence>
          {roadmap && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <RoadmapView
                roadmap={roadmap}
                onStartLearning={(lessonId) =>
                  navigate(`/learn/${roadmap.id}/${lessonId}`)
                }
                onReplan={handleReplan}
                onContinueGenerating={handleContinueGenerating}
                isGenerating={generating}
                generationStatus={generationStatus}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default GenerateRoadmap;
