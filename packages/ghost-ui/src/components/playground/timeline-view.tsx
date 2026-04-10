"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DriftVelocity {
  dimension: string;
  rate: number;
  direction: "converging" | "diverging" | "stable";
  windowDays: number;
}

interface TemporalData {
  distance: number;
  trajectory: "converging" | "diverging" | "stable" | "oscillating";
  velocity: DriftVelocity[];
  daysSinceAck: number | null;
  exceedsAckedBounds: boolean;
  exceedingDimensions: string[];
  dimensions: Record<
    string,
    { dimension: string; distance: number; description: string }
  >;
}

const dimensionLabels: Record<string, string> = {
  palette: "Palette",
  spacing: "Spacing",
  typography: "Typography",
  surfaces: "Surfaces",
  architecture: "Architecture",
};

function trajectoryColor(trajectory: string): string {
  switch (trajectory) {
    case "converging":
      return "text-emerald-500";
    case "diverging":
      return "text-red-500";
    case "oscillating":
      return "text-amber-500";
    default:
      return "text-muted-foreground";
  }
}

function directionIcon(direction: string): string {
  switch (direction) {
    case "converging":
      return "\u2198";
    case "diverging":
      return "\u2197";
    default:
      return "\u2192";
  }
}

export function TimelineView({ temporal }: { temporal: TemporalData }) {
  return (
    <div className="space-y-8">
      {/* Trajectory header */}
      <div className="rounded-xl border border-border-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Trajectory
            </div>
            <div
              className={cn(
                "text-3xl font-display font-bold capitalize",
                trajectoryColor(temporal.trajectory),
              )}
            >
              {temporal.trajectory}
            </div>
          </div>

          <div className="text-right">
            {temporal.daysSinceAck !== null && (
              <div className="text-sm text-muted-foreground">
                Last ack:{" "}
                <span className="font-medium text-foreground">
                  {temporal.daysSinceAck} days ago
                </span>
              </div>
            )}
            {temporal.exceedsAckedBounds && (
              <Badge variant="destructive" className="mt-1">
                Exceeds acked bounds
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Velocity per dimension */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Drift Velocity (per dimension)
        </h3>

        <div className="grid gap-2">
          {temporal.velocity.map((v) => {
            const dim = temporal.dimensions[v.dimension];
            const exceeds = temporal.exceedingDimensions.includes(v.dimension);

            return (
              <div
                key={v.dimension}
                className={cn(
                  "grid grid-cols-[120px_40px_1fr_80px] gap-3 items-center rounded-lg border p-3",
                  exceeds
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border-card",
                )}
              >
                <div className="font-medium text-sm">
                  {dimensionLabels[v.dimension] ?? v.dimension}
                </div>

                <div className="text-lg" title={v.direction}>
                  {directionIcon(v.direction)}
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        v.direction === "converging"
                          ? "bg-emerald-500"
                          : v.direction === "diverging"
                            ? "bg-red-500"
                            : "bg-muted-foreground/30",
                      )}
                      style={{
                        width: `${Math.min((dim?.distance ?? 0) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dim?.description ?? ""}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono text-muted-foreground">
                    {(v.rate * 100).toFixed(2)}%/day
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.windowDays}d window
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exceeding dimensions callout */}
      {temporal.exceedingDimensions.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="text-sm font-medium text-red-500 mb-2">
            Dimensions exceeding acked bounds
          </div>
          <div className="flex gap-2">
            {temporal.exceedingDimensions.map((d) => (
              <Badge key={d} variant="destructive">
                {dimensionLabels[d] ?? d}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            These dimensions have drifted beyond the tolerance set in the last
            acknowledgment. Run <code className="font-mono">ghost ack</code> to
            update or{" "}
            <code className="font-mono">ghost diverge</code> to mark as
            intentional.
          </p>
        </div>
      )}
    </div>
  );
}
