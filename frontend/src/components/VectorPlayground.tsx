import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VectorPlayground() {
  const [vectorA, setVectorA] = useState({ x: 3, y: 4 });
  const [scalar, setScalar] = useState(2);

  const scaledVector = { x: vectorA.x * scalar, y: vectorA.y * scalar };
  const magnitude = Math.sqrt(vectorA.x ** 2 + vectorA.y ** 2).toFixed(2);
  const scaledMagnitude = Math.sqrt(scaledVector.x ** 2 + scaledVector.y ** 2).toFixed(2);

  const vectorLine = [
    { x: 0, y: 0 },
    { x: vectorA.x, y: vectorA.y },
  ];

  const scaledLine = [
    { x: 0, y: 0 },
    { x: scaledVector.x, y: scaledVector.y },
  ];

  const maxVal = Math.max(Math.abs(scaledVector.x), Math.abs(scaledVector.y), Math.abs(vectorA.x), Math.abs(vectorA.y), 5) + 2;

  return (
    <div className="space-y-6">
      <div className="glass-card p-4">
        <h4 className="text-sm font-display font-semibold mb-4">Vector Visualization</h4>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 15% 20%)" />
              <XAxis
                type="number"
                domain={[-maxVal, maxVal]}
                tick={{ fill: "hsl(220 10% 55%)", fontSize: 11 }}
                stroke="hsl(230 15% 20%)"
              />
              <YAxis
                type="number"
                domain={[-maxVal, maxVal]}
                tick={{ fill: "hsl(220 10% 55%)", fontSize: 11 }}
                stroke="hsl(230 15% 20%)"
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(230 20% 12%)",
                  border: "1px solid hsl(230 15% 25%)",
                  borderRadius: "8px",
                  color: "hsl(220 20% 95%)",
                  fontSize: 12,
                }}
              />
              <Scatter name="Original" data={vectorLine} fill="hsl(151 35% 60%)" line={{ stroke: "hsl(151 35% 60%)", strokeWidth: 2 }} />
              <Scatter name="Scaled" data={scaledLine} fill="hsl(165 40% 55%)" line={{ stroke: "hsl(165 40% 55%)", strokeWidth: 2, strokeDasharray: "5 5" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-4 space-y-4">
        <h4 className="text-sm font-display font-semibold">Controls</h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Vector X</label>
            <Input
              type="number"
              value={vectorA.x}
              onChange={(e) => setVectorA({ ...vectorA, x: Number(e.target.value) })}
              className="bg-secondary/50 border-border text-foreground h-9"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Vector Y</label>
            <Input
              type="number"
              value={vectorA.y}
              onChange={(e) => setVectorA({ ...vectorA, y: Number(e.target.value) })}
              className="bg-secondary/50 border-border text-foreground h-9"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Scalar Multiplier</label>
          <Input
            type="number"
            step="0.5"
            value={scalar}
            onChange={(e) => setScalar(Number(e.target.value))}
            className="bg-secondary/50 border-border text-foreground h-9"
          />
        </div>
      </div>

      {/* Info */}
      <div className="glass-card p-4 space-y-2">
        <h4 className="text-sm font-display font-semibold">Properties</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-primary/10">
            <p className="text-xs text-muted-foreground">Original Vector</p>
            <p className="font-mono text-primary">[{vectorA.x}, {vectorA.y}]</p>
            <p className="text-xs text-muted-foreground mt-1">‖v‖ = {magnitude}</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/10">
            <p className="text-xs text-muted-foreground">Scaled Vector</p>
            <p className="font-mono text-accent">[{scaledVector.x}, {scaledVector.y}]</p>
            <p className="text-xs text-muted-foreground mt-1">‖v‖ = {scaledMagnitude}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
