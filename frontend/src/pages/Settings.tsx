import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, User, CreditCard, Coins, Check, Globe, Loader2 } from "lucide-react";
import { useThemeStore } from "@/lib/themeStore";
import { useAuthStore } from "@/lib/authStore";
import { useI18n, type Lang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { userApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, plan, creditBalance, planFeatures, fetchProfile } = useAuthStore();
  const { lang, setLang, t } = useI18n();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      toast({
        title: "Xatolik",
        description: "Ism bo'sh bo'lishi mumkin emas.",
        variant: "destructive",
      });
      return;
    }
    setSavingProfile(true);
    try {
      await userApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      await fetchProfile();
      toast({
        title: "Muvaffaqiyatli",
        description: "Ism va familiyangiz muvaffaqiyatli saqlandi!",
      });
    } catch (err: any) {
      toast({
        title: "Xatolik",
        description: err.message || "Profilni saqlashda xatolik yuz berdi.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const themeOptions = [
    { value: "light" as const, label: t("settings.light"), icon: Sun, description: t("settings.lightDesc") },
    { value: "dark" as const, label: t("settings.dark"), icon: Moon, description: t("settings.darkDesc") },
  ];

  const langOptions: { value: Lang; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "🇺🇸" },
    { value: "ru", label: "Русский", flag: "🇷🇺" },
    { value: "uz", label: "O'zbekcha", flag: "🇺🇿" },
  ];

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-3xl font-display font-bold mb-1 text-center md:text-left">
          <span className="gradient-text">{t("settings.title")}</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-8 text-center md:text-left">{t("settings.customize")}</p>

        {/* Profile */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
            <User className="w-4 h-4 text-[#3a6651]" />
            {t("settings.profile")}
          </h2>
          {user ? (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Ismingiz</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ismingiz"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-semibold">Familiyangiz</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Familiyangiz"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-[#3a6651] hover:bg-[#2e5241] text-white text-xs font-bold rounded-xl h-9 px-5 gap-1.5"
                >
                  {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Saqlash
                </Button>
              </div>

              <div className="pt-3 border-t border-border/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("settings.email")}</span>
                  <span className="text-xs font-medium text-foreground">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5" /> {t("settings.plan")}
                  </span>
                  <Badge variant={plan === "Free" ? "secondary" : "default"}>
                    {plan}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" /> {t("settings.credits")}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{creditBalance}</span>
                </div>
              </div>

              {planFeatures.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">{t("settings.planFeatures")}</p>
                  <ul className="space-y-1">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              {t("settings.profileAfterLogin")}
            </p>
          )}
        </div>

        {/* Language */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-display font-semibold mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t("settings.language")}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">{t("settings.chooseLang")}</p>

          <div className="flex flex-col gap-2">
            {langOptions.map((opt) => {
              const isActive = lang === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border-2 transition-all w-full ${isActive
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                    }`}
                >
                  <span className="text-2xl">{opt.flag}</span>
                  <span className="font-medium text-sm">{opt.label}</span>
                  {isActive && <Check className="w-4 h-4 text-primary ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-card p-6">
          <h2 className="font-display font-semibold mb-1">{t("settings.appearance")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("settings.chooseTheme")}</p>

          <div className="grid grid-cols-2 gap-3">
            {themeOptions.map((opt) => {
              const isActive = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${isActive
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                    }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-secondary"
                      }`}
                  >
                    <opt.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
