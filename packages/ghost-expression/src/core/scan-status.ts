import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { BUCKET_FILENAME, MAP_FILENAME } from "@ghost/core";
import { EXPRESSION_FILENAME } from "./index.js";

/**
 * Per-stage state in a scan directory.
 *
 *   `missing` — the artifact doesn't exist yet.
 *   `present` — the artifact exists. Existence is the only signal v1
 *     surfaces; hash-based freshness (`stale` vs `present`) is a planned
 *     enhancement once `.scan-meta.json` is in play.
 */
export type ScanStageState = "missing" | "present";

export interface ScanStageReport {
  state: ScanStageState;
  /** Absolute path to the artifact (whether it exists or not). */
  path: string;
}

export type ScanStage = "topology" | "objective" | "subjective";

export interface ScanStatus {
  /** Absolute path to the scan directory. */
  dir: string;
  topology: ScanStageReport;
  objective: ScanStageReport;
  subjective: ScanStageReport;
  /**
   * The next stage an orchestrator should run, or `null` if every stage
   * is `present`. Stages run in order: topology → objective → subjective.
   * The recommendation surfaces the first stage in `missing` state.
   */
  recommended_next: ScanStage | null;
}

/**
 * Inspect a scan directory and report which stages have produced artifacts.
 *
 * Existence-only check today. The artifacts checked are:
 *
 *   - topology   → `map.md`
 *   - objective  → `bucket.json`
 *   - subjective → `expression.md`
 *
 * Hash-keyed freshness (`.scan-meta.json` with input/output hashes per
 * stage) is the planned enhancement. For v1, orchestrators that want
 * "force rerun" behavior delete the artifact themselves before calling
 * scan-status — same idiom design-world-model already uses.
 */
export async function scanStatus(dirPath: string): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const mapPath = resolve(dir, MAP_FILENAME);
  const bucketPath = resolve(dir, BUCKET_FILENAME);
  const expressionPath = resolve(dir, EXPRESSION_FILENAME);

  const [topologyPresent, objectivePresent, subjectivePresent] =
    await Promise.all([
      pathExists(mapPath),
      pathExists(bucketPath),
      pathExists(expressionPath),
    ]);

  const topology: ScanStageReport = {
    state: topologyPresent ? "present" : "missing",
    path: mapPath,
  };
  const objective: ScanStageReport = {
    state: objectivePresent ? "present" : "missing",
    path: bucketPath,
  };
  const subjective: ScanStageReport = {
    state: subjectivePresent ? "present" : "missing",
    path: expressionPath,
  };

  let recommended_next: ScanStage | null = null;
  if (topology.state === "missing") recommended_next = "topology";
  else if (objective.state === "missing") recommended_next = "objective";
  else if (subjective.state === "missing") recommended_next = "subjective";

  return { dir, topology, objective, subjective, recommended_next };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}
