import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ComingSoonOverlayProps {
  label?: string;
  children: React.ReactNode;
}

export function ComingSoonOverlay({ label, children }: ComingSoonOverlayProps) {
  const t = useI18n((s) => s.t);
  const displayLabel = label || t("flashcards.comingSoon");

  return (
    <div className="relative">
      <div className="blur-[3px] pointer-events-none select-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-display font-semibold text-foreground">{displayLabel}</span>
        </div>
      </div>
    </div>
  );
}
