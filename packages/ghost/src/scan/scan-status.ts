import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type GhostFingerprintDocument,
  getEffectiveMapScopes,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
} from "#ghost-core";
import {
  CONFIG_FILENAME,
  FINGERPRINTS_DIRNAME,
  SCOPE_SURVEYS_DIRNAME,
} from "./constants.js";
import {
  type FingerprintPackagePaths,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";

export type ScanStageState = "missing" | "present";

export interface ScanStageReport {
  state: ScanStageState;
  /** Absolute path to the artifact or directory. */
  path: string;
}

export type ScanStage = "fingerprint";

export interface ScanScopeReport {
  id: string;
  name?: string;
  kind: string;
  parent?: string;
  survey: ScanStageReport;
  fingerprint: ScanStageReport;
}

export type ScanReadinessState =
  | "fingerprint-missing"
  | "fingerprint-invalid"
  | "fingerprint-empty"
  | "prose-only"
  | "inventory-only"
  | "composition-only"
  | "fingerprint-partial"
  | "fingerprint-ready";

export type ScanFingerprintLayer = "prose" | "inventory" | "composition";

export interface ScanReadinessReport {
  state: ScanReadinessState;
  layer_counts: Record<ScanFingerprintLayer, number>;
  missing_layers: ScanFingerprintLayer[];
  product_surface_count: number;
  demo_surface_count: number;
  building_block_rows: {
    tokens: number;
    components: number;
    libraries: number;
    assets: number;
    routes: number;
    files: number;
    notes: number;
  };
  can_review: string[];
  cannot_review: string[];
  reasons: string[];
}

export interface ScanStatusOptions {
  includeScopes?: boolean;
}

export interface ScanStatus {
  /** Absolute path to the Ghost fingerprint directory. */
  dir: string;
  fingerprint: ScanStageReport;
  config: ScanStageReport;
  checks: ScanStageReport;
  scopes?: ScanScopeReport[];
  scope_error?: string;
  readiness: ScanReadinessReport;
  recommended_next: ScanStage | null;
}

/**
 * Inspect a Ghost fingerprint directory and report whether the canonical
 * `fingerprint/manifest.yml` exists with useful prose, inventory, and
 * composition layers.
 * Optional checks are supplemental when present.
 */
export async function scanStatus(
  dirPath: string,
  options: ScanStatusOptions = {},
): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const paths = resolveFingerprintPackage(dir, process.cwd());
  const fingerprintPath = paths.fingerprintDir;
  const configPath = resolve(dir, CONFIG_FILENAME);
  const checksPath = paths.checks;

  const [fingerprintPresent, configPresent, checksPresent] = await Promise.all([
    pathExists(paths.manifest, "file"),
    pathExists(configPath, "file"),
    pathExists(checksPath, "file"),
  ]);

  const fingerprint: ScanStageReport = {
    state: fingerprintPresent ? "present" : "missing",
    path: fingerprintPath,
  };
  const checks: ScanStageReport = {
    state: checksPresent ? "present" : "missing",
    path: checksPath,
  };
  const config: ScanStageReport = {
    state: configPresent ? "present" : "missing",
    path: configPath,
  };

  const status: ScanStatus = {
    dir,
    fingerprint,
    config,
    checks,
    readiness: await scanReadiness(paths, fingerprintPresent),
    recommended_next: fingerprintPresent ? null : "fingerprint",
  };

  if (options.includeScopes) {
    try {
      const mapPath = resolve(dir, MAP_FILENAME);
      status.scopes = await scanScopes(dir, mapPath, await pathExists(mapPath));
    } catch (err) {
      status.scope_error = err instanceof Error ? err.message : String(err);
      status.scopes = [];
    }
  }

  return status;
}

