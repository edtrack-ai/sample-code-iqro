import { AlertCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

interface CreditAlertProps {
  message?: string;
  onDismiss?: () => void;
}

export function CreditAlert({ message, onDismiss }: CreditAlertProps) {
  const navigate = useNavigate();
  const t = useI18n((s) => s.t);

  return (
    <div className="mx-auto max-w-2xl w-full animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
        <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-destructive/10">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-0.5">
            {t("creditAlert.outOfCredits")}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message || t("creditAlert.defaultMsg")}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/pricing")}
          className="shrink-0 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Zap className="w-3.5 h-3.5" />
          {t("creditAlert.topUp")}
        </Button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-muted-foreground hover:text-foreground text-xs p-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
