import type { SemanticColor } from "../types.js";

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace("#", "");
  let r: number;
  let g: number;
  let b: number;

  if (cleaned.length === 3) {
    r = Number.parseInt(cleaned[0] + cleaned[0], 16);
    g = Number.parseInt(cleaned[1] + cleaned[1], 16);
    b = Number.parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = Number.parseInt(cleaned.slice(0, 2), 16);
    g = Number.parseInt(cleaned.slice(2, 4), 16);
    b = Number.parseInt(cleaned.slice(4, 6), 16);
  } else {
    return null;
  }

  return [r, g, b];
}

// Parse rgb()/rgba() to RGB
function parseRgbFunction(value: string): [number, number, number] | null {
  const match = value.match(/rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// Convert sRGB to linear RGB
function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

// Convert linear RGB to OKLCH via OKLab
// Simplified implementation based on the OKLCH spec
function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // sRGB to LMS (using OKLab matrix)
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );

  // LMS to OKLab
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bVal = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bVal * bVal);
  let H = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return [
    Math.round(L * 1000) / 1000,
    Math.round(C * 1000) / 1000,
    Math.round(H * 10) / 10,
  ];
}

export function parseColorToOklch(
  value: string,
): [number, number, number] | null {
  const trimmed = value.trim();

  // Try hex
  if (trimmed.startsWith("#")) {
    const rgb = hexToRgb(trimmed);
    if (rgb) return rgbToOklch(...rgb);
  }

  // Try rgb()/rgba()
  if (trimmed.startsWith("rgb")) {
    const rgb = parseRgbFunction(trimmed);
    if (rgb) return rgbToOklch(...rgb);
  }

  // Try oklch() directly
  const oklchMatch = trimmed.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (oklchMatch) {
    return [
      Number(oklchMatch[1]),
      Number(oklchMatch[2]),
      Number(oklchMatch[3]),
    ];
  }

  return null;
}

export function colorToSemanticColor(
  role: string,
  value: string,
): SemanticColor {
  const oklch = parseColorToOklch(value);
  return { role, value, oklch: oklch ?? undefined };
}

export function classifySaturation(
  colors: SemanticColor[],
): "muted" | "vibrant" | "mixed" {
  const chromas = colors.map((c) => c.oklch?.[1] ?? 0).filter((c) => c > 0);

  if (chromas.length === 0) return "muted";

  const avg = chromas.reduce((a, b) => a + b, 0) / chromas.length;
  if (avg > 0.15) return "vibrant";
  if (avg < 0.05) return "muted";
  return "mixed";
}

export function classifyContrast(
  colors: SemanticColor[],
): "high" | "moderate" | "low" {
  const lightnesses = colors
    .map((c) => c.oklch?.[0] ?? 0.5)
    .filter((_, _i, arr) => arr.length > 1);

  if (lightnesses.length < 2) return "moderate";

  const min = Math.min(...lightnesses);
  const max = Math.max(...lightnesses);
  const range = max - min;

  if (range > 0.7) return "high";
  if (range < 0.3) return "low";
  return "moderate";
}
