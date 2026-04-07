import {
  DEFAULT_RADIUS_PX,
  DEFAULT_SHADOW_ALPHAS_DARK,
  DEFAULT_SHADOW_ALPHAS_LIGHT,
  DEFAULT_SHADOWS_DARK,
  DEFAULT_SHADOWS_LIGHT,
} from "./theme-defaults";

/**
 * Scale shadow intensity by adjusting rgba alpha values.
 * factor: 0 = no shadows, 50 = default, 100 = doubled intensity
 */
export function scaleShadows(
  factor: number,
  isDark: boolean,
): Record<string, string> {
  const defaults = isDark ? DEFAULT_SHADOWS_DARK : DEFAULT_SHADOWS_LIGHT;
  const defaultAlphas = isDark
    ? DEFAULT_SHADOW_ALPHAS_DARK
    : DEFAULT_SHADOW_ALPHAS_LIGHT;
  const multiplier = factor / 50; // 0→0x, 50→1x, 100→2x
  const result: Record<string, string> = {};

  for (const [key, shadow] of Object.entries(defaults)) {
    const baseAlpha = defaultAlphas[key] ?? 0.15;
    const newAlpha = Math.min(1, baseAlpha * multiplier);
    result[key] = shadow.replace(
      /rgba\(([^)]+),\s*([\d.]+)\)/g,
      (_, rgb) => `rgba(${rgb}, ${newAlpha.toFixed(3)})`,
    );
  }

  return result;
}

/**
 * Scale all radius values proportionally.
 * factor: 0 = all 0px (sharp), 50 = default values, 100 = all 999px (pill)
 */
export function scaleRadius(factor: number): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, defaultPx] of Object.entries(DEFAULT_RADIUS_PX)) {
    if (factor <= 50) {
      // 0→0px, 50→default
      const t = factor / 50;
      result[key] = `${Math.round(defaultPx * t)}px`;
    } else {
      // 50→default, 100→999px
      const t = (factor - 50) / 50;
      const value = defaultPx + (999 - defaultPx) * t;
      result[key] = `${Math.round(value)}px`;
    }
  }

  return result;
}

/**
 * Generate a CSS `:root { }` block from a map of variable overrides.
 */
export function generateCSSExport(overrides: Record<string, string>): string {
  if (Object.keys(overrides).length === 0) return "";

  const lines = Object.entries(overrides)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `  ${key}: ${value};`);

  return `:root {\n${lines.join("\n")}\n}`;
}

/**
 * Get the computed value of a CSS variable from the document.
 */
export function getResolvedVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
