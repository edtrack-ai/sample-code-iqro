import { useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Search, Sparkles, Send, Check, ChevronRight,
  BookOpen, MessageCircle, BarChart3, Brain, Code, Calculator, Languages,
  FileText, Link as LinkIcon, AlignLeft,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

/* ── Device Frame ── */
const DeviceFrame = ({ isMobile, children }: { isMobile: boolean; children: React.ReactNode }) => (
  <div className={`rounded-xl border border-border/60 bg-card overflow-hidden shadow-lg ${isMobile ? "w-[220px] h-[380px]" : "w-full max-w-[380px] h-[260px]"}`}>
    {/* Top bar */}
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/40">
      <div className="w-2 h-2 rounded-full bg-destructive/60" />
      <div className="w-2 h-2 rounded-full bg-warning/60" />
      <div className="w-2 h-2 rounded-full bg-success/60" />
      {!isMobile && <div className="ml-2 flex-1 h-4 rounded bg-muted/60 max-w-[120px]" />}
    </div>
    <div className="p-3 h-[calc(100%-28px)] overflow-hidden">{children}</div>
  </div>
);

/* ── useTypingText ── */
function useTypingText(text: string, speed = 80, trigger = false) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!trigger) { setDisplayed(""); return; }
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [trigger, text, speed]);
  return displayed;
}

/* ── Step 1: Generate Roadmap ── */
const SearchMockup = ({ isMobile }: { isMobile: boolean }) => {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const typed = useTypingText("Machine Learning", 80, inView);
  const [activeSource, setActiveSource] = useState<"topic" | "pdf" | "link" | "text">("topic");
  const [showModes, setShowModes] = useState(false);
  const [selectedMode, setSelectedMode] = useState(-1);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t0 = setTimeout(() => setActiveSource("pdf"), 1400);
    const t1 = setTimeout(() => setActiveSource("link"), 2600);
    const t2 = setTimeout(() => setActiveSource("topic"), 3800);
    const t3 = setTimeout(() => setShowModes(true), 4200);
    const t4 = setTimeout(() => setSelectedMode(0), 4600);
    const t5 = setTimeout(() => setShowButton(true), 5000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [inView]);

  const sources = [
    { id: "topic", label: t("mockup.sourceTopic") || "Mavzu", icon: Sparkles },
    { id: "pdf", label: t("mockup.sourcePdf") || "PDF Hujjat", icon: FileText },
    { id: "link", label: t("mockup.sourceLink") || "Veb-link", icon: LinkIcon },
    { id: "text", label: t("mockup.sourceText") || "Matn", icon: AlignLeft },
  ];

  const modes = [
    { icon: Sparkles, label: "Auto" },
    { icon: Calculator, label: "Math" },
    { icon: Languages, label: "Lang" },
    { icon: Code, label: "Code" },
  ];

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {/* Source selector tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/40">
        {sources.map((s) => {
          const isActive = activeSource === s.id;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSource(s.id as any)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-[#3a6651]/15 text-[#3a6651] dark:text-[#528d71] border border-[#3a6651]/30"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              <Icon className="w-2.5 h-2.5" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input container based on active source */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 min-h-[36px]">
        {activeSource === "topic" && (
          <>
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground truncate">{typed}</span>
            {typed.length < 16 && <span className="w-[2px] h-3.5 bg-primary animate-pulse shrink-0" />}
          </>
        )}
        {activeSource === "pdf" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 w-full">
            <FileText className="w-3.5 h-3.5 text-[#3a6651] shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">deep_learning_guide.pdf</span>
            <span className="ml-auto text-[8px] bg-[#3a6651]/15 text-[#3a6651] px-1.5 py-0.5 rounded font-bold shrink-0">PDF</span>
          </motion.div>
        )}
        {activeSource === "link" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 w-full">
            <LinkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">https://wikipedia.org/wiki/AI</span>
            <span className="ml-auto text-[8px] bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold shrink-0">LINK</span>
          </motion.div>
        )}
        {activeSource === "text" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 w-full">
            <AlignLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-medium text-foreground truncate">Neyron tarmoqlari matni...</span>
            <span className="ml-auto text-[8px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold shrink-0">MATN</span>
          </motion.div>
        )}
      </div>

      {showModes && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1 mt-0.5">
          {modes.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border cursor-default transition-colors ${
                selectedMode === i
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              <m.icon className="w-2.5 h-2.5" />
              {m.label}
            </motion.div>
          ))}
        </motion.div>
      )}

      {showButton && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1"
        >
          <div className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold text-center animate-pulse-glow">
            {t("mockup.generateBtn") || "Generate Roadmap →"}
          </div>
        </motion.div>
      )}
    </div>
  );
};

