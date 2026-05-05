import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { MAP_FILENAME, SURVEY_FILENAME } from "@ghost/core";
import { EXPRESSION_FILENAME } from "./index.js";

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

export type ScanStage = "map" | "survey" | "expression";

export interface ScanStatus {
  /** Absolute path to the scan directory. */
  dir: string;
  map: ScanStageReport;
  survey: ScanStageReport;
  expression: ScanStageReport;
  /**
   * The next stage an orchestrator should run, or `null` if every stage
   * is `present`. Stages run in order: map → survey → expression.
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
 *   - expression → `expression.md`
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
  const expressionPath = resolve(dir, EXPRESSION_FILENAME);

  const [mapPresent, surveyPresent, expressionPresent] = await Promise.all([
    pathExists(mapPath),
    pathExists(surveyPath),
    pathExists(expressionPath),
  ]);

  const map: ScanStageReport = {
    state: mapPresent ? "present" : "missing",
    path: mapPath,
  };
  const survey: ScanStageReport = {
    state: surveyPresent ? "present" : "missing",
    path: surveyPath,
  };
  const expression: ScanStageReport = {
    state: expressionPresent ? "present" : "missing",
    path: expressionPath,
  };

  let recommended_next: ScanStage | null = null;
  if (map.state === "missing") recommended_next = "map";
  else if (survey.state === "missing") recommended_next = "survey";
  else if (expression.state === "missing") recommended_next = "expression";

  return { dir, map, survey, expression, recommended_next };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}
