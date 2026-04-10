"use client";

import { cn } from "@/lib/utils";

interface Dimension {
  dimension: string;
  distance: number;
  description: string;
}

interface ComparisonData {
  distance: number;
  dimensions: Record<string, Dimension>;
  summary: string;
  sourceId: string;
  targetId: string;
}

const dimensionLabels: Record<string, string> = {
  palette: "Palette",
  spacing: "Spacing",
  typography: "Typography",
  surfaces: "Surfaces",
  architecture: "Architecture",
};

const dimensionWeights: Record<string, number> = {
  palette: 0.3,
  spacing: 0.2,
  typography: 0.2,
  surfaces: 0.15,
  architecture: 0.15,
};

function distanceColor(distance: number): string {
  if (distance < 0.15) return "bg-emerald-500";
  if (distance < 0.3) return "bg-amber-500";
  return "bg-red-500";
}

function distanceTextColor(distance: number): string {
  if (distance < 0.15) return "text-emerald-500";
  if (distance < 0.3) return "text-amber-500";
  return "text-red-500";
}

export function CompareView({ comparison }: { comparison: ComparisonData }) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border-card p-6 text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Overall Distance
        </div>
        <div
          className={cn(
            "text-5xl font-display font-bold tracking-tight",
            distanceTextColor(comparison.distance),
          )}
        >
          {(comparison.distance * 100).toFixed(1)}%
        </div>
        <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">
          {comparison.summary}
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-[120px_1fr_60px_60px] gap-3 text-xs uppercase tracking-widest text-muted-foreground px-1">
          <div>Dimension</div>
          <div>Distance</div>
          <div className="text-right">Weight</div>
          <div className="text-right">Score</div>
        </div>

        {Object.entries(comparison.dimensions).map(([key, dim]) => (
          <div
            key={key}
            className="grid grid-cols-[120px_1fr_60px_60px] gap-3 items-center rounded-lg border border-border-card p-3"
          >
            <div className="font-medium text-sm">
              {dimensionLabels[key] ?? key}
            </div>

            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    distanceColor(dim.distance),
                  )}
                  style={{ width: `${Math.min(dim.distance * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {dim.description}
              </p>
            </div>

            <div className="text-right text-sm text-muted-foreground">
              {((dimensionWeights[key] ?? 0) * 100).toFixed(0)}%
            </div>

            <div
              className={cn(
                "text-right text-sm font-bold font-mono",
                distanceTextColor(dim.distance),
              )}
            >
              {(dim.distance * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-emerald-500" />
          &lt; 15% aligned
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-amber-500" />
          15-30% moderate
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-red-500" />
          &gt; 30% diverged
        </div>
      </div>
    </div>
  );
}
