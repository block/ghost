import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  GHOST_CHECKS_FILENAME,
  getEffectiveMapScopes,
  MAP_FILENAME,
  type MapFrontmatter,
  MapFrontmatterSchema,
  SURVEY_FILENAME,
} from "@ghost/core";
import { parse as parseYaml } from "yaml";
import {
  FINGERPRINTS_DIRNAME,
  PROFILE_FILENAME,
  SCOPE_SURVEYS_DIRNAME,
} from "./constants.js";

/**
 * Per-stage state in a scan directory.
 *
 *   `missing` — the artifact doesn't exist yet.
 *   `present` — the artifact exists. Existence is the only signal this
 *     surfaces; hash-based freshness (`stale` vs `present`) is a planned
 *     enhancement once `.scan-meta.json` is in play.
 */
export type ScanStageState = "missing" | "present";

export interface ScanStageReport {
  state: ScanStageState;
  /** Absolute path to the artifact (whether it exists or not). */
  path: string;
}

export type ScanStage = "map" | "survey" | "profile" | "checks";

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
  /** Absolute path to the scan directory. */
  dir: string;
  map: ScanStageReport;
  survey: ScanStageReport;
  profile: ScanStageReport;
  checks: ScanStageReport;
  scopes?: ScanScopeReport[];
  scope_error?: string;
  /**
   * The next stage an orchestrator should run, or `null` if every stage
   * is `present`. Stages run in order: map → survey → profile → checks.
   * The recommendation surfaces the first stage in `missing` state.
   */
  recommended_next: ScanStage | null;
}

/**
 * Inspect a scan directory and report which stages have produced artifacts.
 *
 * Existence-only check today. The artifacts checked are:
 *
 *   - map        → `map.md`
 *   - survey     → `survey.json`
 *   - profile    → `profile.md`
 *   - checks     → `checks.yml`
 *
 * Hash-keyed freshness (`.scan-meta.json` with input/output hashes per
 * stage) is the planned enhancement. For now, orchestrators that want
 * "force rerun" behavior delete the artifact themselves before calling
 * scan-status — same idiom design-world-model already uses.
 */
export async function scanStatus(
  dirPath: string,
  options: ScanStatusOptions = {},
): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const mapPath = resolve(dir, MAP_FILENAME);
  const surveyPath = resolve(dir, SURVEY_FILENAME);
  const profilePath = resolve(dir, PROFILE_FILENAME);
  const checksPath = resolve(dir, GHOST_CHECKS_FILENAME);

  const [mapPresent, surveyPresent, profilePresent, checksPresent] =
    await Promise.all([
      pathExists(mapPath),
      pathExists(surveyPath),
      pathExists(profilePath),
      pathExists(checksPath),
    ]);

  const map: ScanStageReport = {
    state: mapPresent ? "present" : "missing",
    path: mapPath,
  };
  const survey: ScanStageReport = {
    state: surveyPresent ? "present" : "missing",
    path: surveyPath,
  };
  const profile: ScanStageReport = {
    state: profilePresent ? "present" : "missing",
    path: profilePath,
  };
  const checks: ScanStageReport = {
    state: checksPresent ? "present" : "missing",
    path: checksPath,
  };

  let recommended_next: ScanStage | null = null;
  if (map.state === "missing") recommended_next = "map";
  else if (survey.state === "missing") recommended_next = "survey";
  else if (profile.state === "missing") recommended_next = "profile";
  else if (checks.state === "missing") recommended_next = "checks";

  const status: ScanStatus = {
    dir,
    map,
    survey,
    profile,
    checks,
    recommended_next,
  };

  if (options.includeScopes) {
    try {
      status.scopes = await scanScopes(dir, mapPath, map.state === "present");
    } catch (err) {
      status.scope_error = err instanceof Error ? err.message : String(err);
      status.scopes = [];
    }
  }

  return status;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 0;
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
