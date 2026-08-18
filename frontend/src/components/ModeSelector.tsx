import { cn } from "@/lib/utils";
import { Code2, FunctionSquare, Languages, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { LessonMode } from "@/lib/api";

interface ModeSelectorProps {
  selected: LessonMode | null;
  onChange: (mode: LessonMode | null) => void;
  disabled?: boolean;
}

export function ModeSelector({ selected, onChange, disabled }: ModeSelectorProps) {
  const t = useI18n((s) => s.t);

  const modes: { value: LessonMode | null; label: string; icon: React.ReactNode }[] = [
    { value: null, label: t("mode.auto"), icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "MATH", label: t("mode.math"), icon: <FunctionSquare className="w-3.5 h-3.5" /> },
    { value: "LANGUAGE", label: t("mode.language"), icon: <Languages className="w-3.5 h-3.5" /> },
    { value: "CODE", label: t("mode.code"), icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {modes.map(({ value, label, icon }) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
            "border border-border hover:border-primary/40",
            "disabled:opacity-50 disabled:pointer-events-none",
            selected === value
              ? "bg-primary/15 text-primary border-primary/40"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
