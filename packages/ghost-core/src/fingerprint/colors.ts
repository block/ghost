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

// Parse hsl()/hsla() to RGB
function parseHslFunction(value: string): [number, number, number] | null {
  const match = value.match(
    /hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%?\s*[,\s]\s*([\d.]+)%?/,
  );
  if (!match) return null;

  let h = Number(match[1]) % 360;
  if (h < 0) h += 360;
  const s = Math.min(Number(match[2]), 100) / 100;
  const l = Math.min(Number(match[3]), 100) / 100;

  // HSL to RGB conversion
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1: number;
  let g1: number;
  let b1: number;

  if (h < 60) {
    [r1, g1, b1] = [c, x, 0];
  } else if (h < 120) {
    [r1, g1, b1] = [x, c, 0];
  } else if (h < 180) {
    [r1, g1, b1] = [0, c, x];
  } else if (h < 240) {
    [r1, g1, b1] = [0, x, c];
  } else if (h < 300) {
    [r1, g1, b1] = [x, 0, c];
  } else {
    [r1, g1, b1] = [c, 0, x];
  }

  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ];
}

// Common CSS named colors (top 20 most used in real projects)
const CSS_NAMED_COLORS: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  navy: [0, 0, 128],
  teal: [0, 128, 128],
  coral: [255, 127, 80],
  salmon: [250, 128, 114],
  tomato: [255, 99, 71],
  gold: [255, 215, 0],
  silver: [192, 192, 192],
  maroon: [128, 0, 0],
  aqua: [0, 255, 255],
  cyan: [0, 255, 255],
  lime: [0, 255, 0],
  indigo: [75, 0, 130],
  violet: [238, 130, 238],
  crimson: [220, 20, 60],
  magenta: [255, 0, 255],
  turquoise: [64, 224, 208],
  ivory: [255, 255, 240],
  beige: [245, 245, 220],
  khaki: [240, 230, 140],
};

// CSS system color defaults (mapped to sensible RGB values)
const SYSTEM_COLORS: Record<string, [number, number, number]> = {
  canvas: [255, 255, 255],
  canvastext: [0, 0, 0],
  linktext: [0, 0, 238],
  visitedtext: [85, 26, 139],
  activetext: [255, 0, 0],
  buttonface: [240, 240, 240],
  buttontext: [0, 0, 0],
  buttonborder: [118, 118, 118],
  field: [255, 255, 255],
  fieldtext: [0, 0, 0],
  highlight: [0, 120, 215],
  highlighttext: [255, 255, 255],
  graytext: [109, 109, 109],
  mark: [255, 255, 0],
  marktext: [0, 0, 0],
};

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

// Parse color-mix() in OKLCH space
function parseColorMix(value: string): [number, number, number] | null {
  const match = value.match(
    /color-mix\(\s*in\s+oklch\s*,\s*(.+?)\s+(\d+)%\s*,\s*(.+?)(?:\s+(\d+)%)?\s*\)/,
  );
  if (!match) return null;

  const color1 = parseColorToOklch(match[1]);
  const color2 = parseColorToOklch(match[3]);
  if (!color1 || !color2) return null;

  const pct1 = Number(match[2]) / 100;
  const pct2 = match[4] ? Number(match[4]) / 100 : 1 - pct1;

  // Normalize percentages
  const total = pct1 + pct2;
  const w1 = pct1 / total;
  const w2 = pct2 / total;

  // Interpolate hue via shortest arc
  const h1 = color1[2];
  const h2 = color2[2];
  let hDiff = h2 - h1;
  if (hDiff > 180) hDiff -= 360;
  if (hDiff < -180) hDiff += 360;
  const hue = (((h1 + w2 * hDiff) % 360) + 360) % 360;

  return [
    Math.round((color1[0] * w1 + color2[0] * w2) * 1000) / 1000,
    Math.round((color1[1] * w1 + color2[1] * w2) * 1000) / 1000,
    Math.round(hue * 10) / 10,
  ];
}

export function parseColorToOklch(
  value: string,
): [number, number, number] | null {
  const trimmed = value.trim().toLowerCase();

  // Skip CSS variables and transparent
  if (
    trimmed.startsWith("var(") ||
    trimmed === "transparent" ||
    trimmed === "currentcolor"
  ) {
    return null;
  }

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

  // Try hsl()/hsla()
  if (trimmed.startsWith("hsl")) {
    const rgb = parseHslFunction(trimmed);
    if (rgb) return rgbToOklch(...rgb);
  }

  // Try oklch() directly — handle both decimal and percentage lightness
  const oklchMatch = trimmed.match(
    /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/,
  );
  if (oklchMatch) {
    let L = Number(oklchMatch[1]);
    if (oklchMatch[2] === "%") L /= 100;
    return [L, Number(oklchMatch[3]), Number(oklchMatch[4])];
  }

  // Try color-mix(in oklch, ...)
  if (trimmed.startsWith("color-mix(")) {
    return parseColorMix(trimmed);
  }

  // Try CSS system colors
  const systemRgb = SYSTEM_COLORS[trimmed];
  if (systemRgb) return rgbToOklch(...systemRgb);

  // Try CSS named colors
  const namedRgb = CSS_NAMED_COLORS[trimmed];
  if (namedRgb) return rgbToOklch(...namedRgb);

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

/**
 * Continuous saturation score (0-1) for embedding use.
 * Avoids the lossy categorical→numeric mapping.
 */
export function saturationScore(colors: SemanticColor[]): number {
  const chromas = colors.map((c) => c.oklch?.[1] ?? 0).filter((c) => c > 0);
  if (chromas.length === 0) return 0;
  const avg = chromas.reduce((a, b) => a + b, 0) / chromas.length;
  return Math.min(avg / 0.25, 1);
}

/**
 * Continuous contrast score (0-1) for embedding use.
 * Based on lightness range of the palette.
 */
export function contrastScore(colors: SemanticColor[]): number {
  const lightnesses = colors.map((c) => c.oklch?.[0] ?? 0.5);
  if (lightnesses.length < 2) return 0.5;
  const range = Math.max(...lightnesses) - Math.min(...lightnesses);
  return Math.min(range / 0.9, 1);
}
