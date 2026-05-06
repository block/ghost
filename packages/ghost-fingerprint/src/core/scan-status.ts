import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { MAP_FILENAME, SURVEY_FILENAME } from "@ghost/core";
import { FINGERPRINT_FILENAME } from "./index.js";

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

export type ScanStage = "map" | "survey" | "fingerprint";

export interface ScanStatus {
  /** Absolute path to the scan directory. */
  dir: string;
  map: ScanStageReport;
  survey: ScanStageReport;
  fingerprint: ScanStageReport;
  /**
   * The next stage an orchestrator should run, or `null` if every stage
   * is `present`. Stages run in order: map → survey → fingerprint.
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
 *   - fingerprint → `fingerprint.md`
 *
 * Hash-keyed freshness (`.scan-meta.json` with input/output hashes per
 * stage) is the planned enhancement. For now, orchestrators that want
 * "force rerun" behavior delete the artifact themselves before calling
 * scan-status — same idiom design-world-model already uses.
 */
export async function scanStatus(dirPath: string): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const mapPath = resolve(dir, MAP_FILENAME);
  const surveyPath = resolve(dir, SURVEY_FILENAME);
  const fingerprintPath = resolve(dir, FINGERPRINT_FILENAME);

  const [mapPresent, surveyPresent, fingerprintPresent] = await Promise.all([
    pathExists(mapPath),
    pathExists(surveyPath),
    pathExists(fingerprintPath),
  ]);

  const map: ScanStageReport = {
    state: mapPresent ? "present" : "missing",
    path: mapPath,
  };
  const survey: ScanStageReport = {
    state: surveyPresent ? "present" : "missing",
    path: surveyPath,
  };
  const fingerprint: ScanStageReport = {
    state: fingerprintPresent ? "present" : "missing",
    path: fingerprintPath,
  };

  let recommended_next: ScanStage | null = null;
  if (map.state === "missing") recommended_next = "map";
  else if (survey.state === "missing") recommended_next = "survey";
  else if (fingerprint.state === "missing") recommended_next = "fingerprint";

  return { dir, map, survey, fingerprint, recommended_next };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}