async function scanReadiness(
  paths: FingerprintPackagePaths,
  fingerprintPresent: boolean,
): Promise<ScanReadinessReport> {
  if (!fingerprintPresent) {
    return readinessReport("fingerprint-missing", {
      reasons: [
        "fingerprint/manifest.yml is missing, so no canonical fingerprint layers are available.",
      ],
      cannot_review: ["prose", "inventory", "composition"],
    });
  }

  let fingerprint: GhostFingerprintDocument;
  try {
    fingerprint = (await loadFingerprintPackage(paths)).fingerprint;
  } catch (err) {
    return readinessReport("fingerprint-invalid", {
      reasons: [
        `fingerprint package could not be read: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    });
  }
  const buildingBlocks = fingerprint.inventory.building_blocks;
  const buildingBlockRows = {
    tokens: buildingBlocks?.tokens?.length ?? 0,
    components: buildingBlocks?.components?.length ?? 0,
    libraries: buildingBlocks?.libraries?.length ?? 0,
    assets: buildingBlocks?.assets?.length ?? 0,
    routes: buildingBlocks?.routes?.length ?? 0,
    files: buildingBlocks?.files?.length ?? 0,
    notes: buildingBlocks?.notes?.length ?? 0,
  };
  const proseCount =
    summaryFieldCount(fingerprint.prose.summary) +
    fingerprint.prose.situations.length +
    fingerprint.prose.principles.length +
    fingerprint.prose.experience_contracts.length;
  const inventoryCount =
    (fingerprint.inventory.topology.scopes?.length ?? 0) +
    (fingerprint.inventory.topology.surface_types?.length ?? 0) +
    fingerprint.inventory.exemplars.length +
    buildingBlockRows.tokens +
    buildingBlockRows.components +
    buildingBlockRows.libraries +
    buildingBlockRows.assets +
    buildingBlockRows.routes +
    buildingBlockRows.files +
    buildingBlockRows.notes;
  const compositionCount = fingerprint.composition.patterns.length;
  const layerCounts: Record<ScanFingerprintLayer, number> = {
    prose: proseCount,
    inventory: inventoryCount,
    composition: compositionCount,
  };
  const presentLayers = fingerprintLayers.filter(
    (layer) => layerCounts[layer] > 0,
  );
  const missingLayers = fingerprintLayers.filter(
    (layer) => layerCounts[layer] === 0,
  );

  if (presentLayers.length === 0) {
    return readinessReport("fingerprint-empty", {
      layer_counts: layerCounts,
      missing_layers: missingLayers,
      reasons: [
        "fingerprint/ is valid but has no useful prose, inventory, or composition entries yet.",
      ],
      cannot_review: ["prose", "inventory", "composition"],
    });
  }

  if (presentLayers.length === 1) {
    const [layer] = presentLayers;
    return readinessReport(singleLayerStates[layer], {
      layer_counts: layerCounts,
      missing_layers: missingLayers,
      product_surface_count: fingerprint.inventory.exemplars.length,
      building_block_rows: buildingBlockRows,
      reasons: [
        `fingerprint/ only has useful ${layer}; add ${missingLayers.join(" and ")} for a ready fingerprint.`,
      ],
      can_review: canReviewForLayers(presentLayers),
      cannot_review: missingLayers,
    });
  }

  if (missingLayers.length > 0) {
    return readinessReport("fingerprint-partial", {
      layer_counts: layerCounts,
      missing_layers: missingLayers,
      product_surface_count: fingerprint.inventory.exemplars.length,
      building_block_rows: buildingBlockRows,
      reasons: [
        `fingerprint/ has ${presentLayers.join(" and ")} but is missing ${missingLayers.join(" and ")}.`,
      ],
      can_review: canReviewForLayers(presentLayers),
      cannot_review: missingLayers,
    });
  }

  return readinessReport("fingerprint-ready", {
    layer_counts: layerCounts,
    missing_layers: [],
    product_surface_count: fingerprint.inventory.exemplars.length,
    building_block_rows: buildingBlockRows,
    reasons: [
      "fingerprint/ has useful prose, inventory, and composition layers.",
    ],
    can_review: ["prose", "inventory", "composition"],
  });
}

function readinessReport(
  state: ScanReadinessState,
  overrides: Partial<Omit<ScanReadinessReport, "state">> = {},
): ScanReadinessReport {
  return {
    state,
    layer_counts: {
      prose: 0,
      inventory: 0,
      composition: 0,
    },
    missing_layers: ["prose", "inventory", "composition"],
    product_surface_count: 0,
    demo_surface_count: 0,
    building_block_rows: {
      tokens: 0,
      components: 0,
      libraries: 0,
      assets: 0,
      routes: 0,
      files: 0,
      notes: 0,
    },
    can_review: [],
    cannot_review: [],
    reasons: [],
    ...overrides,
  };
}

const fingerprintLayers: ScanFingerprintLayer[] = [
  "prose",
  "inventory",
  "composition",
];

const singleLayerStates: Record<ScanFingerprintLayer, ScanReadinessState> = {
  prose: "prose-only",
  inventory: "inventory-only",
  composition: "composition-only",
};

function summaryFieldCount(
  summary: GhostFingerprintDocument["prose"]["summary"],
): number {
  let count = 0;
  if (summary.product?.trim()) count += 1;
  for (const field of [
    summary.audience,
    summary.goals,
    summary.anti_goals,
    summary.tradeoffs,
    summary.tone,
  ]) {
    count += field?.length ?? 0;
  }
  return count;
}

function canReviewForLayers(layers: ScanFingerprintLayer[]): string[] {
  const canReview: string[] = [];
  if (layers.includes("prose")) canReview.push("product prose");
  if (layers.includes("inventory")) canReview.push("inventory anchors");
  if (layers.includes("composition")) canReview.push("composition patterns");
  return canReview;
}

async function pathExists(
  path: string,
  kind: "file" | "directory" = "file",
): Promise<boolean> {
  try {
    const s = await stat(path);
    return kind === "directory" ? s.isDirectory() : s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}

async function scanScopes(
  dir: string,
  mapPath: string,
  mapPresent: boolean,
): Promise<ScanScopeReport[]> {
  if (!mapPresent) return [];

  const map = await readMapFrontmatter(mapPath);
  const scopes = getEffectiveMapScopes(map);
  const out: ScanScopeReport[] = [];

  for (const scope of scopes) {
    const surveyPath = join(
      dir,
      SCOPE_SURVEYS_DIRNAME,
      scope.id,
      SURVEY_FILENAME,
    );
    const fingerprintPath = join(dir, FINGERPRINTS_DIRNAME, `${scope.id}.md`);
    const [surveyPresent, fingerprintPresent] = await Promise.all([
      pathExists(surveyPath),
      pathExists(fingerprintPath),
    ]);

    out.push({
      id: scope.id,
      ...(scope.name ? { name: scope.name } : {}),
      kind: scope.kind,
      ...(scope.parent ? { parent: scope.parent } : {}),
      survey: {
        state: surveyPresent ? "present" : "missing",
        path: surveyPath,
      },
      fingerprint: {
        state: fingerprintPresent ? "present" : "missing",
        path: fingerprintPath,
      },
    });
  }

  return out;
}

async function readMapFrontmatter(path: string): Promise<MapFrontmatter> {
  const raw = await readFile(path, "utf-8");
  const split = splitFrontmatter(raw);
  if (!split) {
    throw new Error("map.md is missing a YAML frontmatter block");
  }
  const parsed = parseYaml(split.frontmatter);
  const result = MapFrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `map.md frontmatter failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

function splitFrontmatter(raw: string): { frontmatter: string } | null {
  const lines = raw.replace(/^﻿/, "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      return { frontmatter: lines.slice(1, i).join("\n") };
    }
  }
  return null;
}
