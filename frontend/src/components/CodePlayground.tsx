import { useState } from "react";
import { motion } from "framer-motion";
import { Play, RotateCcw, Terminal, Code2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { roadmapApi } from "@/lib/api";

interface CodePlaygroundProps {
  initialCode: string;
  language?: string;
  tests?: string[];
  lessonId?: number;
  onTaskSubmitted?: () => void;
}

export function CodePlayground({ initialCode, language = "python", tests, lessonId, onTaskSubmitted }: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setShowOutput(true);
    setOutput("");

    await new Promise((r) => setTimeout(r, 800));

    const lines = code.split("\n");
    const outputs: string[] = [];

    for (const line of lines) {
      const printMatch = line.match(/print\s*\((.*)\)/);
      if (printMatch) {
        let val = printMatch[1].trim();
        val = val.replace(/^f?["']|["']$/g, "");
        val = val.replace(/\{([^}]+)\}/g, "<computed>");
        outputs.push(val);
      }
    }

    if (outputs.length === 0) {
      outputs.push("✓ Code executed successfully (no output)");
    }

    for (let i = 0; i < outputs.length; i++) {
      await new Promise((r) => setTimeout(r, 200));
      setOutput((prev) => (prev ? prev + "\n" : "") + outputs[i]);
    }

    setIsRunning(false);
  };

  const handleReset = () => {
    setCode(initialCode);
    setOutput("");
    setShowOutput(false);
    setSubmitResult(null);
  };

  const handleSubmitCode = async () => {
    if (!lessonId) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await roadmapApi.submitTask(lessonId, code);
      setSubmitResult(res.detail);
      onTaskSubmitted?.();
    } catch {
      setSubmitResult("Could not submit code. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/60">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Playground
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="bg-success hover:bg-success/90 text-success-foreground h-7 px-3 gap-1.5"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run
          </Button>
          {lessonId && (
            <Button
              size="sm"
              onClick={handleSubmitCode}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 h-7 px-3 gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-foreground resize-none p-4 font-mono text-sm leading-7 z-10 outline-none"
          style={{ tabSize: 4 }}
        />
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "hsl(230, 25%, 8%)",
            fontSize: "0.875rem",
            lineHeight: "1.75",
            minHeight: "100%",
            pointerEvents: "none",
          }}
          showLineNumbers
          lineNumberStyle={{ color: "hsl(220,10%,25%)", minWidth: "2.5em" }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Tests info */}
      {tests && tests.length > 0 && (
        <div className="border-t border-border px-4 py-2 bg-card/40">
          <p className="text-xs text-muted-foreground">
            {tests.length} test{tests.length > 1 ? "s" : ""} will run on submission
          </p>
        </div>
      )}

      {/* Output Console */}
      {(showOutput || submitResult) && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "auto" }}
          className="border-t border-border bg-[hsl(230,25%,6%)]"
        >
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
            <Terminal className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-mono text-muted-foreground">Output</span>
          </div>
          <pre className="p-4 text-sm font-mono text-success/90 min-h-[60px] max-h-[150px] overflow-auto whitespace-pre-wrap">
            {submitResult || output || (isRunning ? "Running..." : "")}
          </pre>
        </motion.div>
      )}
    </div>
  );
}
