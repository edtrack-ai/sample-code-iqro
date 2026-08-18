import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, FunctionSquare, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { roadmapApi } from "@/lib/api";
import type { GraphPlotterConfig } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface MathPlaygroundProps {
  lessonId: number;
  latexFormulas?: string[];
  graphPlotter?: GraphPlotterConfig;
  onTaskSubmitted?: () => void;
}

function evaluateExpression(expr: string, xValues: number[]): { x: number; y: number }[] {
  try {
    // Simple expression evaluator for y=mx+b, y=x^2, etc.
    const sanitized = expr
      .replace(/y\s*=\s*/, "")
      .replace(/\^/g, "**")
      .replace(/(\d)(x)/g, "$1*x")
      .replace(/^x/, "1*x");

    return xValues.map((x) => {
      try {
        const y = new Function("x", `return ${sanitized}`)(x);
        return { x, y: isFinite(y) ? y : 0 };
      } catch {
        return { x, y: 0 };
      }
    });
  } catch {
    return xValues.map((x) => ({ x, y: 0 }));
  }
}

export function MathPlayground({
  lessonId,
  latexFormulas,
  graphPlotter,
  onTaskSubmitted,
}: MathPlaygroundProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [expression, setExpression] = useState("y=2*x+1");

  const xRange = graphPlotter?.x_range ?? [-10, 10];
  const xValues = Array.from({ length: 41 }, (_, i) => xRange[0] + (i * (xRange[1] - xRange[0])) / 40);
  const graphData = evaluateExpression(expression, xValues);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await roadmapApi.submitTask(lessonId, answer.trim());
      setResult(res.detail);
      onTaskSubmitted?.();
    } catch {
      setResult("Could not submit answer. Try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card/60">
        <FunctionSquare className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Math Playground
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* LaTeX formulas */}
        {latexFormulas && latexFormulas.length > 0 && (
          <div className="glass-card p-4 space-y-2">
            <h4 className="text-sm font-semibold mb-2">Key Formulas</h4>
            {latexFormulas.map((f, i) => (
              <div key={i} className="bg-secondary/30 rounded-lg p-3">
                <MarkdownRenderer content={`$$${f}$$`} />
              </div>
            ))}
          </div>
        )}

        {/* Graph Plotter */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Graph Plotter</h4>
          </div>
          <div className="mb-3">
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g. y=2*x+1"
              className="font-mono text-sm bg-secondary/50 border-border"
            />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="x"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Answer Submission */}
        <div className="glass-card p-4">
          <h4 className="text-sm font-semibold mb-2">Submit Your Answer</h4>
          <div className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. y=2x+1"
              className="font-mono text-sm bg-secondary/50 border-border"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !answer.trim()}
              className="bg-primary hover:bg-primary/90 gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit
            </Button>
          </div>
          {result && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg"
            >
              {result}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
