import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Sparkles, Search, BookOpen, Zap, ClipboardCheck, Plus, Mic, ChevronDown, Code2, Languages, FunctionSquare, FileText, Link, Globe, Check, Loader2, X } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { roadmapApi, type LessonMode } from "@/lib/api";

const suggestions = [
  "Linear Algebra for AI",
  "React & Next.js Mastery",
  "Machine Learning Fundamentals",
  "Data Structures & Algorithms",
  "Python for Data Science",
  "System Design Interviews",
];

const Dashboard = () => {
  const [topic, setTopic] = useState("");
  const [selectedMode, setSelectedMode] = useState<LessonMode | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fetchProfile } = useAuthStore();
  const t = useI18n((s) => s.t);
  const { toast } = useToast();

  const [attachedSources, setAttachedSources] = useState<any[]>([]);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [activeInputType, setActiveInputType] = useState<'FILE' | 'URL' | 'TEXT' | null>(null);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");

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

  const handleGenerate = () => {
    if (topic.trim() || attachedSources.length > 0) {
      const params = new URLSearchParams();
      if (topic.trim()) params.set("topic", topic.trim());
      if (selectedMode) params.set("mode", selectedMode);
      navigate(`/generate?${params.toString()}`, {
        state: {
          attachedSources,
          autoGenerate: true
        }
      });
    }
  };

  const dashModes: { value: LessonMode | null; label: string; icon: React.ReactNode }[] = [
    { value: null, label: t("mode.auto"), icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "MATH", label: t("mode.math"), icon: <FunctionSquare className="w-3.5 h-3.5" /> },
    { value: "LANGUAGE", label: t("mode.language"), icon: <Languages className="w-3.5 h-3.5" /> },
    { value: "CODE", label: t("mode.code"), icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  useEffect(() => {
    if (searchParams.get("session_id")) {
      fetchProfile();
    }
  }, []);

  const features = [
    { icon: BookOpen, title: t("feature.smartRoadmaps"), description: t("feature.smartRoadmapsDesc") },
    { icon: Zap, title: t("feature.interactiveLessons"), description: t("feature.interactiveLessonsDesc") },
    { icon: ClipboardCheck, title: t("feature.adaptiveTesting"), description: t("feature.adaptiveTestingDesc") },
  ];

  return (
    <div className="page-container flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto w-full"
      >
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-6 md:mb-8">
          <Brain className="w-7 h-7 md:w-8 md:h-8 text-primary" />
        </div>

        <h1 className="text-3xl md:text-6xl font-display font-bold leading-tight mb-3 md:mb-4">
          {t("dashboard.learnWith")}{" "}<span className="gradient-text">{t("dashboard.aiPrecision")}</span>
        </h1>

        <p className="text-muted-foreground text-sm md:text-lg mb-8 md:mb-10 max-w-xl mx-auto">
          {t("dashboard.desc")}
        </p>

        <div className="chat-input-glow max-w-xl mx-auto mb-4 md:mb-6">
          <div className="relative rounded-2xl bg-card flex flex-col z-10">
            {/* Attached sources pills */}
            {attachedSources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1 border-b border-border/40 text-left">
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

            <div className="flex items-start gap-2 px-4 pt-4 pb-1">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 mt-2.5" />
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                placeholder={t("dashboard.whatToLearn")}
                rows={3}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground min-h-[80px] max-h-[120px] resize-none outline-none text-sm"
              />
            </div>
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
                  <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-xl shadow-lg py-1.5 min-w-[180px] z-[9999] text-left">
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
                    const el = document.getElementById("dash-mode-dropdown");
                    el?.classList.toggle("hidden");
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  {dashModes.find((m) => m.value === selectedMode)?.icon}
                  {dashModes.find((m) => m.value === selectedMode)?.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div id="dash-mode-dropdown" className="hidden absolute bottom-full left-0 mb-1.5 bg-popover border border-border rounded-xl shadow-lg py-1.5 min-w-[160px] z-[9999] text-left">
                  {dashModes.map((mode) => (
                    <button
                      key={mode.label}
                      onClick={() => {
                        setSelectedMode(mode.value);
                        document.getElementById("dash-mode-dropdown")?.classList.add("hidden");
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
                onClick={() => toast({ title: "Coming soon", description: "Voice input is under development." })}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground/50 hover:bg-muted/30 transition-colors cursor-default"
              >
                <Mic className="w-3.5 h-3.5" />
                Voice
              </button>

              <Button size="icon" onClick={handleGenerate} disabled={!topic.trim() && attachedSources.length === 0} className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Inline dialogs for inputs on Dashboard */}
        {activeInputType === 'URL' && (
          <div className="max-w-xl mx-auto mt-2 mb-4 p-3 bg-card border border-border/85 rounded-2xl flex flex-col gap-2 shadow-sm text-left">
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
          <div className="max-w-xl mx-auto mt-2 mb-4 p-3 bg-card border border-border/85 rounded-2xl flex flex-col gap-2 shadow-sm text-left">
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

        <div className="flex flex-wrap justify-center gap-2 mb-10 md:mb-16 max-w-2xl mx-auto">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setTopic(s);
                const params = new URLSearchParams({ topic: s });
                if (selectedMode) params.set("mode", selectedMode);
                navigate(`/generate?${params.toString()}`);
              }}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-border text-xs md:text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card p-4 md:p-6 text-left hover:border-primary/30 transition-colors"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 md:mb-4">
                <feature.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-sm md:text-base mb-0.5 md:mb-1">{feature.title}</h3>
              <p className="text-xs md:text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
