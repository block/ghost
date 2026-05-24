import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  GHOST_CHECKS_FILENAME,
  GHOST_FINGERPRINT_YML_FILENAME,
  getEffectiveMapScopes,
  lintGhostFingerprint,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
} from "#ghost-core";
import {
  CACHE_DIRNAME,
  FINGERPRINTS_DIRNAME,
  INTENT_FILENAME,
  PROPOSALS_DIRNAME,
  SCOPE_SURVEYS_DIRNAME,
} from "./constants.js";

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
  | "pending"
  | "memory-empty"
  | "memory-ready"
  | "unknown";

export interface ScanReadinessReport {
  state: ScanReadinessState;
  product_surface_count: number;
  demo_surface_count: number;
  substrate_rows: {
    values: number;
    tokens: number;
    components: number;
  };
  can_review: string[];
  cannot_review: string[];
  reasons: string[];
}

export interface ScanStatusOptions {
  includeScopes?: boolean;
}

export interface ScanStatus {
  /** Absolute path to the Ghost memory directory. */
  dir: string;
  fingerprint: ScanStageReport;
  checks: ScanStageReport;
  intent: ScanStageReport;
  proposals: ScanStageReport;
  cache: ScanStageReport;
  scopes?: ScanScopeReport[];
  scope_error?: string;
  readiness: ScanReadinessReport;
  recommended_next: ScanStage | null;
}

/**
 * Inspect a Ghost memory directory and report whether the canonical
 * `fingerprint.yml` exists. Generated inventory is cache, not a prerequisite:
 * the durable product-experience memory is fingerprint.yml plus optional
 * checks/proposals.
 */
export async function scanStatus(
  dirPath: string,
  options: ScanStatusOptions = {},
): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const fingerprintPath = resolve(dir, GHOST_FINGERPRINT_YML_FILENAME);
  const checksPath = resolve(dir, GHOST_CHECKS_FILENAME);
  const intentPath = resolve(dir, INTENT_FILENAME);
  const proposalsPath = resolve(dir, PROPOSALS_DIRNAME);
  const cachePath = resolve(dir, CACHE_DIRNAME);

  const [
    fingerprintPresent,
    checksPresent,
    intentPresent,
    proposalsPresent,
    cachePresent,
  ] = await Promise.all([
    pathExists(fingerprintPath, "file"),
    pathExists(checksPath, "file"),
    pathExists(intentPath, "file"),
    pathExists(proposalsPath, "directory"),
    pathExists(cachePath, "directory"),
  ]);

  const fingerprint: ScanStageReport = {
    state: fingerprintPresent ? "present" : "missing",
    path: fingerprintPath,
  };
  const checks: ScanStageReport = {
    state: checksPresent ? "present" : "missing",
    path: checksPath,
  };
  const intent: ScanStageReport = {
    state: intentPresent ? "present" : "missing",
    path: intentPath,
  };
  const proposals: ScanStageReport = {
    state: proposalsPresent ? "present" : "missing",
    path: proposalsPath,
  };
  const cache: ScanStageReport = {
    state: cachePresent ? "present" : "missing",
    path: cachePath,
  };

  const status: ScanStatus = {
    dir,
    fingerprint,
    checks,
    intent,
    proposals,
    cache,
    readiness: await scanReadiness(fingerprintPath, fingerprintPresent),
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
  fingerprintPath: string,
  fingerprintPresent: boolean,
): Promise<ScanReadinessReport> {
  if (!fingerprintPresent) {
    return readinessReport("pending", {
      reasons: [
        "fingerprint.yml is missing, so product-experience memory is unavailable.",
      ],
      cannot_review: [
        "product identity",
        "surface behavior",
        "copy",
        "accessibility",
        "trust",
      ],
    });
  }

  let doc: unknown;
  try {
    doc = parseYaml(await readFile(fingerprintPath, "utf-8"));
  } catch (err) {
    return readinessReport("unknown", {
      reasons: [
        `fingerprint.yml could not be read: ${
          err instanceof Error ? err.message : String(err)
        }`,
      ],
    });
  }

  const lint = lintGhostFingerprint(doc);
  if (lint.errors > 0) {
    return readinessReport("unknown", {
      reasons: [
        `fingerprint.yml has ${lint.errors} lint error(s); run ghost lint for details.`,
      ],
      cannot_review: [
        "product identity",
        "surface behavior",
        "copy",
        "accessibility",
        "trust",
      ],
    });
  }

  const fingerprint = doc as {
    situations?: unknown[];
    principles?: unknown[];
    experience_contracts?: unknown[];
    patterns?: unknown[];
    topology?: { examples?: unknown[] };
    substrate?: {
      tokens?: unknown[];
      components?: unknown[];
      accessibility?: unknown[];
      responsive?: unknown[];
    };
  };
  const substrateRows = {
    values:
      (fingerprint.substrate?.accessibility?.length ?? 0) +
      (fingerprint.substrate?.responsive?.length ?? 0),
    tokens: fingerprint.substrate?.tokens?.length ?? 0,
    components: fingerprint.substrate?.components?.length ?? 0,
  };
  const memoryCount =
    (fingerprint.situations?.length ?? 0) +
    (fingerprint.principles?.length ?? 0) +
    (fingerprint.experience_contracts?.length ?? 0) +
    (fingerprint.patterns?.length ?? 0) +
    substrateRows.values +
    substrateRows.tokens +
    substrateRows.components;

  if (memoryCount === 0) {
    return readinessReport("memory-empty", {
      reasons: [
        "fingerprint.yml is valid but has no principles, situations, experience contracts, patterns, or substrate entries yet.",
      ],
      cannot_review: [
        "product identity",
        "surface behavior",
        "copy",
        "accessibility",
        "trust",
      ],
    });
  }

  return readinessReport("memory-ready", {
    product_surface_count: fingerprint.topology?.examples?.length ?? 0,
    substrate_rows: substrateRows,
    reasons: ["fingerprint.yml contains product-experience memory."],
    can_review: [
      "product identity",
      "surface behavior",
      "copy",
      "accessibility",
      "trust",
    ],
  });
}

function readinessReport(
  state: ScanReadinessState,
  overrides: Partial<Omit<ScanReadinessReport, "state">> = {},
): ScanReadinessReport {
  return {
    state,
    product_surface_count: 0,
    demo_surface_count: 0,
    substrate_rows: { values: 0, tokens: 0, components: 0 },
    can_review: [],
    cannot_review: [],
    reasons: [],
    ...overrides,
  };
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
