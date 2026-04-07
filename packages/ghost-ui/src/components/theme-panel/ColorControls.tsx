"use client";

import { useEffect, useState } from "react";
import { useThemePanel } from "@/contexts/ThemePanelContext";
import {
  DEFAULT_COLORS_DARK,
  DEFAULT_COLORS_LIGHT,
} from "@/lib/theme-defaults";
import { useTheme } from "@/lib/theme-provider";
import { getResolvedVariable } from "@/lib/theme-utils";
import { ColorSwatch } from "./ColorSwatch";

interface ColorGroup {
  label: string;
  variables: { key: string; label: string }[];
}

const COLOR_GROUPS: ColorGroup[] = [
  {
    label: "Accent",
    variables: [{ key: "--background-accent", label: "Accent" }],
  },
  {
    label: "Surfaces",
    variables: [
      { key: "--background-default", label: "Default" },
      { key: "--background-alt", label: "Alt" },
      { key: "--background-muted", label: "Muted" },
      { key: "--background-medium", label: "Medium" },
      { key: "--background-inverse", label: "Inverse" },
    ],
  },
  {
    label: "Text",
    variables: [
      { key: "--text-default", label: "Default" },
      { key: "--text-muted", label: "Muted" },
      { key: "--text-alt", label: "Alt" },
      { key: "--text-inverse", label: "Inverse" },
    ],
  },
  {
    label: "Borders",
    variables: [
      { key: "--border-default", label: "Default" },
      { key: "--border-input", label: "Input" },
      { key: "--border-card", label: "Card" },
      { key: "--border-strong", label: "Strong" },
    ],
  },
  {
    label: "Feedback",
    variables: [
      { key: "--background-danger", label: "Danger" },
      { key: "--background-success", label: "Success" },
      { key: "--background-warning", label: "Warning" },
      { key: "--background-info", label: "Info" },
    ],
  },
  {
    label: "Charts",
    variables: [
      { key: "--chart-1", label: "Chart 1" },
      { key: "--chart-2", label: "Chart 2" },
      { key: "--chart-3", label: "Chart 3" },
      { key: "--chart-4", label: "Chart 4" },
      { key: "--chart-5", label: "Chart 5" },
    ],
  },
];

// Linked variables: when accent changes, also update these
const ACCENT_LINKED = ["--border-accent", "--text-accent"];

export function ColorControls() {
  const { overrides, setVariable, setVariables } = useThemePanel();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const defaults = isDark ? DEFAULT_COLORS_DARK : DEFAULT_COLORS_LIGHT;

  // Track resolved values for initial display
  const [resolved, setResolved] = useState<Record<string, string>>({});

  useEffect(() => {
    // Read current computed values for all color variables
    const vals: Record<string, string> = {};
    for (const group of COLOR_GROUPS) {
      for (const v of group.variables) {
        const computed = getResolvedVariable(v.key);
        if (computed) {
          vals[v.key] = rgbToHex(computed) || defaults[v.key] || "#000000";
        }
      }
    }
    setResolved(vals);
  }, [overrides, isDark]); // eslint-disable-line react-hooks/exhaustive-deps

  function getColor(key: string): string {
    return overrides[key] || resolved[key] || defaults[key] || "#000000";
  }

  function handleChange(key: string, value: string) {
    if (key === "--background-accent") {
      // Also update linked accent variables
      const linked: Record<string, string> = { [key]: value };
      for (const k of ACCENT_LINKED) {
        linked[k] = value;
      }
      setVariables(linked);
    } else {
      setVariable(key, value);
    }
  }

  return (
    <div className="space-y-5">
      {COLOR_GROUPS.map((group) => (
        <div key={group.label}>
          <p
            className="font-display uppercase text-muted-foreground mb-2"
            style={{
              fontSize: "var(--label-font-size)",
              letterSpacing: "var(--label-letter-spacing)",
              fontWeight: "var(--label-font-weight)",
            }}
          >
            {group.label}
          </p>
          <div className="space-y-1.5">
            {group.variables.map((v) => (
              <ColorSwatch
                key={v.key}
                value={getColor(v.key)}
                onChange={(val) => handleChange(v.key, val)}
                label={v.label}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function rgbToHex(rgb: string): string | null {
  // Handle hex passthrough
  if (rgb.startsWith("#")) return rgb;

  // Handle "rgb(r, g, b)" or "r g b" format
  const match = rgb.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!match) return null;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
