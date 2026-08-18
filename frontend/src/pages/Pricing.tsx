import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Zap,
  Check,
  Loader2,
  Coins,
  History,
  Gift,
  Crown,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  paymentsApi,
  type PaymentConfig,
  type Tier,
  type CreditPack,
  type Transaction,
} from "@/lib/api";
import { useAuthStore } from "@/lib/authStore";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

function calculatePayment(
  inputCredits: number,
  config: PaymentConfig
) {
  const pricePerCredit = parseFloat(config.pricing.price_per_credit_usd);
  const exchangeRate = parseFloat(config.exchange_rate.usd_to_uzs);
  const discount = config.user_discount_percent / 100;

  let bonus = 0;
  for (const rule of config.bonus_rules) {
    if (inputCredits >= rule.min_credits) {
      bonus = rule.bonus_credits;
    }
  }

  const totalUsd = inputCredits * pricePerCredit * (1 - discount);
  const totalUzs = totalUsd * exchangeRate;

  return { bonus, totalUsd, totalUzs };
}

const Pricing = () => {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [creditInput, setCreditInput] = useState("50");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { plan, creditBalance } = useAuthStore();
  const { toast } = useToast();
  const t = useI18n((s) => s.t);

  const credits = Math.max(0, parseInt(creditInput) || 0);

  const calc = useMemo(() => {
    if (!config || credits <= 0) return null;
    return calculatePayment(credits, config);
  }, [config, credits]);

  useEffect(() => {
    Promise.all([
      paymentsApi.getConfig(),
      paymentsApi.getTiers(),
      paymentsApi.getPacks(),
      paymentsApi.getHistory(),
    ])
      .then(([c, t, p, h]) => {
        setConfig(c);
        setTiers(t);
        setPacks(p.filter((pk) => pk.is_active));
        setTransactions(h);
      })
      .catch(() =>
        toast({ title: t("pricing.failedLoad"), variant: "destructive" })
      )
      .finally(() => setLoading(false));
  }, []);

  const handlePayment = async (
    payload: { credits?: number; pack_id?: number; tier_id?: number },
    loadingKey: string
  ) => {
    setCheckoutLoading(loadingKey);
    try {
      const res = await paymentsApi.createPayment(payload);
      // Fetch fresh profile so navbar credit balance updates immediately
      const { fetchProfile } = useAuthStore.getState();
      await fetchProfile();

      // Refresh transaction history table
      paymentsApi.getHistory().then(setTransactions).catch(() => {});

      if (res.url) {
        window.location.href = res.url;
      } else {
        toast({
          title: t("pricing.paymentSuccess") || "Hisob to'ldirildi! (Mock)",
          description: res.detail || "Kreditlar muvaffaqiyatli qo'shildi.",
        });
      }
    } catch {
      toast({ title: t("pricing.paymentFailed"), description: t("pricing.tryAgain"), variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleBuyCredits = () => {
    if (credits <= 0) return;
    handlePayment({ credits }, "custom");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-10"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            <span className="gradient-text">{t("pricing.title")}</span>
          </h1>
          <p className="text-muted-foreground">
            {t("pricing.youHave")}{" "}
            <span className="font-semibold text-foreground">{creditBalance}</span>{" "}
            {t("pricing.creditsRemaining")}
          </p>
        </div>

        {/* ── Buy Credits ── */}
        {config && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              {t("pricing.buyCredits")}
            </h2>

            <div className="glass-card p-6 space-y-5">
              {/* Input */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("pricing.howMany")}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={creditInput}
                  onChange={(e) => setCreditInput(e.target.value)}
                  placeholder={t("pricing.enterAmount")}
                  className="max-w-xs text-lg font-semibold"
                />
              </div>

              {/* Live calculation */}
              {calc && credits > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("pricing.credits")}</span>
                    <span className="font-medium">{credits}</span>
                  </div>

                  {calc.bonus > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-primary" /> {t("pricing.bonus")}
                      </span>
                      <span className="font-medium text-primary">
                        +{calc.bonus} {t("pricing.free")}
                      </span>
                    </div>
                  )}

                  {config.user_discount_percent > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("pricing.planDiscount")}</span>
                      <span className="font-medium text-primary">
                        -{config.user_discount_percent}%
                      </span>
                    </div>
                  )}

                  <div className="border-t border-border pt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{t("pricing.total")}</span>
                    <div className="text-right">
                      <p className="text-lg font-display font-bold text-primary">
                        ${calc.totalUsd.toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bonus rules hint */}
              {config.bonus_rules.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.bonus_rules.map((r) => (
                    <Badge
                      key={r.min_credits}
                      variant="secondary"
                      className="text-xs gap-1"
                    >
                      <Gift className="w-3 h-3" />
                      {t("pricing.buy")} {r.min_credits}+ → +{r.bonus_credits} {t("pricing.free")}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={!!checkoutLoading || credits <= 0}
                onClick={handleBuyCredits}
              >
                {checkoutLoading === "custom" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {t("pricing.buy")} {credits > 0 ? credits : ""} {t("pricing.credits")}
              </Button>
            </div>
          </section>
        )}

        {/* ── Credit Packs ── */}
        {packs.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {t("pricing.creditPacks")}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map((pack, i) => (
                <motion.div
                  key={pack.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card p-5 flex flex-col"
                >
                  <h3 className="font-display font-bold text-lg mb-1">{pack.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{pack.description}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-display font-bold">{pack.credits}</span>
                    <span className="text-sm text-muted-foreground">credits</span>
                    <span className="ml-auto text-lg font-semibold">${pack.price}</span>
                  </div>
                  <Button
                    className="w-full mt-auto"
                    disabled={!!checkoutLoading}
                    onClick={() => handlePayment({ pack_id: pack.id }, `pack-${pack.id}`)}
                  >
                    {checkoutLoading === `pack-${pack.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    {t("pricing.buyPack")}
                  </Button>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Subscription Tiers ── */}
        {tiers.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              {t("pricing.subscriptionPlans")}
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier, i) => {
                const isActive =
                  plan.toLowerCase() === tier.name.toLowerCase();
                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`glass-card p-6 flex flex-col ${isActive ? "ring-2 ring-primary" : ""
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-bold text-lg">
                        {tier.name}
                      </h3>
                      {isActive && (
                        <Badge variant="default" className="text-xs">{t("pricing.current")}</Badge>
                      )}
                    </div>

                    <p className="text-2xl font-display font-bold mb-1">
                      ${tier.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>

                    {tier.credit_discount_percent > 0 && (
                      <p className="text-sm text-primary font-medium mb-3">
                        {tier.credit_discount_percent}% {t("pricing.offCredits")}
                      </p>
                    )}

                    {tier.features.length > 0 && (
                      <ul className="space-y-1.5 mb-5 flex-1">
                        {tier.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-start gap-2 text-sm text-muted-foreground"
                          >
                            <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      variant={isActive ? "secondary" : "default"}
                      className="w-full mt-auto"
                      disabled={isActive || !!checkoutLoading}
                      onClick={() => handlePayment({ tier_id: tier.id }, `tier-${tier.id}`)}
                    >
                      {isActive ? (
                        t("pricing.active")
                      ) : checkoutLoading === `tier-${tier.id}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {t("pricing.subscribe")} <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Transaction History ── */}
        {transactions.length > 0 && (
          <section>
            <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {t("pricing.recentPurchases")}
            </h2>
            <div className="glass-card divide-y divide-border">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {tx.transaction_type === "subscription"
                        ? t("pricing.subscription")
                        : t("pricing.creditPurchase")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {tx.amount}{" "}
                      <span className="text-xs text-muted-foreground uppercase">
                        {tx.currency}
                      </span>
                    </p>
                    <p
                      className={`text-xs font-medium ${tx.status === "completed"
                          ? "text-primary"
                          : "text-muted-foreground"
                        }`}
                    >
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
};

export default Pricing;
