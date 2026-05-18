import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  computeEmbedding,
  type Fingerprint,
  type GhostPatternsDocument,
  type Survey,
} from "@ghost/core";
import { loadFingerprint, resolveFingerprintPackage } from "ghost-scan";
import { parse as parseYaml } from "yaml";

export async function loadComparableFingerprint(
  path: string,
): Promise<Fingerprint> {
  const target = resolve(process.cwd(), path);
  if (target.endsWith(".md")) {
    return (await loadFingerprint(target)).fingerprint;
  }

  const paths = resolveFingerprintPackage(path, process.cwd());
  try {
    const [surveyRaw, patternsRaw] = await Promise.all([
      readFile(paths.survey, "utf-8"),
      readFile(paths.patterns, "utf-8"),
    ]);
    return synthesizeFingerprintFromBundle(
      paths.dir,
      JSON.parse(surveyRaw) as Survey,
      parseYaml(patternsRaw) as GhostPatternsDocument,
    );
  } catch {
    return (await loadFingerprint(target)).fingerprint;
  }
}

function synthesizeFingerprintFromBundle(
  path: string,
  survey: Survey,
  patterns: GhostPatternsDocument,
): Fingerprint {
  const colors = survey.values
    .filter((row) => row.kind === "color")
    .slice()
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 8)
    .map((row, index) => ({
      role: row.role_hypothesis ?? `color-${index + 1}`,
      value: row.value,
    }));
  const spacingScale = survey.values
    .filter((row) => row.kind === "spacing")
    .map((row) => scalarValue(row.value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const typographySizes = survey.values
    .filter((row) => row.kind === "typography")
    .map((row) => scalarValue(row.value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const radii = survey.values
    .filter((row) => row.kind === "radius")
    .map((row) => scalarValue(row.value))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  const fingerprint: Fingerprint = {
    id: patterns.id,
    source: "extraction",
    timestamp: survey.sources[0]?.scanned_at ?? new Date(0).toISOString(),
    sources: [path],
    observation: {
      summary: `Root Ghost bundle synthesized from ${survey.ui_surfaces.length} surveyed surfaces and ${patterns.composition_patterns.length} composition patterns.`,
      personality: [],
      resembles: [],
    },
    decisions: patterns.composition_patterns.map((pattern) => ({
      dimension: pattern.id,
      dimension_kind: "composition-patterns",
      decision: pattern.intent ?? pattern.title ?? pattern.id,
      evidence:
        pattern.evidence?.map(
          (entry) =>
            entry.locator ?? entry.path ?? entry.surface_id ?? pattern.id,
        ) ?? [],
    })),
    palette: {
      dominant: colors,
      neutrals: { steps: [], count: 0 },
      semantic: [],
      saturationProfile: "mixed",
      contrast: "moderate",
    },
    spacing: {
      scale: uniqueNumbers(spacingScale),
      regularity: spacingScale.length > 0 ? 1 : 0,
      baseUnit: spacingScale[0] ?? null,
    },
    typography: {
      families: [],
      sizeRamp: uniqueNumbers(typographySizes),
      weightDistribution: {},
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: uniqueNumbers(radii),
      shadowComplexity: survey.values.some((row) => row.kind === "shadow")
        ? "subtle"
        : "deliberate-none",
      borderUsage: "minimal",
    },
    embedding: [],
  };
  fingerprint.embedding = computeEmbedding(fingerprint);
  return fingerprint;
}

function scalarValue(value: string): number | null {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}
