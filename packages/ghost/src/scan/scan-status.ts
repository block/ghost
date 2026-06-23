import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type GhostValidateDocument,
  GhostValidateSchema,
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
  type ScanContributionReport,
  summarizeFingerprintContribution,
} from "./fingerprint-contribution.js";
import type { FingerprintPackagePaths } from "./fingerprint-package.js";
import {
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

export interface ScanStatusOptions {
  includeScopes?: boolean;
}

export interface ScanStatus {
  /** Absolute path to the Ghost fingerprint directory. */
  dir: string;
  fingerprint: ScanStageReport;
  config: ScanStageReport;
  validate: ScanStageReport;
  scopes?: ScanScopeReport[];
  scope_error?: string;
  contribution: ScanContributionReport;
  recommended_next: ScanStage | null;
}

/**
 * Inspect a Ghost fingerprint directory and report what sparse facets this
 * package contributes. A package can contribute only intent, inventory,
 * composition, validate, or any combination; absent facets may be inherited
 * from broader stack context.
 */
export async function scanStatus(
  dirPath: string,
  options: ScanStatusOptions = {},
): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const paths = resolveFingerprintPackage(dir, process.cwd());
  const fingerprintPath = paths.fingerprintDir;
  const configPath = resolve(dir, CONFIG_FILENAME);

  const [
    fingerprintPresent,
    configPresent,
    intentPresent,
    inventoryPresent,
    compositionPresent,
    validatePresent,
  ] = await Promise.all([
    pathExists(paths.manifest, "file"),
    pathExists(configPath, "file"),
    pathExists(paths.intent, "file"),
    pathExists(paths.inventory, "file"),
    pathExists(paths.composition, "file"),
    pathExists(paths.checks, "file"),
  ]);

  const fingerprint: ScanStageReport = {
    state: fingerprintPresent ? "present" : "missing",
    path: fingerprintPath,
  };
  const validate: ScanStageReport = {
    state: validatePresent ? "present" : "missing",
    path: paths.checks,
  };
  const config: ScanStageReport = {
    state: configPresent ? "present" : "missing",
    path: configPath,
  };

  const contribution = await scanContribution(paths, {
    fingerprintPresent,
    intentPresent,
    inventoryPresent,
    compositionPresent,
    validatePresent,
  });

  const status: ScanStatus = {
    dir,
    fingerprint,
    config,
    validate,
    contribution,
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

async function scanContribution(
  paths: FingerprintPackagePaths,
  present: {
    fingerprintPresent: boolean;
    intentPresent: boolean;
    inventoryPresent: boolean;
    compositionPresent: boolean;
    validatePresent: boolean;
  },
): Promise<ScanContributionReport> {
  const files = {
    intent: { path: paths.intent, present: present.intentPresent },
    inventory: { path: paths.inventory, present: present.inventoryPresent },
    composition: {
      path: paths.composition,
      present: present.compositionPresent,
    },
    validate: { path: paths.checks, present: present.validatePresent },
  } as const;

  if (!present.fingerprintPresent) {
    return summarizeFingerprintContribution({ files, missing: true });
  }

  try {
    const [loaded, validate] = await Promise.all([
      loadFingerprintPackage(paths),
      readOptionalValidate(paths.checks, present.validatePresent),
    ]);
    return summarizeFingerprintContribution({
      fingerprint: loaded.fingerprint,
      validate,
      files,
    });
  } catch (err) {
    return summarizeFingerprintContribution({
      files,
      invalidReason: err instanceof Error ? err.message : String(err),
    });
  }
}

async function readOptionalValidate(
  path: string,
  present: boolean,
): Promise<GhostValidateDocument | undefined> {
  if (!present) return undefined;
  const parsed = parseYaml(await readFile(path, "utf-8"));
  const result = GhostValidateSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `fingerprint/validate.yml failed schema validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data as GhostValidateDocument;
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
