import { computeDriftVectors } from "../evolution/vector.js";
import type {
  DesignFingerprint,
  DimensionDelta,
  FingerprintComparison,
} from "../types.js";

export interface CompareOptions {
  includeVectors?: boolean;
}

// Dimension weights — palette and spacing have higher visual impact
const WEIGHTS: Record<string, number> = {
  palette: 0.3,
  spacing: 0.2,
  typography: 0.2,
  surfaces: 0.15,
  architecture: 0.15,
};

export function compareFingerprints(
  source: DesignFingerprint,
  target: DesignFingerprint,
  options?: CompareOptions,
): FingerprintComparison {
  const dimensions: Record<string, DimensionDelta> = {};

  dimensions.palette = comparePalette(source, target);
  dimensions.spacing = compareSpacing(source, target);
  dimensions.typography = compareTypography(source, target);
  dimensions.surfaces = compareSurfaces(source, target);
  dimensions.architecture = compareArchitecture(source, target);

  // Weighted overall distance
  let distance = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    distance += (dimensions[key]?.distance ?? 0) * weight;
  }

  const summary = buildSummary(dimensions, distance);

  const result: FingerprintComparison = {
    source,
    target,
    distance,
    dimensions,
    summary,
  };

  if (options?.includeVectors) {
    result.vectors = computeDriftVectors(source, target);
  }

  return result;
}

function comparePalette(
  a: DesignFingerprint,
  b: DesignFingerprint,
): DimensionDelta {
  const distances: number[] = [];

  // Compare dominant colors by OKLCH delta-E
  const maxDominant = Math.max(
    a.palette.dominant.length,
    b.palette.dominant.length,
  );
  if (maxDominant > 0) {
    for (let i = 0; i < maxDominant; i++) {
      const ca = a.palette.dominant[i];
      const cb = b.palette.dominant[i];
      if (ca?.oklch && cb?.oklch) {
        distances.push(oklchDistance(ca.oklch, cb.oklch));
      } else if (ca || cb) {
        distances.push(1); // one is missing
      }
    }
  }

  // Compare semantic role coverage
  const aRoles = new Set(a.palette.semantic.map((c) => c.role));
  const bRoles = new Set(b.palette.semantic.map((c) => c.role));
  const allRoles = new Set([...aRoles, ...bRoles]);
  const sharedRoles = [...allRoles].filter(
    (r) => aRoles.has(r) && bRoles.has(r),
  );
  const roleCoverage =
    allRoles.size > 0 ? 1 - sharedRoles.length / allRoles.size : 0;
  distances.push(roleCoverage);

  // Compare qualitative
  if (a.palette.saturationProfile !== b.palette.saturationProfile)
    distances.push(0.5);
  if (a.palette.contrast !== b.palette.contrast) distances.push(0.5);

  // Compare semantic colors that exist in both
  for (const role of sharedRoles) {
    const ca = a.palette.semantic.find((c) => c.role === role);
    const cb = b.palette.semantic.find((c) => c.role === role);
    if (ca?.oklch && cb?.oklch) {
      distances.push(oklchDistance(ca.oklch, cb.oklch));
    }
  }

  const distance = avg(distances);
  const description = describePaletteChange(a, b, distance);

  return { dimension: "palette", distance, description };
}

function compareSpacing(
  a: DesignFingerprint,
  b: DesignFingerprint,
): DimensionDelta {
  const distances: number[] = [];

  // Scale similarity (Jaccard-like)
  const aSet = new Set(a.spacing.scale);
  const bSet = new Set(b.spacing.scale);
  const union = new Set([...aSet, ...bSet]);
  const intersection = [...union].filter((v) => aSet.has(v) && bSet.has(v));
  distances.push(union.size > 0 ? 1 - intersection.length / union.size : 0);

  // Regularity delta
  distances.push(Math.abs(a.spacing.regularity - b.spacing.regularity));

  // Base unit match
  if (a.spacing.baseUnit && b.spacing.baseUnit) {
    distances.push(a.spacing.baseUnit === b.spacing.baseUnit ? 0 : 0.5);
  }

  const distance = avg(distances);
  return {
    dimension: "spacing",
    distance,
    description:
      distance < 0.1
        ? "Spacing scales are nearly identical"
        : distance < 0.3
          ? "Minor spacing differences"
          : "Significant spacing divergence",
  };
}

function compareTypography(
  a: DesignFingerprint,
  b: DesignFingerprint,
): DimensionDelta {
  const distances: number[] = [];

  // Family match — fuzzy comparison
  distances.push(1 - fontListSimilarity(a.typography.families, b.typography.families));

  // Size ramp similarity
  const aRamp = new Set(a.typography.sizeRamp);
  const bRamp = new Set(b.typography.sizeRamp);
  const rampUnion = new Set([...aRamp, ...bRamp]);
  const rampIntersection = [...rampUnion].filter(
    (v) => aRamp.has(v) && bRamp.has(v),
  );
  distances.push(
    rampUnion.size > 0 ? 1 - rampIntersection.length / rampUnion.size : 0,
  );

  // Line height pattern
  if (a.typography.lineHeightPattern !== b.typography.lineHeightPattern)
    distances.push(0.3);

  const distance = avg(distances);
  return {
    dimension: "typography",
    distance,
    description:
      distance < 0.1
        ? "Typography systems match"
        : distance < 0.3
          ? "Minor typographic differences"
          : "Different typographic language",
  };
}

