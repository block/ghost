import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  computeEmbedding,
  type DesignDecision,
  type Fingerprint,
  type GhostFingerprintDocument,
  type GhostFingerprintPackageManifest,
  type GhostPatternsDocument,
  type Survey,
} from "#ghost-core";
import {
  loadFingerprint,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint.js";

const PACKAGE_DECISION_EMBEDDING_SIZE = 64;

export async function loadComparableFingerprint(
  path: string,
): Promise<Fingerprint> {
  const target = resolve(process.cwd(), path);
  if (target.endsWith(".md")) {
    return (await loadFingerprint(target)).fingerprint;
  }

  const paths = resolveFingerprintPackage(
    normalizeFingerprintPackageInput(path),
    process.cwd(),
  );
  if (existsSync(paths.manifest)) {
    const { manifest, fingerprint } = await loadFingerprintPackage(paths);
    return synthesizeFingerprintFromPackage(paths.dir, manifest, fingerprint);
  }

  if (target === paths.dir && existsSync(paths.fingerprint)) {
    return (await loadFingerprint(paths.fingerprint)).fingerprint;
  }

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

function normalizeFingerprintPackageInput(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return /(^|\/)manifest\.ya?ml$/i.test(normalized)
    ? dirname(normalized)
    : path;
}

function synthesizeFingerprintFromPackage(
  path: string,
  manifest: GhostFingerprintPackageManifest,
  document: GhostFingerprintDocument,
): Fingerprint {
  const decisions: DesignDecision[] = [
    ...packageDigestDecisions(document),
    {
      dimension: "summary",
      dimension_kind: "experience-summary",
      decision: compactJoin([
        document.intent.summary.product,
        ...(document.intent.summary.audience ?? []),
        ...(document.intent.summary.goals ?? []),
        ...(document.intent.summary.anti_goals ?? []),
        ...(document.intent.summary.tradeoffs ?? []),
        ...(document.intent.summary.tone ?? []),
      ]),
      evidence: [],
    },
    ...document.intent.situations.map((situation) => ({
      dimension: situation.id,
      dimension_kind: "experience-situation",
      decision: compactJoin([
        situation.title,
        situation.user_intent,
        situation.product_obligation,
      ]),
      evidence: evidenceStrings(situation.evidence),
    })),
    ...document.intent.principles.map((principle) => ({
      dimension: principle.id,
      dimension_kind: "experience-principle",
      decision: principle.principle,
      evidence: evidenceStrings(principle.evidence),
    })),
    ...document.intent.experience_contracts.map((contract) => ({
      dimension: contract.id,
      dimension_kind: "experience-contract",
      decision: contract.contract,
      evidence: evidenceStrings(contract.evidence),
    })),
    ...document.composition.patterns.map((pattern) => ({
      dimension: pattern.id,
      dimension_kind: `composition-${pattern.kind}`,
      decision: pattern.pattern,
      evidence: evidenceStrings(pattern.evidence),
    })),
    ...buildingBlockDecisions(document),
    ...document.inventory.exemplars.map((exemplar) => ({
      dimension: exemplar.id,
      dimension_kind: "inventory-exemplar",
      decision: compactJoin([
        exemplar.title,
        exemplar.surface_type,
        exemplar.scope,
        exemplar.note,
        exemplar.why,
        exemplar.path,
      ]),
      evidence: [exemplar.path],
    })),
  ].map((decision) => ({
    ...decision,
    embedding: deterministicTextEmbedding(
      `${decision.dimension} ${decision.dimension_kind ?? ""} ${decision.decision}`,
    ),
  }));

  const fingerprint: Fingerprint = {
    id: manifest.id,
    source: "extraction",
    timestamp: new Date(0).toISOString(),
    sources: [path],
    observation: {
      summary: document.intent.summary.product ?? manifest.id,
      personality: document.intent.summary.tone ?? [],
      resembles: document.inventory.building_blocks.libraries ?? [],
    },
    decisions,
    palette: {
      dominant: [],
      neutrals: { steps: [], count: 0 },
      semantic: [],
      saturationProfile: "mixed",
      contrast: "moderate",
    },
    spacing: {
      scale: [],
      regularity: 0,
      baseUnit: null,
    },
    typography: {
      families: [],
      sizeRamp: [],
      weightDistribution: {},
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [],
      shadowComplexity: "deliberate-none",
      borderUsage: "minimal",
    },
    embedding: [],
  };
  fingerprint.embedding = computeEmbedding(fingerprint);
  return fingerprint;
}

function compactJoin(values: Array<string | undefined>): string {
  const joined = values
    .filter((value): value is string => Boolean(value))
    .join(" — ");
  return joined || "No situation decision recorded.";
}

function evidenceStrings(
  evidence: GhostFingerprintDocument["intent"]["principles"][number]["evidence"],
): string[] {
  return (
    evidence?.map((entry) => entry.locator ?? entry.path ?? entry.note ?? "") ??
    []
  ).filter(Boolean);
}

function packageDigestDecisions(
  document: GhostFingerprintDocument,
): DesignDecision[] {
  const digest = stableHash(
    JSON.stringify({
      intent: document.intent,
      inventory: document.inventory,
      composition: document.composition,
    }),
  ).toString(16);
  return Array.from({ length: 16 }, (_, index) => {
    const token = `pkgdigest-${index + 1}-${digest}`;
    return {
      dimension: token,
      dimension_kind: "package-digest",
      decision: `${token} ${token} ${token} ${token}`,
      evidence: [],
    };
  });
}

function buildingBlockDecisions(
  document: GhostFingerprintDocument,
): DesignDecision[] {
  const blocks = document.inventory.building_blocks;
  return [
    ["tokens", blocks.tokens],
    ["components", blocks.components],
    ["libraries", blocks.libraries],
    ["assets", blocks.assets],
    ["routes", blocks.routes],
    ["files", blocks.files],
    ["notes", blocks.notes],
  ].flatMap(([dimension, values]) => {
    if (!Array.isArray(values) || values.length === 0) return [];
    return [
      {
        dimension: `building-blocks-${dimension}`,
        dimension_kind: "inventory-building-blocks",
        decision: values.join(", "),
        evidence: [],
      },
    ];
  });
}

function deterministicTextEmbedding(text: string): number[] {
  const vector = new Array(PACKAGE_DECISION_EMBEDDING_SIZE).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9_-]+/g) ?? [];
  for (const token of tokens) {
    vector[stableHash(token) % PACKAGE_DECISION_EMBEDDING_SIZE] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) return vector;
  return vector.map((value) => value / norm);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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
