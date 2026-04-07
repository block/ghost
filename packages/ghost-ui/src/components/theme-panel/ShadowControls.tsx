"use client";

import { Slider } from "@/components/ui/slider";
import { useThemePanel } from "@/contexts/ThemePanelContext";

export function ShadowControls() {
  const { shadowScale, setShadowScale } = useThemePanel();

  const label =
    shadowScale < 5
      ? "None"
      : shadowScale < 30
        ? "Subtle"
        : shadowScale < 60
          ? "Default"
          : shadowScale < 85
            ? "Prominent"
            : "Heavy";

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
            Shadow Intensity
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            {label}
          </span>
        </div>
        <Slider
          value={[shadowScale]}
          onValueChange={([v]) => setShadowScale(v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Live preview */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Preview</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="aspect-square bg-background border border-border rounded-card shadow-mini flex items-center justify-center text-[9px] text-muted-foreground">
            Mini
          </div>
          <div className="aspect-square bg-background border border-border rounded-card shadow-card flex items-center justify-center text-[9px] text-muted-foreground">
            Card
          </div>
          <div className="aspect-square bg-background border border-border rounded-card shadow-elevated flex items-center justify-center text-[9px] text-muted-foreground">
            Elevated
          </div>
        </div>
      </div>
    </div>
  );
}
