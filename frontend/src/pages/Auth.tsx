import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Brain, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authApi, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import BlackLogo from "@/assets/black-logo.svg";
import WhiteLogo from "@/assets/white-logo.svg";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register" | "verify">(
    (searchParams.get("mode") as "login" | "register") || "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const { toast } = useToast();
  const t = useI18n((s) => s.t);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      login(res.user, res.access, res.refresh);
      navigate("/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.body as any)?.non_field_errors?.[0] || (err.body as any)?.detail || t("auth.loginFailed")
        : t("auth.networkError");
      toast({ title: t("auth.loginFailed"), description: String(msg), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) {
      toast({ title: t("auth.error"), description: t("auth.passwordsDontMatch"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ full_name: name, email, password1: password, password2: password2 });
      toast({ title: t("auth.success"), description: t("auth.verificationSent") });
      setMode("verify");
    } catch (err) {
      const msg = err instanceof ApiError
        ? Object.values(err.body).flat().join(", ") || t("auth.registrationFailed")
        : t("auth.networkError");
      toast({ title: t("auth.registrationFailed"), description: String(msg), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.verifyEmail(email, otpCode);
      toast({ title: t("auth.verified"), description: t("auth.emailVerified") });
      setMode("login");
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.body as any)?.detail || t("auth.verificationFailed")
        : t("auth.networkError");
      toast({ title: t("auth.verificationFailed"), description: String(msg), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await authApi.googleLogin(tokenResponse.access_token);
        login(res.user, res.access, res.refresh);
        toast({ title: t("auth.success"), description: "Successfully logged in with Google!" });
        navigate("/dashboard");
      } catch (err) {
        toast({ title: t("auth.loginFailed"), description: "Google authentication failed on server.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast({ title: t("auth.error"), description: "Google Login failed.", variant: "destructive" });
    }
  });

  const handleSocial = (provider: string) => {
    toast({ title: t("auth.comingSoon"), description: `${provider} login is not yet available.` });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth.backToHome")}
        </button>

        <div className="glass-card p-8">
          <div className="flex items-center gap-4 mb-6">
            <img src={BlackLogo} alt="Iqro AI Logo" className="h-10 w-auto dark:hidden" />
            <img src={WhiteLogo} alt="Iqro AI Logo" className="h-10 w-auto hidden dark:block" />
            <div>
              <h1 className="font-display font-bold text-lg">
                {mode === "login" ? t("auth.welcomeBack") : mode === "register" ? t("auth.createAccount") : t("auth.verifyEmail")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {mode === "login"
                  ? t("auth.signInContinue")
                  : mode === "register"
                  ? t("auth.startJourney")
                  : t("auth.enterCode")}
              </p>
            </div>
          </div>

          {/* OTP Verification */}
          {mode === "verify" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-sm">{t("auth.verificationCode")}</Label>
                <Input
                  id="otp"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="h-11 text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" disabled={loading || otpCode.length < 6} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("auth.verify")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button type="button" onClick={() => setMode("login")} className="text-primary hover:underline font-medium">
                  {t("auth.backToLogin")}
                </button>
              </p>
            </form>
          )}

          {/* Login / Register */}
          {mode !== "verify" && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Button variant="outline" onClick={() => handleGoogleLogin()} className="h-11">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>
                <Button variant="outline" onClick={() => handleSocial("Facebook")} className="h-11">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">{t("auth.orContinueWith")}</span>
                <Separator className="flex-1" />
              </div>

              <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">{t("auth.fullName")}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="pl-10 h-11" required />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-10 h-11" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10 pr-10 h-11" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="password2" className="text-sm">{t("auth.confirmPassword")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" className="pl-10 h-11" required />
                    </div>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? t("auth.signInBtn") : t("auth.createAccountBtn")}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
                <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary hover:underline font-medium">
                  {mode === "login" ? t("auth.signUp") : t("auth.signInLink")}
                </button>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