function compareSurfaces(
  a: DesignFingerprint,
  b: DesignFingerprint,
): DimensionDelta {
  const distances: number[] = [];

  // Border radii overlap
  const aRadii = new Set(a.surfaces.borderRadii);
  const bRadii = new Set(b.surfaces.borderRadii);
  const radiiUnion = new Set([...aRadii, ...bRadii]);
  const radiiIntersection = [...radiiUnion].filter(
    (v) => aRadii.has(v) && bRadii.has(v),
  );
  distances.push(
    radiiUnion.size > 0 ? 1 - radiiIntersection.length / radiiUnion.size : 0,
  );

  // Shadow complexity
  if (a.surfaces.shadowComplexity !== b.surfaces.shadowComplexity)
    distances.push(0.5);

  // Border usage
  if (a.surfaces.borderUsage !== b.surfaces.borderUsage) distances.push(0.3);

  const distance = avg(distances);
  return {
    dimension: "surfaces",
    distance,
    description:
      distance < 0.1
        ? "Surface treatments align"
        : distance < 0.3
          ? "Minor surface differences"
          : "Distinct surface language",
  };
}

// Cross-platform methodology equivalences: iOS concept → web concept
const METHODOLOGY_EQUIVALENCES: Record<string, string> = {
  "swiftui-inline": "css-in-js",
  "view-modifiers": "css-modules",
  "swift-enums": "css-custom-properties",
  "asset-catalog": "css-custom-properties",
  "environment-theming": "styled-components",
};

/** Normalize methodology strings for cross-platform comparison */
function normalizeMethodology(methods: string[], crossPlatform: boolean): Set<string> {
  if (!crossPlatform) return new Set(methods);
  return new Set(methods.map((m) => METHODOLOGY_EQUIVALENCES[m] ?? m));
}

function compareArchitecture(
  a: DesignFingerprint,
  b: DesignFingerprint,
): DimensionDelta {
  const distances: number[] = [];

  // Tokenization delta
  distances.push(
    Math.abs(a.architecture.tokenization - b.architecture.tokenization),
  );

  // Methodology overlap (with cross-platform normalization)
  const crossPlatform = a.platform !== b.platform && a.platform !== undefined && b.platform !== undefined;
  const aMethods = normalizeMethodology(a.architecture.methodology, crossPlatform);
  const bMethods = normalizeMethodology(b.architecture.methodology, crossPlatform);
  const allMethods = new Set([...aMethods, ...bMethods]);
  const sharedMethods = [...allMethods].filter(
    (m) => aMethods.has(m) && bMethods.has(m),
  );
  distances.push(
    allMethods.size > 0 ? 1 - sharedMethods.length / allMethods.size : 0,
  );

  // Component count ratio
  const maxCount = Math.max(
    a.architecture.componentCount,
    b.architecture.componentCount,
  );
  const minCount = Math.min(
    a.architecture.componentCount,
    b.architecture.componentCount,
  );
  distances.push(maxCount > 0 ? 1 - minCount / maxCount : 0);

  // Naming pattern
  if (a.architecture.namingPattern !== b.architecture.namingPattern)
    distances.push(0.3);

  const distance = avg(distances);
  return {
    dimension: "architecture",
    distance,
    description:
      distance < 0.1
        ? "Architecturally aligned"
        : distance < 0.3
          ? "Minor architectural differences"
          : "Fundamentally different architecture",
  };
}

// --- Font matching ---

const FONT_SUFFIXES = /\s*\b(variable|var|vf|pro|new|next|display|text|mono)\b/gi;

