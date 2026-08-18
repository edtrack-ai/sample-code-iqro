import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, Search, Sparkles, Plus, Tag, ChevronRight, BookOpen, User, 
  Clock, Lock, Play, Check, Loader2, AlertCircle, Trash2, Edit, Coins, 
  ChevronDown, Image, Sparkle, Percent, CheckCircle, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useAuthStore } from "@/lib/authStore";
import { marketplaceApi, roadmapApi, Course, ApiRoadmap } from "@/lib/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface WeekGroup {
  weekNumber: number;
  weekTitle: string;
  lessons: { lesson: any; globalIndex: number }[];
}

function groupByWeek(lessons: any[]): WeekGroup[] {
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

export default function Marketplace() {
  const t = useI18n((s) => s.t);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, creditBalance, plan, fetchProfile } = useAuthStore();

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"browse" | "creator" | "purchased" | "history">("browse");
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Detailed preview modal states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDetails, setCourseDetails] = useState<Course | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<{
    percent: number;
    discountAmount: string;
    finalPrice: string;
    promoId: number;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Lesson content preview inside modal
  const [previewLesson, setPreviewLesson] = useState<{
    id: number;
    title: string;
    content: string;
    roadmapId: number;
  } | null>(null);

  // Creator state
  const [myRoadmaps, setMyRoadmaps] = useState<ApiRoadmap[]>([]);
  const [publishingRoadmap, setPublishingRoadmap] = useState<ApiRoadmap | null>(null);
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorDescription, setCreatorDescription] = useState("");
  const [creatorPrice, setCreatorPrice] = useState("9.99");
  const [creatorBanner, setCreatorBanner] = useState("");
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);

  // Withdraw states
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const [creatorAnalytics, setCreatorAnalytics] = useState<{
    total_earnings: number;
    total_courses_count: number;
    total_sales_count: number;
    courses: any[];
    sales_log: any[];
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [promoCourseId, setPromoCourseId] = useState<number | null>(null);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState("20");
  const [savingPromo, setSavingPromo] = useState(false);

  // Editing course states
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("9.99");
  const [editDiscountPercent, setEditDiscountPercent] = useState("0");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [updatingCourse, setUpdatingCourse] = useState(false);
  const [generatingEditBanner, setGeneratingEditBanner] = useState(false);

  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  // Price calculations for checkout details
  const originalPrice = courseDetails ? parseFloat(courseDetails.price) : 0;
  const directDiscountPercent = courseDetails ? (courseDetails.discount_percent || 0) : 0;
  const directDiscountAmount = (originalPrice * directDiscountPercent) / 100;
  const basePriceAfterDirectDiscount = originalPrice - directDiscountAmount;
  const finalCheckoutPrice = promoDiscount 
    ? parseFloat(promoDiscount.finalPrice) 
    : basePriceAfterDirectDiscount;

  const toggleExpandedWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) {
        next.delete(weekNum);
      } else {
        next.add(weekNum);
      }
      return next;
    });
  };

  // Fetch published courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await marketplaceApi.listCourses();
      setCourses(data);
    } catch (err) {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch creator own roadmaps
  const fetchMyRoadmaps = async () => {
    try {
      const list = await roadmapApi.list();
      const coursesData = await marketplaceApi.listCourses();
      const publishedRoadmapIds = new Set(coursesData.map(c => c.roadmap));
      // Filter out roadmaps that are already generating/failed, already listed, purchased, or not fully generated
      setMyRoadmaps(list.filter(r => r.status === "ready" && !publishedRoadmapIds.has(r.id) && !r.is_purchased && r.is_fully_generated));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCreatorAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await marketplaceApi.getCreatorAnalytics();
      setCreatorAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch creator analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleStopSale = async (courseId: number) => {
    if (!confirm("Haqiqatan ham ushbu kursni sotuvdan olib tashlamoqchimisiz?")) return;
    try {
      await marketplaceApi.deleteCourse(courseId);
      toast({
        title: "Sotuv to'xtatildi",
        description: "Kurs marketplace'dan muvaffaqiyatli olib tashlandi.",
      });
      fetchCourses();
      fetchMyRoadmaps();
      fetchCreatorAnalytics();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Kursni sotuvdan olib tashlab bo'lmadi.",
        variant: "destructive"
      });
    }
  };

  const handleAddPromoCode = async () => {
    if (!promoCourseId || !newPromoCode.trim()) return;
    setSavingPromo(true);
    try {
      await marketplaceApi.addPromoCode(
        promoCourseId,
        newPromoCode.trim().toUpperCase(),
        parseInt(newPromoDiscount)
      );
      toast({
        title: "Muvaffaqiyatli",
        description: "Promo-kod yaratildi!",
      });
      setNewPromoCode("");
      setPromoCourseId(null);
      fetchCreatorAnalytics();
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err.message || "Promo-kod yaratib bo'lmadi.",
        variant: "destructive"
      });
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromoCode = async (courseId: number, promoId: number) => {
    if (!confirm("Haqiqatan ham ushbu promo-kodni o'chirib tashlamoqchimisiz?")) return;
    try {
      await marketplaceApi.deletePromoCode(courseId, promoId);
      toast({
        title: "Muvaffaqiyatli",
        description: "Promo-kod o'chirildi.",
      });
      fetchCreatorAnalytics();
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err.message || "Promo-kodni o'chirib bo'lmadi.",
        variant: "destructive"
      });
    }
  };

  const handleOpenEditCourse = (course: any) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditDescription(course.description || "");
    setEditPrice(course.price.toString());
    setEditDiscountPercent((course.discount_percent || 0).toString());
    setEditBannerUrl(course.banner_url || "");
  };

  const handleSaveCourseUpdates = async () => {
    if (!editingCourse) return;
    if (parseFloat(editPrice) < 4.99) {
      toast({
        title: t("marketplace.validation.priceError") || "Narx xatosi",
        description: t("marketplace.validation.minPrice") || "Kurs narxi kamida 4.99$ bo'lishi kerak.",
        variant: "destructive",
      });
      return;
    }
    setUpdatingCourse(true);
    try {
      await marketplaceApi.updateCourse(editingCourse.id, {
        title: editTitle,
        description: editDescription,
        price: parseFloat(editPrice),
        discount_percent: parseInt(editDiscountPercent),
        banner_url: editBannerUrl,
      });
      toast({
        title: "Muvaffaqiyatli",
        description: "Kurs ma'lumotlari muvaffaqiyatli yangilandi!",
      });
      setEditingCourse(null);
      fetchCourses();
      fetchCreatorAnalytics();
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Kursni yangilab bo'lmadi.",
        variant: "destructive",
      });
    } finally {
      setUpdatingCourse(false);
    }
  };

  const handleGenerateEditBanner = async () => {
    if (!editingCourse) return;
    setGeneratingEditBanner(true);
    try {
      const res = await marketplaceApi.generateBanner(
        editTitle || editingCourse.title,
        editingCourse.roadmap_topic || "General"
      );
      setEditBannerUrl(res.banner_url);
      toast({
        title: "Muvaffaqiyatli",
        description: "AI orqali minimalist banner yaratildi.",
      });
    } catch (err) {
      toast({
        title: "Xato",
        description: "Banner generatsiya qilishda xatolik.",
        variant: "destructive",
      });
    } finally {
      setGeneratingEditBanner(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await marketplaceApi.getPurchaseHistory();
      setPurchaseHistory(data);
    } catch (err) {
      console.error(err);
      setPurchaseHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (tabParam === "purchased") {
      setActiveTab("purchased");
    } else if (tabParam === "history") {
      setActiveTab("history");
    } else if (tabParam === "creator") {
      setActiveTab("creator");
    } else {
      setActiveTab("browse");
    }
  }, [tabParam]);

  useEffect(() => {
    fetchCourses();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === "creator") {
      fetchMyRoadmaps();
      fetchCreatorAnalytics();
    } else if (activeTab === "history") {
      fetchPurchaseHistory();
    }
  }, [activeTab]);

  const handleOpenDetails = async (course: Course) => {
    setSelectedCourse(course);
    setLoadingDetails(true);
    setCouponCode("");
    setPromoDiscount(null);
    setPreviewLesson(null);
    setExpandedWeeks(new Set([1]));
    try {
      const details = await marketplaceApi.getCourse(course.id);
      setCourseDetails(details);
    } catch (err) {
      toast({
        title: "Xato",
        description: "Kurs tafsilotlarini yuklashda xatolik yuz berdi.",
        variant: "destructive",
      });
      setSelectedCourse(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!user) {
      toast({
        title: "Kirish shart",
        description: "Promo-kodni qo'llash uchun tizimga kirishingiz kerak.",
      });
      navigate("/auth?mode=login");
      return;
    }
    if (!selectedCourse || !couponCode.trim()) return;
    setValidatingPromo(true);
    try {
      const res = await marketplaceApi.validatePromo(selectedCourse.id, couponCode);
      if (res.valid) {
        setPromoDiscount({
          percent: res.discount_percent,
          discountAmount: res.discount_amount,
          finalPrice: res.final_price,
          promoId: res.promo_id,
        });
        toast({
          title: "Muvaffaqiyatli",
          description: `Kupon qo'llanildi: -${res.discount_percent}% chegirma!`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Xato",
        description: err.message || "Noto'g'ri yoki faol bo'lmagan promo-kod.",
        variant: "destructive",
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Kirish shart",
        description: "Kursni xarid qilish uchun tizimga kirishingiz kerak.",
      });
      navigate("/auth?mode=login");
      return;
    }
    if (!selectedCourse) return;
    setPurchasing(true);
    try {
      const res = await marketplaceApi.purchaseCourse(
        selectedCourse.id,
        promoDiscount?.promoId
      );
      toast({
        title: "Xarid muvaffaqiyatli yakunlandi",
        description: "Kurs profilingizga qo'shildi! Endi darsni boshlashingiz mumkin.",
      });
      setSelectedCourse(null);
      fetchCourses();
      fetchProfile();
      // Redirect to learn mode
      if (res.roadmap_id) {
        const fullRoadmap = await roadmapApi.getDetails(res.roadmap_id);
        const firstLessonId = fullRoadmap.lessons[0]?.id;
        if (firstLessonId) {
          navigate(`/learn/${res.roadmap_id}/${firstLessonId}`);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      toast({
        title: "To'lov xatosi",
        description: err.message || "Xaridni amalga oshirib bo'lmadi.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleGenerateBanner = async () => {
    if (!publishingRoadmap) return;
    setGeneratingBanner(true);
    try {
      const res = await marketplaceApi.generateBanner(
        creatorTitle || publishingRoadmap.topic,
        publishingRoadmap.topic
      );
      setCreatorBanner(res.banner_url);
      toast({
        title: "Muvaffaqiyatli",
        description: "AI orqali minimalist banner yaratildi.",
      });
    } catch (err) {
      toast({
        title: "Xato",
        description: "Banner generatsiya qilishda xatolik.",
        variant: "destructive",
      });
    } finally {
      setGeneratingBanner(false);
    }
  };

  const handleToggleLessonPreview = async (lessonId: number, currentPreview: boolean) => {
    if (!publishingRoadmap) return;
    try {
      await marketplaceApi.editCourseLesson(lessonId, {
        is_preview: !currentPreview
      });
      // Refresh publishing roadmap preview settings
      const updatedDetails = await roadmapApi.getDetails(publishingRoadmap.id);
      setPublishingRoadmap(updatedDetails);
      toast({
        title: "Yangilandi",
        description: "Dars preview holati o'zgartirildi.",
      });
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Dars preview holatini o'zgartirib bo'lmadi. (Maksimal 10% limit bo'lishi mumkin).",
        variant: "destructive",
      });
    }
  };

  const handlePublishCourse = async () => {
    if (!publishingRoadmap) return;
    if (parseFloat(creatorPrice) < 4.99) {
      toast({
        title: t("marketplace.validation.priceError") || "Narx xatosi",
        description: t("marketplace.validation.minPrice") || "Kurs narxi kamida 4.99$ bo'lishi kerak.",
        variant: "destructive",
      });
      return;
    }
    setSavingCourse(true);
    try {
      await marketplaceApi.createCourse({
        roadmap: publishingRoadmap.id,
        title: creatorTitle || publishingRoadmap.topic,
        description: creatorDescription,
        price: parseFloat(creatorPrice),
        banner_url: creatorBanner,
        is_published: true,
      });
      toast({
        title: "Muvaffaqiyatli",
        description: "Kurs marketplace'ga muvaffaqiyatli chiqarildi!",
      });
      setPublishingRoadmap(null);
      setActiveTab("browse");
      fetchCourses();
    } catch (err: any) {
      toast({
        title: "Nashr xatosi",
        description: err.message || "Kursni nashr qilib bo'lmadi.",
        variant: "destructive",
      });
    } finally {
      setSavingCourse(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({
        title: t("marketplace.validation.priceError") || "Narx xatosi",
        description: t("marketplace.creator.withdrawAmountLabel") || "Yechib olinadigan pul miqdori noto'g'ri ko'rsatilgan.",
        variant: "destructive",
      });
      return;
    }
    if (amt > (creatorAnalytics?.total_earnings ?? 0)) {
      toast({
        title: t("marketplace.validation.priceError") || "Narx xatosi",
        description: t("marketplace.creator.insufficient_funds") || "Balansda yetarli mablag' mavjud emas.",
        variant: "destructive",
      });
      return;
    }

    setWithdrawing(true);
    try {
      const res = await marketplaceApi.withdraw(amt);
      toast({
        title: t("marketplace.creator.withdrawSuccess") || "Muvaffaqiyatli",
        description: res.detail || "Mablag' muvaffaqiyatli yechib olindi!",
      });
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      fetchCreatorAnalytics(); // Refresh balance
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Yechishda xatolik yuz berdi.",
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.roadmap_topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 md:pt-8 pb-8">
      {/* Hero section */}
      <div className="relative rounded-3xl overflow-hidden mb-10 bg-gradient-to-br from-[#3a6651]/20 via-background to-secondary/30 border border-[#3a6651]/20 p-8 md:p-12 shadow-sm">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#3a6651]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3a6651]/15 text-[#3a6651] dark:text-[#528d71] text-xs font-semibold mb-4">
            <Store className="w-3.5 h-3.5" />
            {t("marketplace.title") || "Iqro Marketplace"}
          </span>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight leading-tight mb-4">
            {t("marketplace.subtitle") || "Bilimlar bozori: Tayyor darsliklarni ulashing va xarid qiling"}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base leading-relaxed mb-6">
            {t("marketplace.desc") || "AI orqali yaratilgan va o'qituvchilar tomonidan to'ldirilgan yuqori sifatli darsliklar va roadmaplarni sotib oling yoki o'zingiz yaratgan darslarni soting."}
          </p>

          {/* Search bar */}
          {(activeTab === "browse" || activeTab === "purchased") && (
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("marketplace.searchPlaceholder") || "Mavzular yoki darslik nomini qidiring..."}
                  className="pl-10 h-11 bg-background border-border/80 focus-visible:ring-[#3a6651] rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      {user && (
        <div className="flex flex-wrap border-b border-border/60 mb-8 gap-6">
          <button
            onClick={() => {
              setActiveTab("browse");
              navigate("/marketplace");
            }}
            className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all ${
              activeTab === "browse"
                ? "border-[#3a6651] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("marketplace.tabs.browse") || "Kurslarni ko'rish (Browse)"}
          </button>
          <button
            onClick={() => {
              setActiveTab("creator");
              navigate("/marketplace?tab=creator");
            }}
            className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all ${
              activeTab === "creator"
                ? "border-[#3a6651] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("marketplace.tabs.creator") || "Creator kabineti (Publish)"}
          </button>
          <button
            onClick={() => {
              setActiveTab("purchased");
              navigate("/marketplace?tab=purchased");
            }}
            className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all ${
              activeTab === "purchased"
                ? "border-[#3a6651] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("marketplace.tabs.purchased") || "Mening xaridlarim"}
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              navigate("/marketplace?tab=history");
            }}
            className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all ${
              activeTab === "history"
                ? "border-[#3a6651] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("marketplace.tabs.history") || "Xaridlar tarixi"}
          </button>
        </div>
      )}

      {/* Main Content Areas */}
      <AnimatePresence mode="wait">
        {activeTab === "browse" && (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? (
              <div className="col-span-full py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#3a6651]" />
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-card border border-dashed border-border/80 rounded-2xl p-8">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground/60 mb-4">
                  <Store className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Hozircha kurslar yo'q
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Marketplace'da darsliklar hali yuklanmagan. Tez orada bu yerda premium darsliklar va o'quv yo'llanmalari paydo bo'ladi.
                </p>
              </div>
            ) : (
              filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -4 }}
                  className="glass-card flex flex-col h-[400px] overflow-hidden group hover:border-[#3a6651]/40 transition-all duration-200"
                >
                  {/* Banner image or fallback SVG */}
                  <div className="relative h-44 w-full bg-secondary overflow-hidden border-b border-border/30">
                    {course.banner_url ? (
                      <img
                        src={course.banner_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#3a6651] to-[#284b39] flex items-center justify-center p-4">
                        <BookOpen className="w-12 h-12 text-white/20 absolute right-4 bottom-4" />
                        <span className="text-white font-display font-bold text-lg text-center px-4 line-clamp-2">
                          {course.title}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-background/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-foreground border border-border/50 flex items-center gap-1.5 shadow-sm">
                      {course.discount_percent && course.discount_percent > 0 ? (
                        <>
                          <span className="text-muted-foreground/60 line-through text-[10px]">${parseFloat(course.price).toFixed(2)}</span>
                          <span className="text-red-500 font-extrabold">${(parseFloat(course.price) * (100 - course.discount_percent) / 100).toFixed(2)}</span>
                          <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-extrabold">-{course.discount_percent}%</span>
                        </>
                      ) : (
                        <span>${parseFloat(course.price).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{course.creator_full_name || course.creator_username}</span>
                        <span>•</span>
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{course.lessons_count} {t("marketplace.card.lessons") || "ta dars"}</span>
                      </div>
                      <h3 className="font-display font-bold text-base line-clamp-1 mb-2 group-hover:text-[#3a6651] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description || "Ushbu darslik bo'yicha qo'shimcha ma'lumot kiritilmagan."}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                      {course.creator === user?.pk ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          {t("marketplace.card.myCourse") || "Mening darsligim"}
                        </span>
                      ) : course.is_owned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {t("marketplace.card.purchased") || "Sotib olingan"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">{t("marketplace.card.forSale") || "Bozorda sotuvda"}</span>
                      )}
                      
                      <div className="flex gap-2">
                        {course.creator === user?.pk && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditCourse(course)}
                            className="border-[#3a6651]/20 text-[#3a6651] hover:bg-[#3a6651]/5 rounded-lg px-3"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleOpenDetails(course)}
                          className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-lg px-4"
                        >
                          {t("marketplace.card.viewBtn") || "Kursni ko'rish"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "creator" && (
          /* Creator Space Tab */
          <motion.div
            key="creator"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8 animate-in fade-in duration-300"
          >
            {/* Creator balance display & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card p-6 bg-gradient-to-r from-[#3a6651]/10 to-transparent border-l-4 border-l-[#3a6651] flex items-center justify-between col-span-1 lg:col-span-2">
                <div>
                  <h3 className="font-bold text-lg mb-1">{t("marketplace.creator.earnings") || "Creator daromadi"}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">{t("marketplace.creator.earningsDesc") || "Marketplace orqali sotilgan darsliklar uchun 20% komissiya yechib olingan holdagi sizning sof daromadingiz."}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 bg-background border border-border/80 rounded-2xl px-5 py-3 shadow-sm">
                    <Coins className="w-5 h-5 text-[#3a6651]" />
                    <span className="font-display font-extrabold text-2xl tracking-tight text-[#3a6651]">{(creatorAnalytics?.total_earnings ?? 0).toFixed(2)}$</span>
                  </div>
                  {user && (creatorAnalytics?.total_earnings ?? 0) > 0 && (
                    <Button
                      onClick={() => {
                        setWithdrawAmount("");
                        setShowWithdrawDialog(true);
                      }}
                      className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-xl h-12 px-5 font-bold shadow-sm flex items-center gap-1.5"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {t("marketplace.creator.withdrawBtn") || "Yechib olish"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 flex justify-around items-center">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t("marketplace.creator.listedCourses") || "Sotuvdagi kurslar"}</p>
                  <p className="text-2xl font-display font-extrabold text-foreground">{creatorAnalytics?.total_courses_count ?? 0}</p>
                </div>
                <div className="h-8 w-[1px] bg-border/60" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">{t("marketplace.creator.salesCount") || "Sotuvlar soni"}</p>
                  <p className="text-2xl font-display font-extrabold text-foreground">{creatorAnalytics?.total_sales_count ?? 0}</p>
                </div>
              </div>
            </div>

            {/* Split layout: Active Listings & Sales History */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Side: Active Listings */}
              <div className="lg:col-span-8 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                    <Store className="w-5 h-5 text-[#3a6651]" />
                    Mening sotuvdagi kurslarim
                  </h3>
                  
                  {!creatorAnalytics || creatorAnalytics.courses.length === 0 ? (
                    <div className="py-12 text-center glass-card border-dashed">
                      <AlertCircle className="w-6 h-6 mx-auto text-muted-foreground/60 mb-2" />
                      <p className="text-sm text-muted-foreground">Siz hali birorta ham kursni sotuvga chiqarmagansiz.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {creatorAnalytics.courses.map((course) => (
                        <div key={course.id} className="glass-card flex flex-col justify-between overflow-hidden border-border/80 hover:border-[#3a6651]/30 transition-all">
                          <div>
                            {/* Course Banner Mini */}
                            <div className="h-28 w-full bg-secondary/50 relative overflow-hidden border-b border-border/30">
                              {course.banner_url ? (
                                <img src={course.banner_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[#3a6651] to-[#284b39] flex items-center justify-center p-3">
                                  <span className="text-white font-display font-bold text-xs text-center line-clamp-2">{course.title}</span>
                                </div>
                              )}
                              <div className="absolute top-2.5 right-2.5 bg-background/95 px-2 py-0.5 rounded-md text-[10px] font-bold text-foreground border border-border/40 flex items-center gap-1 shadow-sm">
                                {course.discount_percent && course.discount_percent > 0 ? (
                                  <>
                                    <span className="text-muted-foreground/60 line-through text-[9px]">${parseFloat(course.price).toFixed(2)}</span>
                                    <span className="text-red-500 font-extrabold">${(parseFloat(course.price) * (100 - course.discount_percent) / 100).toFixed(2)}</span>
                                  </>
                                ) : (
                                  <span>${parseFloat(course.price).toFixed(2)}</span>
                                )}
                              </div>
                            </div>

                            <div className="p-4 space-y-3.5">
                              <div>
                                <h4 className="font-display font-bold text-sm text-foreground line-clamp-1">{course.title}</h4>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground font-medium">
                                  <span>{course.sales_count} sotilgan</span>
                                  <span>•</span>
                                  <span className="text-[#3a6651] font-semibold">{(course.total_revenue ?? 0).toFixed(2)}$ daromad</span>
                                </div>
                              </div>

                              <Separator className="bg-border/40" />

                              {/* Promo Code list */}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Faol Promo-kodlar</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {course.promos.map((p: any) => (
                                    <span key={p.id} className="inline-flex items-center gap-1 bg-[#3a6651]/10 text-[#3a6651] text-[10px] font-bold px-2 py-0.5 rounded-md">
                                      {p.code} (-{p.discount_percent}%)
                                      <button onClick={() => handleDeletePromoCode(course.id, p.id)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                                    </span>
                                  ))}
                                  {course.promos.length === 0 && (
                                    <span className="text-[10px] text-muted-foreground/60 italic block">Kuponlar yaratilmagan</span>
                                  )}
                                </div>

                                {/* Inline Promo builder */}
                                {promoCourseId === course.id ? (
                                  <div className="mt-2.5 p-2.5 bg-secondary/20 rounded-xl border border-border/50 space-y-2 animate-in slide-in-from-top-1 duration-150">
                                    <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Yangi promo-kod</Label>
                                    <div className="flex gap-1.5">
                                      <Input
                                        placeholder="KOD"
                                        value={newPromoCode}
                                        onChange={(e) => setNewPromoCode(e.target.value)}
                                        className="h-8 text-[11px] font-semibold uppercase focus-visible:ring-[#3a6651] px-2 rounded-lg"
                                      />
                                      <select
                                        value={newPromoDiscount}
                                        onChange={(e) => setNewPromoDiscount(e.target.value)}
                                        className="h-8 rounded-lg border border-input bg-background px-1.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3a6651]"
                                      >
                                        <option value="10">10%</option>
                                        <option value="20">20%</option>
                                        <option value="30">30%</option>
                                        <option value="40">40%</option>
                                        <option value="50">50%</option>
                                        <option value="100">100%</option>
                                      </select>
                                    </div>
                                    <div className="flex gap-1.5 justify-end pt-1">
                                      <Button size="xs" variant="ghost" onClick={() => setPromoCourseId(null)} className="h-6 text-[10px] rounded-md">
                                        Bekor qilish
                                      </Button>
                                      <Button size="xs" onClick={handleAddPromoCode} disabled={savingPromo || !newPromoCode.trim()} className="bg-[#3a6651] hover:bg-[#2e5241] text-white h-6 text-[10px] rounded-md px-2.5 font-bold">
                                        Qo'shish
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setPromoCourseId(course.id);
                                      setNewPromoCode("");
                                    }}
                                    className="text-[10px] font-bold text-[#3a6651] hover:underline flex items-center gap-1 pt-0.5"
                                  >
                                    + Kupon yaratish
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="px-4 pb-4 pt-1 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  const rid = typeof course.roadmap === 'number' ? course.roadmap : (course.roadmap as any)?.id || (course as any).roadmap_id;
                                  if (rid) {
                                    navigate(`/generate?id=${rid}&topic=${encodeURIComponent(course.title)}`);
                                  } else {
                                    navigate(`/roadmaps`);
                                  }
                                }}
                                className="border-[#3a6651]/20 text-[#3a6651] hover:bg-[#3a6651]/5 gap-1 font-bold h-7 rounded-lg text-[10px]"
                              >
                                <BookOpen className="w-3 h-3" />
                                Yo'l xaritasini ko'rish
                              </Button>
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleOpenEditCourse(course)}
                                className="border-[#3a6651]/20 text-[#3a6651] hover:bg-[#3a6651]/5 gap-1 font-bold h-7 rounded-lg text-[10px]"
                              >
                                <Edit className="w-3 h-3" />
                                Kursni tahrirlash
                              </Button>
                            </div>
                            
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleStopSale(course.id)}
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1 font-bold h-7 rounded-lg text-[10px]"
                            >
                              <Trash2 className="w-3 h-3" />
                              Sotuvni to'xtatish
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Detailed Sales History Log (day/hour) */}
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                    <Clock className="w-5 h-5 text-[#3a6651]" />
                    Sotuvlar tarixi
                  </h3>

                  <div className="glass-card p-4 space-y-3.5 max-h-[460px] overflow-y-auto">
                    {!creatorAnalytics || creatorAnalytics.sales_log.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground italic">
                        Hozircha sotuvlar amalga oshirilmagan.
                      </div>
                    ) : (
                      creatorAnalytics.sales_log.map((log) => {
                        const dateObj = new Date(log.created_at);
                        const dateStr = dateObj.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
                        const timeStr = dateObj.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                          <div key={log.id} className="flex justify-between items-start text-xs border-b border-border/30 pb-3 last:border-0 last:pb-0">
                            <div className="space-y-1 max-w-[70%]">
                              <p className="font-bold text-foreground truncate">{log.course_title}</p>
                              <p className="text-[10px] text-muted-foreground">Xaridor: <span className="font-medium text-foreground">{log.purchaser_username}</span></p>
                              {log.promo_used && (
                                <span className="inline-block bg-amber-500/10 text-amber-600 text-[8px] font-bold px-1 py-0.2 rounded mt-0.5">
                                  Kupon: {log.promo_used}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#3a6651]">+{((log.creator_earnings) ?? 0).toFixed(2)}$</p>
                              <p className="text-[9px] text-muted-foreground">{dateStr}, {timeStr}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* List of roadmaps to list (Available to Publish) */}
            <div>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-foreground">
                <Plus className="w-5 h-5 text-[#3a6651]" />
                {t("marketplace.creator.availableToPublish") || "Sotuvga qo'yish mumkin bo'lgan darslar"}
              </h3>
              {myRoadmaps.length === 0 ? (
                <div className="py-12 text-center glass-card border-dashed">
                  <AlertCircle className="w-7 h-7 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground font-semibold">{t("marketplace.creator.noAvailableRoadmaps") || "Tizimda sotuvga qo'yish uchun mos (ready holatdagi) yangi roadmap topilmadi."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myRoadmaps.map((rm) => (
                    <div key={rm.id} className="glass-card p-5 flex flex-col justify-between h-48">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground font-medium mb-2.5">
                          {rm.difficulty}
                        </span>
                        <h4 className="font-display font-bold text-base line-clamp-2 mb-2">{rm.topic}</h4>
                        <p className="text-xs text-muted-foreground">{rm.lessons.length} {t("marketplace.card.lessons") || "ta dars"} • {rm.total_estimated_hours} soat</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            setPublishingRoadmap(rm);
                            setCreatorTitle(rm.topic);
                            setCreatorDescription("");
                            setCreatorPrice("9.99");
                            setCreatorBanner("");
                          }}
                          className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-lg gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          {t("marketplace.creator.publishBtn") || "Sotuvga qo'yish"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "purchased" && (
          <motion.div
            key="purchased"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {loading ? (
              <div className="col-span-full py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#3a6651]" />
              </div>
            ) : courses.filter(c => c.is_owned && c.creator !== user?.pk).length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-card border border-dashed border-border/80 rounded-2xl p-8">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground/60 mb-4">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {t("marketplace.purchased.emptyTitle") || "Xarid qilingan kurslar yo'q"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  {t("marketplace.purchased.empty") || "Siz hali birorta ham kursni xarid qilmagansiz. \"Kurslarni ko'rish\" bo'limidan o'zingizga mos darslikni xarid qiling."}
                </p>
                <Button
                  onClick={() => {
                    setActiveTab("browse");
                    navigate("/marketplace");
                  }}
                  className="mt-4 bg-[#3a6651] hover:bg-[#2e5241] text-white"
                >
                  {t("marketplace.purchased.browseBtn") || "Bozorni kezish"}
                </Button>
              </div>
            ) : (
              courses.filter(c => c.is_owned && c.creator !== user?.pk && (
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.roadmap_topic.toLowerCase().includes(searchQuery.toLowerCase())
              )).map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -4 }}
                  className="glass-card flex flex-col h-[400px] overflow-hidden group hover:border-[#3a6651]/40 transition-all duration-200"
                >
                  <div className="relative h-44 w-full bg-secondary overflow-hidden border-b border-border/30">
                    {course.banner_url ? (
                      <img
                        src={course.banner_url}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#3a6651] to-[#284b39] flex items-center justify-center p-4">
                        <BookOpen className="w-12 h-12 text-white/20 absolute right-4 bottom-4" />
                        <span className="text-white font-display font-bold text-lg text-center px-4 line-clamp-2">
                          {course.title}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-background/95 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-[#3a6651] border border-border/50 shadow-sm">
                      Sotib olingan
                    </div>
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{course.creator_username}</span>
                        <span>•</span>
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{course.lessons_count} ta dars</span>
                      </div>
                      <h3 className="font-display font-bold text-base line-clamp-1 mb-2 group-hover:text-[#3a6651] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {course.description || "Ushbu darslik bo'yicha qo'shimcha ma'lumot kiritilmagan."}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border/40">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2.5 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Aktiv
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetails(course)}
                        className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-lg px-4"
                      >
                        Kursni ko'rish
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-border/50">
                <h3 className="font-bold text-lg">{t("marketplace.history.title") || "Mening xaridlarim tarixi"}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t("marketplace.history.desc") || "Siz tomoningizdan sotib olingan barcha darsliklarning kvitansiyalari va to'lov jurnallari."}</p>
              </div>

              {loadingHistory ? (
                <div className="py-16 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#3a6651]" />
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="py-16 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">{t("marketplace.history.empty") || "Hozircha xaridlar tarixi bo'sh."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm font-semibold">
                    <thead>
                      <tr className="bg-secondary/20 text-muted-foreground border-b border-border/40 font-semibold text-xs uppercase">
                        <th className="p-4">{t("marketplace.history.colTitle") || "Kurs nomi"}</th>
                        <th className="p-4">{t("marketplace.history.colDate") || "Sana"}</th>
                        <th className="p-4">{t("marketplace.history.colCoupon") || "Kupon"}</th>
                        <th className="p-4">{t("marketplace.history.colPrice") || "To'langan narx"}</th>
                        <th className="p-4 text-right">{t("marketplace.history.colAction") || "Harakat"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {purchaseHistory.map((item: any) => (
                        <tr key={item.id} className="hover:bg-secondary/5 transition-colors font-medium">
                          <td className="p-4 font-bold text-foreground">{item.course_title}</td>
                          <td className="p-4 text-muted-foreground">
                            {new Date(item.created_at).toLocaleString("uz-UZ", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="p-4">
                            {item.promo_code_used ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded">
                                <Tag className="w-3 h-3" />
                                {item.promo_code_used.code || "KOD"}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="p-4 font-extrabold text-[#3a6651]">
                            {parseFloat(item.amount_paid) === 0 ? "Bepul" : `${parseFloat(item.amount_paid).toFixed(2)}$`}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const matched = courses.find(c => c.id === item.course);
                                if (matched) handleOpenDetails(matched);
                              }}
                              className="border-border/60 hover:bg-secondary/40 text-xs h-8"
                            >
                              {t("marketplace.history.detailBtn") || "Batafsil"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detailed View Modal (Browse Details / Purchase Flow) */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border/80 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-border/40 flex items-center justify-between">
                <h2 className="text-xl font-display font-bold line-clamp-1">{selectedCourse.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)} className="rounded-xl hover:bg-secondary">
                  {t("marketplace.modal.closeBtn") || "Yopish"}
                </Button>
              </div>

              {loadingDetails ? (
                <div className="py-20 flex justify-center flex-1">
                  <Loader2 className="w-8 h-8 animate-spin text-[#3a6651]" />
                </div>
              ) : (
                courseDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1">
                    {/* Left Column - Details, Description & Lessons */}
                    <div className="md:col-span-8 p-6 space-y-6 border-r border-border/40 max-h-[70vh] overflow-y-auto">
                      {courseDetails.banner_url ? (
                        <div className="w-full h-48 rounded-xl overflow-hidden border border-border/30">
                          <img src={courseDetails.banner_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-full h-48 rounded-xl bg-gradient-to-br from-[#3a6651] to-[#284b39] flex items-center justify-center text-white font-display font-bold text-xl p-4">
                          {courseDetails.title}
                        </div>
                      )}

                      <div>
                        <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("marketplace.modal.descriptionTitle") || "Dars tavsifi"}</h4>
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                          {courseDetails.description || t("marketplace.modal.redactWarning") || "Ushbu darslik uchun batafsil tavsif berilmagan."}
                        </p>
                      </div>

                      {/* Course Roadmap and Previews */}
                      <div>
                        <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4">{t("marketplace.modal.lessonsTitle") || "Kurs rejasi & darslar"}</h4>
                        <div className="space-y-4">
                          {(() => {
                            const weeks = groupByWeek(courseDetails.roadmap_details?.lessons || []);
                            const numberedWeeks = weeks.map((w, i) => ({ ...w, displayNumber: i + 1 }));
                            return numberedWeeks.map((week) => {
                              const isExpanded = expandedWeeks.has(week.weekNumber);
                              return (
                                <div key={week.weekNumber} className="border border-border/50 rounded-xl overflow-hidden bg-secondary/5">
                                  {/* Section Header Button */}
                                  <button
                                    onClick={() => toggleExpandedWeek(week.weekNumber)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-all text-left"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-[#3a6651]/10 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-[#3a6651]">W{week.displayNumber}</span>
                                      </div>
                                      <h5 className="font-display font-bold text-sm text-foreground">{week.weekTitle}</h5>
                                    </div>
                                    <ChevronDown
                                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                                        isExpanded ? "rotate-0" : "-rotate-90"
                                      }`}
                                    />
                                  </button>

                                  {/* Nested Lessons (Collapsible) */}
                                  <AnimatePresence initial={false}>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden px-4 pb-4 pt-1 space-y-3 border-t border-border/30 bg-background/30"
                                      >
                                        {week.lessons.map(({ lesson, globalIndex }) => (
                                          <div
                                            key={lesson.id}
                                            className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-secondary/10"
                                          >
                                            <div className="flex-grow min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-muted-foreground">{t("marketplace.modal.lessonLabel") || "Dars"} {globalIndex + 1}</span>
                                                {lesson.is_preview && (
                                                  <span className="text-[10px] font-bold text-[#3a6651] bg-[#3a6651]/15 px-2 py-0.5 rounded-full">
                                                    {t("marketplace.modal.previewLabel") || "Preview"}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="font-semibold text-sm truncate">{lesson.title}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {lesson.is_preview ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewLesson({
                                                      id: lesson.id,
                                                      title: lesson.title,
                                                      content: lesson.content || t("marketplace.modal.noContent") || "Dars kontenti mavjud emas.",
                                                      roadmapId: courseDetails.roadmap_details!.id
                                                    });
                                                  }}
                                                  className="border-[#3a6651]/30 hover:bg-[#3a6651]/10 text-[#3a6651] gap-1 font-bold h-8 rounded-lg"
                                                >
                                                  <Play className="w-3.5 h-3.5" />
                                                  {t("marketplace.modal.previewBtn") || "O'qib ko'rish"}
                                                </Button>
                                              ) : (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground px-3 py-1 bg-muted rounded-lg font-medium">
                                                  <Lock className="w-3.5 h-3.5" />
                                                  {t("marketplace.modal.lockedLabel") || "Yopiq"}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Checkout & Summary */}
                    <div className="md:col-span-4 p-6 bg-secondary/15 flex flex-col justify-between border-t md:border-t-0 border-border/40">
                      <div className="space-y-6">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground font-semibold uppercase">{t("marketplace.modal.priceHeader") || "Kurs narxi"}</Label>
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            {directDiscountPercent > 0 ? (
                              <>
                                <span className="text-3xl font-display font-extrabold text-[#3a6651]">{basePriceAfterDirectDiscount.toFixed(2)}$</span>
                                <span className="text-sm text-muted-foreground/60 line-through">${originalPrice.toFixed(2)}</span>
                                <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-extrabold">-{directDiscountPercent}%</span>
                              </>
                            ) : (
                              <span className="text-3xl font-display font-extrabold">{originalPrice.toFixed(2)}$</span>
                            )}
                          </div>
                        </div>

                        <Separator className="bg-border/60" />

                        {/* Promo application */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-foreground">{t("marketplace.modal.promoLabel") || "Promo-kod (Kupon)"}</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder={t("marketplace.modal.promoPlaceholder") || "Kodni kiriting..."}
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              className="h-9 focus-visible:ring-[#3a6651]"
                            />
                            <Button
                              size="sm"
                              onClick={handleApplyPromo}
                              disabled={validatingPromo || !couponCode.trim()}
                              className="bg-[#3a6651] hover:bg-[#2e5241] text-white"
                            >
                              {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : (t("marketplace.modal.applyBtn") || "Qo'llash")}
                            </Button>
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="space-y-2.5">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t("marketplace.modal.orderSummary") || "Buyurtma tafsiloti"}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("marketplace.modal.originalPrice") || "Boshlang'ich narx"}</span>
                              <span className="font-medium">{originalPrice.toFixed(2)}$</span>
                            </div>
                            {directDiscountPercent > 0 && (
                              <div className="flex justify-between text-red-500">
                                <span className="flex items-center gap-1 font-medium text-xs">
                                  <Percent className="w-3.5 h-3.5" /> {t("marketplace.modal.courseDiscount") || "Kurs chegirmasi"}
                                </span>
                                <span className="font-bold">-{directDiscountPercent}% (-{directDiscountAmount.toFixed(2)}$)</span>
                              </div>
                            )}
                            {promoDiscount && (
                              <div className="flex justify-between text-[#3a6651]">
                                <span className="flex items-center gap-1 font-medium text-xs">
                                  <Tag className="w-3.5 h-3.5" /> {t("marketplace.modal.couponDiscount") || "Kupon chegirmasi"}
                                </span>
                                <span className="font-bold">-{promoDiscount.percent}%</span>
                              </div>
                            )}
                            <Separator className="bg-border/40 my-1" />
                            <div className="flex justify-between text-base font-bold">
                              <span>{t("marketplace.modal.total") || "Jami"}</span>
                              <span className="text-[#3a6651] font-extrabold text-lg">
                                {finalCheckoutPrice.toFixed(2)}$
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6">
                        {courseDetails.is_owned ? (
                          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-success/10 text-success text-sm font-bold border border-success/20">
                            <Check className="w-4 h-4" />
                            {t("marketplace.modal.alreadyOwned") || "Ushbu kursni xarid qilgansiz"}
                          </div>
                        ) : (
                          <Button
                            onClick={handlePurchase}
                            disabled={purchasing}
                            className="w-full h-11 bg-[#3a6651] hover:bg-[#2e5241] text-white font-bold rounded-xl gap-2 shadow-sm shadow-[#3a6651]/20"
                          >
                            {purchasing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t("marketplace.modal.purchasingBtn") || "Xarid qilinmoqda..."}
                              </>
                            ) : !user ? (
                              <>
                                <Coins className="w-4 h-4" />
                                {t("marketplace.modal.loginRequired") || "Xarid qilish uchun kiring"}
                              </>
                            ) : (
                              <>
                                <Coins className="w-4 h-4" />
                                {t("marketplace.modal.purchaseBtn") || "Xarid qilish"} (Atmos Mock)
                              </>
                            )}
                          </Button>
                        )}
                        <p className="text-[10px] text-center text-muted-foreground mt-2.5 leading-relaxed">
                          {t("marketplace.modal.purchaseSuccessDesc") || "Xariddan so'ng ushbu darslik sizning profilingizga to'liq nusxalanadi va chat progresslar alohida saqlanadi."}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Lesson content full-screen layout */}
      <AnimatePresence>
        {previewLesson && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in duration-200">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold truncate max-w-[280px] sm:max-w-md">{previewLesson.title}</span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-600/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Demo / Preview
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPreviewLesson(null)} 
                className="rounded-xl border-border hover:bg-secondary text-xs font-semibold h-8 px-3"
              >
                Yopish
              </Button>
            </div>

            {/* Split Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel: Real Course Lesson Content */}
              <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-10 bg-background">
                <div className="max-w-[720px] mx-auto">
                  <MarkdownRenderer content={previewLesson.content} />
                </div>
              </div>

              {/* Right Panel: Blocked Chat Area */}
              <div className="w-[350px] lg:w-[400px] hidden md:flex flex-col bg-secondary/5 border-l border-border/50 relative shrink-0">
                <div className="px-4 py-3 border-b border-border flex items-center gap-2.5 bg-card/60 backdrop-blur-sm">
                  <div className="p-1.5 rounded-lg bg-primary/10"><Sparkles className="w-4 h-4 text-primary" /></div>
                  <span className="text-sm font-bold font-display flex-1">AI Assistant</span>
                </div>
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-600/10 flex items-center justify-center text-amber-600 border border-amber-600/20">
                     <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm text-foreground">Muloqot bloklangan</h4>
                    <p className="text-xs text-muted-foreground max-w-[240px] leading-relaxed">
                      Ushbu dars bo'yicha sun'iy intellektdan savol so'rash, testlar ishlash va laboratoriya simulyatsiyalaridan foydalanish uchun kursni sotib oling.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setPreviewLesson(null);
                    }}
                    className="bg-[#3a6651] hover:bg-[#2e5241] text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sm shadow-[#3a6651]/20"
                  >
                    Kursni xarid qilish
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Creator Setup Listing Modal */}
      <AnimatePresence>
        {publishingRoadmap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border/80 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <h3 className="text-lg font-display font-bold">Kursni sotuvga chiqarish sozlamalari</h3>
                <Button variant="ghost" size="sm" onClick={() => setPublishingRoadmap(null)} className="rounded-xl">
                  Yopish
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left controls */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-title" className="text-sm font-semibold">Darslik sarlavhasi</Label>
                    <Input
                      id="c-title"
                      placeholder="Masalan: Python boshlang'ich darsligi..."
                      value={creatorTitle}
                      onChange={(e) => setCreatorTitle(e.target.value)}
                      className="focus-visible:ring-[#3a6651]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="c-desc" className="text-sm font-semibold">Darslik tavsifi</Label>
                    <textarea
                      id="c-desc"
                      rows={3}
                      placeholder="Darsda o'rganiladigan bilimlarni batafsil yozib qo'ying..."
                      value={creatorDescription}
                      onChange={(e) => setCreatorDescription(e.target.value)}
                      className="w-full text-sm p-3 rounded-lg border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3a6651]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="c-price" className="text-sm font-semibold">Kurs narxi (USD)</Label>
                    <Input
                      id="c-price"
                      type="number"
                      min="4.99"
                      step="0.01"
                      placeholder="9.99"
                      value={creatorPrice}
                      onChange={(e) => setCreatorPrice(e.target.value)}
                      className="focus-visible:ring-[#3a6651]"
                    />
                    <p className="text-[10px] text-muted-foreground">{t("marketplace.creator.minPriceFootnote") || "Minimal sotuv narxi 4.99$. Platforma sotuvdan 20% komissiya oladi."}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Darslik banneri (Rasm)</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateBanner}
                        disabled={generatingBanner}
                        className="border-[#3a6651]/30 hover:bg-[#3a6651]/10 text-[#3a6651] font-bold text-xs flex-1 gap-1.5 rounded-lg"
                      >
                        {generatingBanner ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkle className="w-3.5 h-3.5" />
                        )}
                        AI orqali minimalist banner yaratish
                      </Button>
                    </div>
                    {creatorBanner && (
                      <div className="mt-2 h-28 border border-border/40 rounded-xl overflow-hidden shadow-inner bg-secondary/10 flex items-center justify-center">
                        <img src={creatorBanner} alt="" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right controls: Preview lessons management */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Ochiq darslarni belgilang (Maksimal 10% darslar)</Label>
                    <p className="text-[10px] text-muted-foreground mb-3">Xaridor sotib olishdan oldin ushbu darslarni to'liq o'qib ko'rish imkoniga ega bo'ladi.</p>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto border border-border/40 rounded-xl p-3 bg-secondary/5">
                      {publishingRoadmap.lessons.map((lesson, idx) => (
                        <div key={lesson.id} className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg border border-border/50 bg-background">
                          <span className="font-medium truncate max-w-[200px]">{lesson.title}</span>
                          <button
                            onClick={() => handleToggleLessonPreview(lesson.id, !!lesson.is_preview)}
                            className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                              lesson.is_preview
                                ? "bg-[#3a6651] text-white"
                                : "bg-secondary text-muted-foreground hover:bg-secondary/75"
                            }`}
                          >
                            {lesson.is_preview ? "Preview" : "Yopiq"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setPublishingRoadmap(null)} className="rounded-xl">
                  Bekor qilish
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublishCourse}
                  disabled={savingCourse}
                  className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-xl gap-1.5"
                >
                  {savingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Marketplace'ga chiqarish
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Course Edit Modal */}
      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#3a6651]" />
                  Kurs ma'lumotlarini tahrirlash
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setEditingCourse(null)} className="rounded-xl hover:bg-secondary">
                  Yopish
                </Button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title" className="text-sm font-semibold">Kurs nomi</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="focus-visible:ring-[#3a6651]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-desc" className="text-sm font-semibold">Kurs tavsifi</Label>
                  <textarea
                    id="edit-desc"
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-sm p-3 rounded-lg border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3a6651]"
                  />
                </div>

                {/* Price and Direct Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-price" className="text-sm font-semibold">Asosiy narx ($)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="4.99"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="focus-visible:ring-[#3a6651]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-discount" className="text-sm font-semibold">To'g'ridan-to'g'ri chegirma (%)</Label>
                    <select
                      id="edit-discount"
                      value={editDiscountPercent}
                      onChange={(e) => setEditDiscountPercent(e.target.value)}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3a6651]"
                    >
                      <option value="0">Chegirmasiz</option>
                      <option value="5">5% Chegirma</option>
                      <option value="10">10% Chegirma</option>
                      <option value="15">15% Chegirma</option>
                      <option value="20">20% Chegirma</option>
                      <option value="25">25% Chegirma</option>
                      <option value="30">30% Chegirma</option>
                      <option value="40">40% Chegirma</option>
                      <option value="50">50% Chegirma</option>
                    </select>
                  </div>
                </div>

                {/* Banner Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Kurs banneri (Rasm)</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateEditBanner}
                      disabled={generatingEditBanner}
                      className="border-[#3a6651]/30 hover:bg-[#3a6651]/10 text-[#3a6651] font-bold text-xs flex-1 gap-1.5 rounded-lg"
                    >
                      {generatingEditBanner ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkle className="w-3.5 h-3.5" />
                      )}
                      AI orqali minimalist banner yaratish
                    </Button>
                  </div>
                  {editBannerUrl && (
                    <div className="mt-2 h-24 border border-border/40 rounded-xl overflow-hidden shadow-inner bg-secondary/10 flex items-center justify-center">
                      <img src={editBannerUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border/40 pt-4 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setEditingCourse(null)} className="rounded-xl">
                  Bekor qilish
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveCourseUpdates}
                  disabled={updatingCourse}
                  className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-xl gap-1.5"
                >
                  {updatingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  O'zgarishlarni saqlash
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Dialog modal */}
      <AnimatePresence>
        {showWithdrawDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="text-lg font-display font-bold text-foreground">
                  {t("marketplace.creator.withdrawTitle") || "Daromadni yechib olish"}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowWithdrawDialog(false)} className="rounded-xl">
                  {t("marketplace.modal.closeBtn") || "Yopish"}
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("marketplace.creator.withdrawDesc") || "Mablag'ingizni karta yoki hamyoningizga yechib oling (Simulyatsiya qilingan to'lov)."}
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="w-amount" className="text-sm font-semibold">
                    {t("marketplace.creator.withdrawAmountLabel") || "Yechib olinadigan pul miqdori (USD)"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="w-amount"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="50.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="focus-visible:ring-[#3a6651]"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Balans: <span className="font-bold text-foreground">{(creatorAnalytics?.total_earnings ?? 0).toFixed(2)}$</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowWithdrawDialog(false)} className="rounded-xl">
                  Bekor qilish
                </Button>
                <Button
                  size="sm"
                  onClick={handleWithdraw}
                  disabled={withdrawing || !withdrawAmount.trim()}
                  className="bg-[#3a6651] hover:bg-[#2e5241] text-white rounded-xl gap-1.5 font-bold"
                >
                  {withdrawing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t("marketplace.creator.withdrawBtn") || "Yechib olish"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
