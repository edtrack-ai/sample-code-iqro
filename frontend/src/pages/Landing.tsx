import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Brain, Sparkles, BookOpen, Zap, ClipboardCheck, ArrowRight,
  GraduationCap, BarChart3, ChevronDown, Map, MonitorPlay, TrendingUp,
  Users, Layers, FileText, Heart, MessageCircle, Sun, Moon, Check, X, Store, Search, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n, type Lang } from "@/lib/i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { StepMockup } from "@/components/landing/StepMockup";
import { useThemeStore } from "@/lib/themeStore";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { marketplaceApi, paymentsApi, Course, Tier } from "@/lib/api";

import BlackLogo from "@/assets/black-logo.svg";
import WhiteLogo from "@/assets/white-logo.svg";

/* ── Animated counter hook ── */
function useCounter(end: number, duration = 2000, startOnView = false, ref?: React.RefObject<HTMLElement | null>) {
  const [count, setCount] = useState(0);
  const inView = useInView(ref!, { once: true });
  const started = startOnView ? inView : true;

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [started, end, duration]);

  return count;
}

/* ── Stagger container ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const topicTags = [
  "Machine Learning", "React", "Python", "Calculus", "Spanish",
  "Neural Networks", "Data Science", "TypeScript", "Linear Algebra",
  "French", "Quantum Physics", "Rust", "Statistics", "Japanese",
  "Web Development", "Organic Chemistry", "Go", "Music Theory",
  "Philosophy", "Economics", "Docker", "Kubernetes",
];

const Landing = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const isMobile = useIsMobile();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const roadmapSectionRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { toggleTheme, theme } = useThemeStore();

  const [publishedCourses, setPublishedCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseSearch, setCourseSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    marketplaceApi.listCourses()
      .then((data) => {
        if (isMounted) {
          setPublishedCourses(data || []);
          setLoadingCourses(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPublishedCourses([]);
          setLoadingCourses(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  const [fetchedTiers, setFetchedTiers] = useState<Tier[]>([]);
  const [tiersLoaded, setTiersLoaded] = useState(false);
  const [tiersError, setTiersError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    paymentsApi.getTiers()
      .then((data) => {
        if (isMounted) {
          setFetchedTiers(data || []);
          setTiersLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTiersError(true);
          setTiersLoaded(true);
        }
      });
    return () => { isMounted = false; };
  }, []);

  const filteredLandingCourses = publishedCourses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.roadmap_topic.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const { scrollY } = useScroll();
  const { scrollYProgress: roadmapProgress } = useScroll({
    target: roadmapSectionRef,
    offset: ["start end", "end start"],
  });

  // Parallax transforms for hero orbs
  const orbY1 = useTransform(scrollY, [0, 600], [0, 80]);
  const orbY2 = useTransform(scrollY, [0, 600], [0, 120]);
  const orbY3 = useTransform(scrollY, [0, 600], [0, 50]);

  const langOptions: { value: Lang; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "ru", label: "Русский", flag: "🇷🇺" },
    { value: "uz", label: "O'zbekcha", flag: "🇺🇿" },
  ];

  const currentLang = langOptions.find((o) => o.value === lang) || langOptions[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    { icon: BookOpen, title: t("feature.smartRoadmaps"), description: t("feature.smartRoadmapsDesc") },
    { icon: Zap, title: t("feature.interactiveLessons"), description: t("feature.interactiveLessonsDesc") },
    { icon: ClipboardCheck, title: t("feature.adaptiveTesting"), description: t("feature.adaptiveTestingDesc") },
    { icon: GraduationCap, title: t("feature.trackProgress"), description: t("feature.trackProgressDesc") },
    { icon: BarChart3, title: t("feature.analytics"), description: t("feature.analyticsDesc") },
    { icon: Sparkles, title: t("feature.aiPowered"), description: t("feature.aiPoweredDesc") },
  ];

  const steps = [
    { icon: Map, title: t("landing.step1Title"), desc: t("landing.step1Desc"), num: "01" },
    { icon: MonitorPlay, title: t("landing.step2Title"), desc: t("landing.step2Desc"), num: "02" },
    { icon: ClipboardCheck, title: t("landing.step3Title"), desc: t("landing.step3Desc"), num: "03" },
    { icon: MessageCircle, title: t("landing.step4Title"), desc: t("landing.step4Desc"), num: "04" },
    { icon: TrendingUp, title: t("landing.step5Title"), desc: t("landing.step5Desc"), num: "05" },
  ];

  const comparisonRows = [
    { old: t("landing.comp1Old"), new: t("landing.comp1New") },
    { old: t("landing.comp2Old"), new: t("landing.comp2New") },
    { old: t("landing.comp3Old"), new: t("landing.comp3New") },
    { old: t("landing.comp4Old"), new: t("landing.comp4New") },
    { old: t("landing.comp5Old"), new: t("landing.comp5New") },
  ];

  const faqItems = [
    { q: t("landing.faqQ1"), a: t("landing.faqA1") },
    { q: t("landing.faqQ2"), a: t("landing.faqA2") },
    { q: t("landing.faqQ3"), a: t("landing.faqA3") },
    { q: t("landing.faqQ4"), a: t("landing.faqA4") },
    { q: t("landing.faqQ5"), a: t("landing.faqA5") },
  ];

  const pathDrawn = useTransform(roadmapProgress, [0.1, 0.8], [0, 1]);

  const stat1 = useCounter(10000, 2000, true, statsRef);
  const stat2 = useCounter(500, 1800, true, statsRef);
  const stat3 = useCounter(50000, 2200, true, statsRef);
  const stat4 = useCounter(98, 1600, true, statsRef);

  const stats = [
    { value: `${stat1.toLocaleString()}+`, label: t("landing.stat1Label"), icon: Users },
    { value: `${stat2}+`, label: t("landing.stat2Label"), icon: Layers },
    { value: `${stat3.toLocaleString()}+`, label: t("landing.stat3Label"), icon: FileText },
    { value: `${stat4}%`, label: t("landing.stat4Label"), icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div className="flex items-center shrink-0">
            <img src={BlackLogo} alt="Iqro AI Logo" className="h-7 sm:h-8 w-auto dark:hidden" />
            <img src={WhiteLogo} alt="Iqro AI Logo" className="h-7 sm:h-8 w-auto hidden dark:block" />
          </div>

          {/* Smooth scroll nav links – desktop only */}
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: t("landing.navHowItWorks"), id: "how-it-works" },
              { label: t("landing.navFeatures"), id: "features" },
              { label: t("landing.navPricing"), id: "pricing" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative w-9 h-9 rounded-lg border border-border/60 hover:bg-muted/60 transition-all flex items-center justify-center"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === "dark" ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Language dropdown */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-border/60 hover:bg-muted/60 transition-all text-sm"
              >
                <span className="text-sm sm:text-base">{currentLang.flag}</span>
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-40 bg-popover/95 backdrop-blur-lg border border-border/60 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    {langOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setLang(opt.value); setLangOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${lang === opt.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"}`}
                      >
                        <span className="text-base">{opt.flag}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/marketplace")} className="hidden sm:inline-flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground font-semibold">
              <Store className="w-4 h-4" />
              Marketplace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth?mode=login")} className="hidden sm:inline-flex">
              {t("landing.logIn")}
            </Button>
            <Button size="sm" onClick={() => navigate("/auth?mode=register")} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm px-3 sm:px-4 h-8 sm:h-9 rounded-lg shadow-md shadow-primary/20">
              {t("landing.getStarted")}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 px-6 overflow-hidden">
        {/* Parallax floating orbs */}
        <motion.div style={{ y: orbY1 }} className="absolute -left-40 top-20 w-80 h-80 rounded-full bg-primary/8 blur-3xl pointer-events-none animate-float" />
        <motion.div style={{ y: orbY2 }} className="absolute -right-40 top-32 w-96 h-96 rounded-full bg-accent/8 blur-3xl pointer-events-none animate-float-reverse" />
        <motion.div style={{ y: orbY3 }} className="absolute left-1/2 -translate-x-1/2 top-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none animate-float" />

        {/* Dot grid background */}
        <div className="absolute inset-0 dot-grid-bg opacity-40 pointer-events-none" />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative text-center max-w-3xl mx-auto"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            {t("landing.aiPowered")}
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            {t("landing.heroTitle1")}{" "}
            {t("landing.heroTitle2") ? <><br className="hidden sm:block" />{t("landing.heroTitle2")}{" "}</> : null}
            <span className="gradient-text">{t("landing.heroTitle3")}</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-muted-foreground text-lg md:text-xl mb-10 max-w-xl mx-auto">
            {t("landing.heroDesc")}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 sm:px-0">
            <Button
              size="lg"
              onClick={() => navigate("/auth?mode=register")}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base shadow-lg shadow-primary/25 animate-pulse-glow"
            >
              {t("landing.startFree")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth?mode=login")} className="w-full sm:w-auto h-12 text-base">
              {t("landing.signIn")}
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Marketplace Showcase Section ── */}
      <section id="marketplace-showcase" className="py-16 sm:py-24 px-6 relative bg-secondary/15 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#3a6651]/30 bg-[#3a6651]/10 text-[#3a6651] dark:text-[#528d71] text-xs font-semibold mb-4">
              <Store className="w-3.5 h-3.5" />
              <span>Iqro Marketplace</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
              {t("landing.marketplace.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {t("landing.marketplace.desc")}
            </p>
          </motion.div>

          {/* Search bar */}
          <div className="max-w-md mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("landing.marketplace.searchPlaceholder")}
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-10 h-11 bg-background/90 backdrop-blur border-border/80 focus-visible:ring-[#3a6651] rounded-xl shadow-sm text-sm"
              />
            </div>
          </div>

          {/* Courses Grid */}
          {loadingCourses ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4 rounded-2xl animate-pulse space-y-3">
                  <div className="h-40 bg-muted/60 rounded-xl" />
                  <div className="h-4 bg-muted/60 rounded w-3/4" />
                  <div className="h-3 bg-muted/60 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredLandingCourses.length === 0 ? (
            <div className="text-center py-12 bg-background/50 border border-dashed border-border/80 rounded-2xl p-6">
              <p className="text-sm text-muted-foreground mb-3">
                {courseSearch ? t("landing.marketplace.noCoursesFound") : t("landing.marketplace.noCoursesYet")}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/marketplace")}>
                {t("landing.marketplace.goToMarketplace")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLandingCourses.slice(0, 6).map((course) => {
                const originalPrice = parseFloat(course.price);
                const discount = course.discount_percent || 0;
                const finalPrice = discount > 0 ? (originalPrice * (100 - discount)) / 100 : originalPrice;

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    onClick={() => navigate("/marketplace")}
                    className="group glass-card rounded-2xl overflow-hidden border border-border/60 hover:border-[#3a6651]/50 hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer bg-card"
                  >
                    {/* Banner Image */}
                    <div className="relative h-44 w-full bg-muted overflow-hidden">
                      {course.banner_url ? (
                        <img
                          src={course.banner_url}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#3a6651]/20 via-primary/10 to-secondary flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-[#3a6651]/60" />
                        </div>
                      )}
                      {/* Price tag */}
                      <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-md border border-border/60 text-foreground px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-sm">
                        {discount > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="line-through text-muted-foreground text-[10px]">${originalPrice.toFixed(2)}</span>
                            <span className="text-[#3a6651] font-bold">${finalPrice.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span>${originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#3a6651] mb-1.5 block">
                          {course.roadmap_topic || "General"}
                        </span>
                        <h3 className="font-display font-bold text-base line-clamp-1 group-hover:text-[#3a6651] transition-colors mb-2">
                          {course.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">
                            {course.creator_full_name || course.creator_username}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[#3a6651] font-semibold">
                          <span>{course.lessons_count || 0} {t("landing.marketplace.lessonsCount")}</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Footer CTA */}
          <div className="mt-12 text-center">
            <Button
              onClick={() => navigate("/marketplace")}
              size="lg"
              className="bg-[#3a6651] hover:bg-[#2e5241] text-white font-bold px-8 h-11 text-sm rounded-xl shadow-lg shadow-[#3a6651]/20 gap-2"
            >
              <Store className="w-4 h-4" />
              <span>{t("landing.marketplace.viewAllBtn")}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works – Roadmap Journey ── */}
      <section id="how-it-works" ref={roadmapSectionRef} className="py-20 sm:py-28 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 sm:mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t("landing.howItWorks")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t("landing.howItWorksDesc")}</p>
          </motion.div>

          <div className="relative">
            {/* SVG road path – desktop only */}
            <svg
              className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 h-full w-24 pointer-events-none animate-road-glow"
              viewBox="0 0 96 1000"
              fill="none"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M48 0 C48 80, 48 80, 48 200 C48 280, 48 280, 48 400 C48 480, 48 480, 48 600 C48 680, 48 680, 48 800 C48 880, 48 880, 48 1000"
                stroke="hsl(var(--primary) / 0.15)"
                strokeWidth="3"
                strokeDasharray="8 6"
                fill="none"
              />
              <motion.path
                d="M48 0 C48 80, 48 80, 48 200 C48 280, 48 280, 48 400 C48 480, 48 480, 48 600 C48 680, 48 680, 48 800 C48 880, 48 880, 48 1000"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                style={{
                  pathLength: pathDrawn,
                }}
              />
            </svg>

            {/* Mobile vertical line */}
            <div className="md:hidden absolute left-8 top-0 bottom-0 w-px">
              <div className="h-full border-l-2 border-dashed border-primary/20" />
              <motion.div
                className="absolute top-0 left-0 w-full bg-primary"
                style={{ height: useTransform(roadmapProgress, [0.1, 0.8], ["0%", "100%"]) }}
              />
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-16 sm:gap-20">
              {steps.map((step, i) => {
                const isEven = i % 2 === 0;
                return (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: isEven ? -40 : 40, y: 20 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    className={`relative flex items-start gap-6 md:gap-0 ${
                      "pl-16 md:pl-0"
                    }`}
                  >
                    {/* Mobile dot on the line */}
                    <motion.div
                      className="md:hidden absolute left-6 top-3 w-5 h-5 rounded-full bg-primary shadow-md shadow-primary/30 border-2 border-background z-10"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                    />

                    {/* Desktop zigzag layout */}
                    <div className={`hidden md:flex items-center w-full ${isEven ? "flex-row" : "flex-row-reverse"}`}>
                      {/* Card side */}
                      <div className={`w-[calc(50%-3rem)] ${isEven ? "text-right pr-4" : "text-left pl-4"}`}>
                        <div className={`inline-block ${isEven ? "ml-auto" : "mr-auto"}`}>
                          <div className="glass-card p-6 max-w-sm hover:border-primary/30 transition-all duration-300 group">
                            <div className={`flex items-center gap-3 mb-3 ${isEven ? "justify-end flex-row-reverse" : ""}`}>
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 gradient-border">
                                <step.icon className="w-6 h-6 text-primary" />
                              </div>
                              <div className={isEven ? "text-right" : ""}>
                                <h3 className="font-display font-semibold text-base">{step.title}</h3>
                              </div>
                            </div>
                            <p className={`text-sm text-muted-foreground ${isEven ? "text-right" : ""}`}>{step.desc}</p>
                          </div>
                        </div>
                      </div>

                      {/* Center node */}
                      <div className="relative w-24 flex items-center justify-center shrink-0">
                        <motion.div
                          className="w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30 z-10"
                          initial={{ scale: 0, rotate: -180 }}
                          whileInView={{ scale: 1, rotate: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        >
                          {step.num}
                        </motion.div>
                        {[...Array(3)].map((_, j) => (
                          <motion.div
                            key={j}
                            className="absolute text-primary/40"
                            animate={{
                              y: [-8, -28, -8],
                              x: [j * 6 - 6, j * 8 - 8, j * 6 - 6],
                              opacity: [0, 0.8, 0],
                              scale: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 2.5 + j * 0.4,
                              repeat: Infinity,
                              delay: j * 0.8 + i * 0.3,
                            }}
                          >
                            <Sparkles className="w-3 h-3" />
                          </motion.div>
                        ))}
                      </div>

                      {/* Mockup side */}
                      <div className={`w-[calc(50%-3rem)] flex ${isEven ? "justify-start pl-4" : "justify-end pr-4"}`}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.4, duration: 0.5 }}
                        >
                          <StepMockup step={i} isMobile={false} />
                        </motion.div>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="md:hidden flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-sm">
                          {step.num}
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center gradient-border">
                          <step.icon className="w-4 h-4 text-primary" />
                        </div>
                      </div>
                      <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{step.desc}</p>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                      >
                        <StepMockup step={i} isMobile={true} />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section ref={statsRef} className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 sm:p-10 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <s.icon className="w-5 h-5 text-primary mb-2" />
                <span className="text-2xl sm:text-3xl font-display font-bold gradient-text">{s.value}</span>
                <span className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Topic Tags Cloud ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t("landing.topicTagsTitle")}
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">{t("landing.topicTagsDesc")}</p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-3">
            {topicTags.map((tag, i) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                whileHover={{ y: -3, scale: 1.05, transition: { duration: 0.15 } }}
                className="px-4 py-2 rounded-full border border-border/60 bg-primary/5 text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-default"
              >
                {tag}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
              {t("landing.featuresTitle1")} <span className="gradient-text">{t("landing.featuresTitle2")}</span> {t("landing.featuresTitle3")}
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
              {t("landing.featuresDesc")}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="glass-card p-6 hover:border-primary/30 transition-all duration-300 group cursor-default"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t("landing.comparisonTitle")}
            </h2>
          </motion.div>

          <div className="glass-card overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-2 border-b border-border/60">
              <div className="px-6 py-4 text-sm font-semibold text-muted-foreground">
                {t("landing.compTraditional")}
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-primary bg-primary/5">
                {t("landing.compEdtrack")}
              </div>
            </div>
            {/* Table rows */}
            {comparisonRows.map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`grid grid-cols-2 ${i < comparisonRows.length - 1 ? "border-b border-border/40" : ""}`}
              >
                <div className="px-6 py-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="w-4 h-4 text-destructive shrink-0" />
                  <span>{row.old}</span>
                </div>
                <div className="px-6 py-4 flex items-center gap-2 text-sm bg-primary/5">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span className="text-foreground">{row.new}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      {tiersLoaded && !tiersError && fetchedTiers.length > 0 && (
        <section id="pricing" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                {t("landing.pricingTitle")}
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">{t("landing.pricingDesc")}</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {fetchedTiers.map((plan, i) => {
                const isPopular = i === 1 || plan.name.toLowerCase().includes("pro");
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.45 }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    className={`relative glass-card p-6 flex flex-col ${isPopular ? "gradient-border ring-1 ring-primary/20" : ""}`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3">
                        {t("landing.pricingPopular")}
                      </Badge>
                    )}
                    <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                    <p className="text-3xl font-display font-bold gradient-text mb-6">
                      ${plan.price}/oy
                    </p>
                    <ul className="flex-1 space-y-3 mb-6">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => navigate("/auth?mode=register")}
                      variant={isPopular ? "default" : "outline"}
                      className={isPopular ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20" : ""}
                    >
                      {t("landing.pricingCta")}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {t("landing.faqTitle")}
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 sm:p-8"
          >
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
                  <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-3xl mx-auto text-center glass-card p-12 overflow-hidden"
        >
          {/* Animated gradient border glow */}
          <div className="absolute inset-0 rounded-[var(--radius)] opacity-50 pointer-events-none" style={{
            background: "conic-gradient(from 0deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3), hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.3))",
            filter: "blur(30px)",
          }} />

          {/* Floating sparkles */}
          <motion.div
            className="absolute top-6 left-8 text-primary/30"
            animate={{ y: [-5, 5, -5], rotate: [0, 15, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <motion.div
            className="absolute bottom-8 right-10 text-accent/30"
            animate={{ y: [5, -5, 5], rotate: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>

          <div className="relative z-10">
            <h2 className="text-3xl font-display font-bold mb-4">{t("landing.ctaTitle")}</h2>
            <p className="text-muted-foreground mb-8">{t("landing.ctaDesc")}</p>
            <Button
              size="lg"
              onClick={() => navigate("/auth?mode=register")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 shadow-lg shadow-primary/25"
            >
              {t("landing.createFree")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={BlackLogo} alt="Iqro AI Logo" className="h-5 sm:h-6 w-auto dark:hidden" />
            <img src={WhiteLogo} alt="Iqro AI Logo" className="h-5 sm:h-6 w-auto hidden dark:block" />
            <span className="text-sm text-muted-foreground">© 2026</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("landing.poweredByAI")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
