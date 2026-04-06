"use client";

import { Slider } from "@/components/ui/slider";
import { useThemePanel } from "@/contexts/ThemePanelContext";

export function RadiusControls() {
  const { radiusScale, setRadiusScale } = useThemePanel();

  const label =
    radiusScale < 10
      ? "Sharp"
      : radiusScale < 40
        ? "Subtle"
        : radiusScale < 60
          ? "Default"
          : radiusScale < 85
            ? "Rounded"
            : "Pill";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p
            className="font-display uppercase text-muted-foreground"
            style={{
              fontSize: "var(--label-font-size)",
              letterSpacing: "var(--label-letter-spacing)",
              fontWeight: "var(--label-font-weight)",
            }}
          >
            Corner Radius
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            {label}
          </span>
        </div>
        <Slider
          value={[radiusScale]}
          onValueChange={([v]) => setRadiusScale(v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Live preview */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Preview</p>
        <div className="flex items-center gap-3">
          <div className="w-20 h-14 bg-muted border border-border rounded-card flex items-center justify-center text-[10px] text-muted-foreground">
            Card
          </div>
          <button className="h-9 px-4 bg-primary text-primary-foreground text-xs font-medium rounded-button">
            Button
          </button>
          <div className="h-8 w-24 border border-input rounded-input bg-background flex items-center px-2 text-[10px] text-muted-foreground">
            Input
          </div>
        </div>
      </div>
    </div>
  );
}
