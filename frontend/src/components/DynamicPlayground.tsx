import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, FlaskConical, CheckCircle2, XCircle, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { roadmapApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";

interface ValidateResult {
  is_correct: boolean;
  score: number;
  feedback: string;
}

interface DynamicPlaygroundProps {
  htmlBundle: string;
  lessonId: number;
  onTaskSubmitted?: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
}

export function DynamicPlayground({ htmlBundle, lessonId, onTaskSubmitted, onRegenerate, regenerating }: DynamicPlaygroundProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();
  const t = useI18n((s) => s.t);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const handleSubmit = async () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      toast({ title: t("common.error"), description: t("playground.notReady"), variant: "destructive" });
      return;
    }

    let validateResult: ValidateResult;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = iframe.contentWindow as any;
      if (typeof win.validateAnswer !== "function") {
        toast({ title: t("common.error"), description: t("playground.noValidation"), variant: "destructive" });
        return;
      }
      validateResult = win.validateAnswer();
    } catch {
      toast({ title: t("common.error"), description: t("playground.couldNotValidate"), variant: "destructive" });
      return;
    }

    setResult(validateResult);
    setSubmitting(true);

    try {
      await roadmapApi.submitTask(lessonId, {
        task_index: 0,
        is_correct: validateResult.is_correct,
        score: validateResult.score,
        user_answer: "dynamic_playground_submission",
      });
      toast({
        title: validateResult.is_correct ? t("playground.correct") : t("playground.notQuite"),
        description: validateResult.feedback,
      });
      onTaskSubmitted?.();
    } catch {
      toast({ title: t("playground.submissionFailed"), description: t("playground.couldNotSave"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            {t("playground.interactiveLab")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button

            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title={isFullscreen ? t("playground.exitFullScreen") : t("playground.fullScreen")}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || !iframeLoaded}
            className="bg-primary hover:bg-primary/90 h-7 px-3 gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {t("playground.submit")}
          </Button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="flex-1 min-h-0 relative bg-background">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t("playground.loading")}</p>
          </div>
        )}
        <iframe
          ref={iframeRef}
          srcDoc={htmlBundle}
          onLoad={handleIframeLoad}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0"
          style={{ height: isFullscreen ? "100%" : "calc(100vh - 250px)", minHeight: "300px" }}
          title="Interactive Playground"
        />
      </div>

      {/* Result feedback */}
      {result && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border bg-card/60 px-4 py-3 shrink-0"
        >
          <div className="flex items-start gap-2">
            {result.is_correct ? (
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {result.is_correct ? t("playground.correct") : t("playground.incorrect")} — {t("playground.score")}: {result.score}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{result.feedback}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