/* ── Step 2: Study Lessons ── */
const LessonMockup = ({ isMobile }: { isMobile: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [lines, setLines] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setLines(i);
      if (i >= 6) clearInterval(id);
    }, 400);
    return () => clearInterval(id);
  }, [inView]);

  const content = [
    { w: "w-full", text: "Introduction to Neural Networks" },
    { w: "w-11/12", text: "Neural networks are computing systems..." },
    { w: "w-10/12", text: "inspired by biological neural networks." },
    { w: "w-full", text: "" },
    { w: "w-9/12", text: "Key Components:" },
    { w: "w-11/12", text: "• Neurons  • Weights  • Activation" },
  ];

  return (
    <div ref={ref} className={`flex gap-2 h-full ${isMobile ? "flex-col" : ""}`}>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          <BookOpen className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Lesson 1</span>
        </div>
        {content.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={i < lines ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.3 }}
            className={`${line.w} h-3 rounded-sm ${line.text ? "" : "h-1"}`}
          >
            {line.text && <span className="text-[8px] text-muted-foreground leading-none">{line.text}</span>}
          </motion.div>
        ))}
        {lines >= 6 && <span className="w-[2px] h-3 bg-primary animate-pulse inline-block" />}
      </div>
      {!isMobile && (
        <div className="w-[90px] border-l border-border/40 pl-2 flex flex-col gap-1.5">
          <div className="flex gap-1">
            <div className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Chat</div>
            <div className="text-[8px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">Quiz</div>
          </div>
          <div className="flex-1 flex flex-col gap-1 mt-1">
            <div className="rounded bg-muted/40 p-1">
              <div className="text-[7px] text-muted-foreground">AI is ready to help...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Step 3: Quiz ── */
const QuizMockup = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [selected, setSelected] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setSelected(1), 1200);
    const t2 = setTimeout(() => setProgress(60), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [inView]);

  const options = ["Sigmoid only", "Backpropagation", "Random guessing", "Manual tuning"];

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold text-foreground">How do neural networks learn?</div>
      <div className="flex flex-col gap-1.5">
        {options.map((opt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 + i * 0.15 }}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[9px] transition-all duration-300 ${
              selected === i
                ? "border-success/60 bg-success/10 text-success"
                : "border-border/60 text-muted-foreground"
            }`}
          >
            <div className={`w-3 h-3 rounded-full border flex items-center justify-center shrink-0 ${
              selected === i ? "border-success bg-success" : "border-border"
            }`}>
              {selected === i && <Check className="w-2 h-2 text-success-foreground" />}
            </div>
            {opt}
          </motion.div>
        ))}
      </div>
      <div className="mt-1">
        <div className="flex justify-between text-[8px] text-muted-foreground mb-0.5">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "30%" }}
            animate={{ width: `${progress || 30}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
};

/* ── Step 4: AI Chat ── */
const ChatMockup = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [showUser, setShowUser] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const aiText = useTypingText("Backpropagation adjusts weights by calculating the gradient of the loss function. It uses the chain rule to propagate errors backward.", 30, showAI);

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setShowUser(true), 600);
    const t2 = setTimeout(() => setShowAI(true), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [inView]);

  return (
    <div ref={ref} className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-1.5 mb-1">
        <Brain className="w-3 h-3 text-primary" />
        <span className="text-[10px] font-semibold text-foreground">AI Assistant</span>
      </div>
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        {showUser && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-end max-w-[80%] px-2.5 py-1.5 rounded-xl rounded-br-sm bg-primary text-primary-foreground text-[9px]"
          >
            Explain backpropagation simply
          </motion.div>
        )}
        {showAI && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="self-start max-w-[85%] px-2.5 py-1.5 rounded-xl rounded-bl-sm bg-muted/60 text-[9px] text-foreground"
          >
            <div className="flex items-start gap-1">
              <Sparkles className="w-2.5 h-2.5 text-primary mt-0.5 shrink-0" />
              <span>{aiText}{aiText.length < 130 && <span className="w-[2px] h-2.5 bg-primary animate-pulse inline-block ml-0.5" />}</span>
            </div>
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-1.5 border border-border/60 rounded-lg px-2 py-1.5">
        <MessageCircle className="w-3 h-3 text-muted-foreground" />
        <span className="text-[8px] text-muted-foreground flex-1">Ask anything...</span>
        <Send className="w-3 h-3 text-primary" />
      </div>
    </div>
  );
};

/* ── Step 5: Track Progress ── */
const ProgressMockup = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [checks, setChecks] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => { setChecks(1); setProgress(25); }, 600);
    const t2 = setTimeout(() => { setChecks(2); setProgress(50); }, 1200);
    const t3 = setTimeout(() => { setChecks(3); setProgress(75); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [inView]);

  const lessons = [
    "Intro to ML",
    "Linear Regression",
    "Neural Networks",
    "Deep Learning",
  ];

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-foreground">Week 1</span>
        </div>
        <span className="text-[9px] text-primary font-medium">{progress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <div className="flex flex-col gap-1 mt-1">
        {lessons.map((lesson, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.15 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/40 bg-card/60"
          >
            <motion.div
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors duration-300 ${
                i < checks ? "bg-success border-success" : "border-border"
              }`}
              animate={i < checks ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {i < checks && <Check className="w-2 h-2 text-success-foreground" />}
            </motion.div>
            <span className={`text-[9px] ${i < checks ? "text-foreground line-through opacity-60" : "text-muted-foreground"}`}>
              {lesson}
            </span>
            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 ml-auto" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ── Main StepMockup ── */
const mockups = [SearchMockup, LessonMockup, QuizMockup, ChatMockup, ProgressMockup];

export const StepMockup = ({ step, isMobile }: { step: number; isMobile: boolean }) => {
  const Mockup = mockups[step];
  if (!Mockup) return null;
  return (
    <DeviceFrame isMobile={isMobile}>
      <Mockup isMobile={isMobile} />
    </DeviceFrame>
  );
};
