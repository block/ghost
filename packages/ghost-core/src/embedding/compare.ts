import type {
  DimensionDelta,
  Expression,
  ExpressionComparison,
} from "../types.js";
import { resolveColorOklch } from "./colors.js";
import { computeDriftVectors } from "./vector.js";

export interface CompareOptions {
  includeVectors?: boolean;
}

const WEIGHTS: Record<string, number> = {
  palette: 0.35,
  spacing: 0.25,
  typography: 0.25,
  surfaces: 0.15,
};

/** Redistributed weights when both expressions have design decisions */
const WEIGHTS_WITH_DECISIONS: Record<string, number> = {
  decisions: 0.15,
  palette: 0.3,
  spacing: 0.2,
  typography: 0.2,
  surfaces: 0.15,
};

export function compareExpressions(
  source: Expression,
  target: Expression,
  options?: CompareOptions,
): ExpressionComparison {
  const dimensions: Record<string, DimensionDelta> = {};

  // Compare decisions when both expressions have them.
  // Decisions only contribute to the weighted distance when both sides have
  // embeddings — otherwise we record a qualitative delta without a scalar
  // that would pollute the number.
  const bothHaveDecisions =
    (source.decisions?.length ?? 0) > 0 && (target.decisions?.length ?? 0) > 0;
  const bothEmbedded =
    bothHaveDecisions &&
    (source.decisions ?? []).every((d) => Array.isArray(d.embedding)) &&
    (target.decisions ?? []).every((d) => Array.isArray(d.embedding));

  if (bothHaveDecisions) {
    dimensions.decisions = compareDecisions(source, target, bothEmbedded);
  }

  dimensions.palette = comparePalette(source, target);
  dimensions.spacing = compareSpacing(source, target);
  dimensions.typography = compareTypography(source, target);
  dimensions.surfaces = compareSurfaces(source, target);

  // Only use decision-inclusive weights when decisions are actually scored
  const weights = bothEmbedded ? WEIGHTS_WITH_DECISIONS : WEIGHTS;

  // Weighted overall distance
  let distance = 0;
  for (const [key, weight] of Object.entries(weights)) {
    distance += (dimensions[key]?.distance ?? 0) * weight;
  }

  const summary = buildSummary(dimensions, distance);

  const result: ExpressionComparison = {
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

function comparePalette(a: Expression, b: Expression): DimensionDelta {
  const distances: number[] = [];

  // Compare dominant colors by role, then by position for unmatched
  const aByRole = new Map(a.palette.dominant.map((c) => [c.role, c]));
  const bByRole = new Map(b.palette.dominant.map((c) => [c.role, c]));
  const allDominantRoles = new Set([...aByRole.keys(), ...bByRole.keys()]);
  const matchedA = new Set<string>();
  const matchedB = new Set<string>();

  // First pass: match by role name
  for (const role of allDominantRoles) {
    const ca = aByRole.get(role);
    const cb = bByRole.get(role);
    if (!ca || !cb) continue;
    const oa = resolveColorOklch(ca);
    const ob = resolveColorOklch(cb);
    if (oa && ob) {
      distances.push(oklchDistance(oa, ob));
      matchedA.add(role);
      matchedB.add(role);
    } else if (ca.value === cb.value) {
      // Both hex-only on a non-parseable value — but the values match.
      // Treat as identical rather than falling through to "unmatched".
      distances.push(0);
      matchedA.add(role);
      matchedB.add(role);
    }
  }

  // Second pass: unmatched colors count as missing
  const unmatchedA = a.palette.dominant.filter((c) => !matchedA.has(c.role));
  const unmatchedB = b.palette.dominant.filter((c) => !matchedB.has(c.role));
  const unmatchedCount = Math.max(unmatchedA.length, unmatchedB.length);
  for (let i = 0; i < unmatchedCount; i++) {
    const ca = unmatchedA[i];
    const cb = unmatchedB[i];
    if (!ca || !cb) {
      distances.push(1);
      continue;
    }
    const oa = resolveColorOklch(ca);
    const ob = resolveColorOklch(cb);
    if (oa && ob) {
      distances.push(oklchDistance(oa, ob));
    } else if (ca.value === cb.value) {
      distances.push(0);
    } else {
      distances.push(1);
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
    if (!ca || !cb) continue;
    const oa = resolveColorOklch(ca);
    const ob = resolveColorOklch(cb);
    if (oa && ob) {
      distances.push(oklchDistance(oa, ob));
    } else if (ca.value === cb.value) {
      distances.push(0);
    }
  }

  const distance = avg(distances);
  const description = describePaletteChange(a, b, distance);

  return { dimension: "palette", distance, description };
}

function compareSpacing(a: Expression, b: Expression): DimensionDelta {
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

function compareTypography(a: Expression, b: Expression): DimensionDelta {
  const distances: number[] = [];

  // Family match — fuzzy comparison
  distances.push(
    1 - fontListSimilarity(a.typography.families, b.typography.families),
  );

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

function compareSurfaces(a: Expression, b: Expression): DimensionDelta {
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

// --- Decision matching ---

/** Minimum cosine similarity to consider two decisions "the same dimension". */
const DECISION_MATCH_THRESHOLD = 0.75;

/**
 * Compare design decisions between two expressions.
 *
 * When `bothEmbedded` is true: match decisions pairwise by cosine similarity
 * of their embeddings. Distance blends unmatched coverage with the cosine
 * distance of matched pairs. Deterministic and paraphrase-robust.
 *
 * When `bothEmbedded` is false: record a qualitative delta but return distance 0
 * so decisions don't pollute the weighted scalar. Callers exclude this dimension
 * from the weighted distance (see `WEIGHTS` vs `WEIGHTS_WITH_DECISIONS`).
 */
function compareDecisions(
  a: Expression,
  b: Expression,
  bothEmbedded: boolean,
): DimensionDelta {
  const aDecs = a.decisions ?? [];
  const bDecs = b.decisions ?? [];

  if (!bothEmbedded) {
    return {
      dimension: "decisions",
      distance: 0,
      description: `Decisions present (${aDecs.length} vs ${bDecs.length}) but embeddings missing — not scored`,
    };
  }

  // Greedy one-to-one match: for each decision in A, find the best unmatched
  // decision in B above threshold. Stable and O(n*m), which is fine for
  // expressions with ~5–15 decisions.
  const matchedB = new Set<number>();
  const matchedCosines: number[] = [];

  for (const da of aDecs) {
    let bestJ = -1;
    let bestCos = DECISION_MATCH_THRESHOLD;
    for (let j = 0; j < bDecs.length; j++) {
      if (matchedB.has(j)) continue;
      const cos = cosineSimilarity(
        da.embedding as number[],
        bDecs[j].embedding as number[],
      );
      if (cos > bestCos) {
        bestCos = cos;
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      matchedB.add(bestJ);
      matchedCosines.push(bestCos);
    }
  }

  const matchCount = matchedCosines.length;
  const totalDecs = aDecs.length + bDecs.length;

  // Coverage: fraction of decisions that went unmatched (normalised across both sides).
  const coverageDistance = totalDecs > 0 ? 1 - (2 * matchCount) / totalDecs : 0;

  // Agreement: mean cosine distance across matched pairs.
  const agreementDistance =
    matchCount > 0
      ? matchedCosines.reduce((sum, cos) => sum + (1 - cos), 0) / matchCount
      : 1;

  const distance = coverageDistance * 0.4 + agreementDistance * 0.6;

  let description: string;
  if (distance < 0.1) description = "Design decisions align closely";
  else if (distance < 0.3)
    description = "Minor differences in design decisions";
  else if (distance < 0.5)
    description = "Moderate divergence in design philosophy";
  else description = "Fundamentally different design decisions";

  return { dimension: "decisions", distance, description };
}

/** Cosine similarity between two equal-length vectors. Returns 0 for zero-norm. */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

// --- Font matching ---

const FONT_SUFFIXES = /\b(variable|var|vf|pro|new|next|display|text|mono)\b/gi;

/** Normalize font family name for fuzzy comparison.
 *
 * `FONT_SUFFIXES` intentionally omits a leading `\s*` — combining it with
 * `\b` and alternation gives CodeQL's polynomial-redos check an ambiguous
 * split. The trailing `.replace(/\s+/g, " ").trim()` folds any whitespace
 * the suffix strip left behind, so the result is equivalent.
 */
function normalizeFontFamily(name: string): string {
  return name
    .replace(/['"]/g, "")
    .replace(FONT_SUFFIXES, "")
    .replace(/\s+/g, " ")
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
  inter: "sans-serif",
  arial: "sans-serif",
  helvetica: "sans-serif",
  roboto: "sans-serif",
  "open sans": "sans-serif",
  lato: "sans-serif",
  nunito: "sans-serif",
  poppins: "sans-serif",
  montserrat: "sans-serif",
  raleway: "sans-serif",
  ubuntu: "sans-serif",
  manrope: "sans-serif",
  geist: "sans-serif",
  "dm sans": "sans-serif",
  "plus jakarta sans": "sans-serif",
  "source sans": "sans-serif",
  "work sans": "sans-serif",
  "hk grotesk": "sans-serif",
  "cash sans": "sans-serif",
  "sf pro": "sans-serif",
  "system-ui": "sans-serif",
  "sans-serif": "sans-serif",
  // Serif
  georgia: "serif",
  "times new roman": "serif",
  garamond: "serif",
  "playfair display": "serif",
  merriweather: "serif",
  lora: "serif",
  "source serif": "serif",
  "dm serif": "serif",
  serif: "serif",
  // Monospace
  "jetbrains mono": "monospace",
  "fira code": "monospace",
  "source code": "monospace",
  "geist mono": "monospace",
  "dm mono": "monospace",
  "ibm plex mono": "monospace",
  "sf mono": "monospace",
  menlo: "monospace",
  consolas: "monospace",
  monaco: "monospace",
  "courier new": "monospace",
  monospace: "monospace",
  // Display
  playfair: "display",
  "bebas neue": "display",
  // Apple system fonts
  "san francisco": "sans-serif",
  "sf compact": "sans-serif",
  "new york": "serif",
  system: "sans-serif",
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
  _a: Expression,
  _b: Expression,
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
