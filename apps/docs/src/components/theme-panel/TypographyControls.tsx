"use client";

import { Slider } from "ghost-ui";
import { useCallback, useState } from "react";
import { useThemePanel } from "@/contexts/ThemePanelContext";

// Default values for scaling (50 = default)
const WEIGHT_MAP: Record<number, Record<string, string>> = {
  0: {
    "--heading-display-font-weight": "300",
    "--heading-section-font-weight": "400",
    "--heading-sub-font-weight": "400",
    "--heading-card-font-weight": "400",
  },
  25: {
    "--heading-display-font-weight": "600",
    "--heading-section-font-weight": "500",
    "--heading-sub-font-weight": "500",
    "--heading-card-font-weight": "500",
  },
  50: {
    "--heading-display-font-weight": "900",
    "--heading-section-font-weight": "700",
    "--heading-sub-font-weight": "700",
    "--heading-card-font-weight": "600",
  },
  75: {
    "--heading-display-font-weight": "900",
    "--heading-section-font-weight": "900",
    "--heading-sub-font-weight": "700",
    "--heading-card-font-weight": "700",
  },
  100: {
    "--heading-display-font-weight": "900",
    "--heading-section-font-weight": "900",
    "--heading-sub-font-weight": "900",
    "--heading-card-font-weight": "900",
  },
};

function interpolateWeight(factor: number): Record<string, string> {
  const keys = Object.keys(WEIGHT_MAP)
    .map(Number)
    .sort((a, b) => a - b);
  const lower = keys.filter((k) => k <= factor).pop() ?? 0;
  const upper = keys.find((k) => k >= factor) ?? 100;

  if (lower === upper) return WEIGHT_MAP[lower];

  // Snap to nearest weight bracket
  const t = (factor - lower) / (upper - lower);
  return t < 0.5 ? WEIGHT_MAP[lower] : WEIGHT_MAP[upper];
}

const TRACKING_VARS = [
  "--heading-display-letter-spacing",
  "--heading-section-letter-spacing",
  "--heading-sub-letter-spacing",
  "--heading-card-letter-spacing",
];

const DEFAULT_TRACKING = [-0.05, -0.035, -0.02, -0.01];

export function TypographyControls() {
  const { setVariables } = useThemePanel();
  const [weightScale, setWeightScale] = useState(50);
  const [trackingScale, setTrackingScale] = useState(50);

  const handleWeightChange = useCallback(
    (value: number) => {
      setWeightScale(value);
      setVariables(interpolateWeight(value));
    },
    [setVariables],
  );

  const handleTrackingChange = useCallback(
    (value: number) => {
      setTrackingScale(value);
      // 0 = loose (0em), 50 = default, 100 = very tight (2x default)
      const multiplier = value / 50;
      const vars: Record<string, string> = {};
      TRACKING_VARS.forEach((key, i) => {
        vars[key] = `${(DEFAULT_TRACKING[i] * multiplier).toFixed(3)}em`;
      });
      setVariables(vars);
    },
    [setVariables],
  );

  const weightLabel =
    weightScale < 20
      ? "Light"
      : weightScale < 45
        ? "Medium"
        : weightScale < 65
          ? "Default"
          : weightScale < 85
            ? "Bold"
            : "Black";

  const trackingLabel =
    trackingScale < 15
      ? "Loose"
      : trackingScale < 40
        ? "Normal"
        : trackingScale < 60
          ? "Default"
          : trackingScale < 85
            ? "Tight"
            : "Very Tight";

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
            Weight
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            {weightLabel}
          </span>
        </div>
        <Slider
          value={[weightScale]}
          onValueChange={([v]) => handleWeightChange(v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

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
            Letter Spacing
          </p>
          <span className="text-xs text-muted-foreground font-mono">
            {trackingLabel}
          </span>
        </div>
        <Slider
          value={[trackingScale]}
          onValueChange={([v]) => handleTrackingChange(v)}
          min={0}
          max={100}
          step={1}
        />
      </div>

      {/* Live preview */}
      <div className="space-y-2 pt-2">
        <p className="text-xs text-muted-foreground">Preview</p>
        <div className="space-y-1 overflow-hidden">
          <p
            className="font-display truncate"
            style={{
              fontSize: "var(--heading-card-font-size)",
              lineHeight: "var(--heading-card-line-height)",
              letterSpacing: "var(--heading-card-letter-spacing)",
              fontWeight: "var(--heading-card-font-weight)",
            }}
          >
            Heading
          </p>
          <p
            className="text-muted-foreground"
            style={{
              fontSize: "var(--body-reading-size)",
              lineHeight: "var(--body-reading-line-height)",
              letterSpacing: "var(--body-reading-letter-spacing)",
            }}
          >
            Body text sample for preview.
          </p>
        </div>
      </div>
    </div>
  );
}