/** Normalize font family name for fuzzy comparison */
function normalizeFontFamily(name: string): string {
  return name
    .replace(/['"]/g, "")
    .replace(FONT_SUFFIXES, "")
    .trim()
    .toLowerCase();
}

/** Levenshtein distance between two strings */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Font category lookup for common fonts
const FONT_CATEGORIES: Record<string, string> = {
  // Sans-serif
  inter: "sans-serif", arial: "sans-serif", helvetica: "sans-serif",
  roboto: "sans-serif", "open sans": "sans-serif", lato: "sans-serif",
  nunito: "sans-serif", poppins: "sans-serif", montserrat: "sans-serif",
  raleway: "sans-serif", ubuntu: "sans-serif", manrope: "sans-serif",
  geist: "sans-serif", "dm sans": "sans-serif", "plus jakarta sans": "sans-serif",
  "source sans": "sans-serif", "work sans": "sans-serif",
  "hk grotesk": "sans-serif", "cash sans": "sans-serif",
  "sf pro": "sans-serif", "system-ui": "sans-serif", "sans-serif": "sans-serif",
  // Serif
  georgia: "serif", "times new roman": "serif", garamond: "serif",
  "playfair display": "serif", merriweather: "serif", lora: "serif",
  "source serif": "serif", "dm serif": "serif", serif: "serif",
  // Monospace
  "jetbrains mono": "monospace", "fira code": "monospace", "source code": "monospace",
  "geist mono": "monospace", "dm mono": "monospace", "ibm plex mono": "monospace",
  "sf mono": "monospace", menlo: "monospace", consolas: "monospace",
  monaco: "monospace", "courier new": "monospace", monospace: "monospace",
  // Display
  "playfair": "display", "bebas neue": "display",
  // Apple system fonts
  "san francisco": "sans-serif", "sf compact": "sans-serif",
  "new york": "serif", system: "sans-serif",
};

function getFontCategory(normalizedName: string): string | null {
  // Exact match
  if (FONT_CATEGORIES[normalizedName]) return FONT_CATEGORIES[normalizedName];
  // Partial match: check if any known font is a prefix
  for (const [font, cat] of Object.entries(FONT_CATEGORIES)) {
    if (normalizedName.startsWith(font) || font.startsWith(normalizedName)) {
      return cat;
    }
  }
  return null;
}

/**
 * Compute similarity between two font names (0 = no match, 1 = identical).
 * Uses normalization, Levenshtein distance, and category fallback.
 */
function fontSimilarity(a: string, b: string): number {
  const normA = normalizeFontFamily(a);
  const normB = normalizeFontFamily(b);

  // Exact match after normalization
  if (normA === normB) return 1.0;

  // Levenshtein-based similarity
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshtein(normA, normB);
  const similarity = 1 - dist / maxLen;

  // If names are very similar (>= 0.7), use that score
  if (similarity >= 0.7) return similarity;

  // Category fallback: same category = 0.3 floor
  const catA = getFontCategory(normA);
  const catB = getFontCategory(normB);
  if (catA && catB && catA === catB) return Math.max(similarity, 0.3);

  return similarity;
}

/**
 * Compute font list similarity using best-match pairing.
 * Each font in list A is matched to its best counterpart in list B.
 */
function fontListSimilarity(aFonts: string[], bFonts: string[]): number {
  if (aFonts.length === 0 && bFonts.length === 0) return 1;
  if (aFonts.length === 0 || bFonts.length === 0) return 0;

  // For each font in A, find best match in B
  let totalSim = 0;
  for (const fa of aFonts) {
    let bestSim = 0;
    for (const fb of bFonts) {
      bestSim = Math.max(bestSim, fontSimilarity(fa, fb));
    }
    totalSim += bestSim;
  }
  // Symmetric: also match B→A and average
  let totalSimReverse = 0;
  for (const fb of bFonts) {
    let bestSim = 0;
    for (const fa of aFonts) {
      bestSim = Math.max(bestSim, fontSimilarity(fa, fb));
    }
    totalSimReverse += bestSim;
  }

  const avgA = totalSim / aFonts.length;
  const avgB = totalSimReverse / bFonts.length;
  return (avgA + avgB) / 2;
}

// --- Helpers ---

function oklchDistance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  // Weighted OKLCH distance (lightness matters most, then chroma, then hue)
  const dL = Math.abs(a[0] - b[0]); // 0-1
  const dC = Math.abs(a[1] - b[1]); // 0-0.4 typical
  const dH = Math.min(Math.abs(a[2] - b[2]), 360 - Math.abs(a[2] - b[2])) / 180; // normalized

  return Math.min(dL * 0.5 + dC * 2 + dH * 0.3, 1);
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function describePaletteChange(
  _a: DesignFingerprint,
  _b: DesignFingerprint,
  distance: number,
): string {
  if (distance < 0.1) return "Color palettes are nearly identical";
  if (distance < 0.3) return "Minor palette variations";
  return "Significant palette divergence";
}

function buildSummary(
  dimensions: Record<string, DimensionDelta>,
  distance: number,
): string {
  if (distance < 0.05) return "These projects share the same design language.";
  if (distance < 0.15)
    return "Minor design differences — likely the same system with small customizations.";
  if (distance < 0.3)
    return "Moderate divergence — shared foundation but notable differences.";
  if (distance < 0.5)
    return "Significant divergence — different design decisions across multiple dimensions.";

  // Identify the biggest divergence
  const sorted = Object.entries(dimensions).sort(
    ([, a], [, b]) => b.distance - a.distance,
  );
  const biggest = sorted[0];
  if (biggest) {
    return `Fundamentally different design languages. Largest gap: ${biggest[0]} (${(biggest[1].distance * 100).toFixed(0)}%).`;
  }
  return "Fundamentally different design languages.";
}

export { embeddingDistance } from "./embedding.js";
