"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Dimension {
  dimension: string;
  distance: number;
  description: string;
}

interface ComparisonData {
  distance: number;
  dimensions: Record<string, Dimension>;
  sourceId: string;
  targetId: string;
}

const chartConfig = {
  registry: {
    label: "Registry",
    color: "hsl(var(--primary))",
  },
  consumer: {
    label: "Consumer",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const dimensionLabels: Record<string, string> = {
  palette: "Palette",
  spacing: "Spacing",
  typography: "Typography",
  surfaces: "Surfaces",
  architecture: "Architecture",
};

export function FingerprintRadar({
  comparison,
}: {
  comparison: ComparisonData;
}) {
  const data = Object.entries(comparison.dimensions).map(([key, dim]) => ({
    dimension: dimensionLabels[key] ?? key,
    registry: 1,
    consumer: Math.max(0, 1 - dim.distance),
    description: dim.description,
  }));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl font-display font-bold tracking-tight">
          {(comparison.distance * 100).toFixed(1)}%
        </div>
        <p className="text-sm text-muted-foreground mt-1">Overall Distance</p>
      </div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[400px]"
      >
        <RadarChart data={data}>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent />}
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <PolarGrid stroke="hsl(var(--border))" />
          <Radar
            name="Registry"
            dataKey="registry"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Radar
            name="Consumer"
            dataKey="consumer"
            stroke="hsl(var(--chart-3))"
            fill="hsl(var(--chart-3))"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ChartContainer>

      <div className="grid grid-cols-5 gap-3">
        {Object.entries(comparison.dimensions).map(([key, dim]) => (
          <div
            key={key}
            className="rounded-lg border border-border-card p-3 text-center"
          >
            <div className="text-xs text-muted-foreground mb-1">
              {dimensionLabels[key] ?? key}
            </div>
            <div className="text-lg font-bold font-display">
              {(dim.distance * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
