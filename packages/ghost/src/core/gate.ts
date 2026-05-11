import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  DimensionAck,
  Fingerprint,
  FingerprintComparison,
  SyncManifest,
} from "@ghost/core";
import type { CompareResult } from "./compare.js";
import { checkBounds } from "./evolution/sync.js";

const DEFAULT_SYNC_PATH = ".ghost-sync.json";

const GATE_SCHEMA = "ghost.compare.gate/v1" as const;
const ALIGNED_THRESHOLD = 0.01;
const DEFAULT_TOLERANCE = 0.05;

export type GateDimensionVerdict =
  | "aligned"
  | "covered"
  | "reconverging"
  | "uncovered";

export type GateOverallVerdict = "aligned" | "covered" | "uncovered";

export interface GateDimensionReport {
  distance: number;
  ackDistance?: number;
  stance?: DimensionAck["stance"];
  verdict: GateDimensionVerdict;
  reason?: string;
}

export interface GateReport {
  schema: typeof GATE_SCHEMA;
  trackedFingerprintId: string;
  localFingerprintId: string;
  overall: {
    distance: number;
    verdict: GateOverallVerdict;
  };
  dimensions: Record<string, GateDimensionReport>;
}

export interface BuildGateReportArgs {
  comparison: FingerprintComparison;
  manifest: SyncManifest;
  tolerance?: number;
  maxDivergenceDays?: number;
}

/**
 * Reconcile a pairwise comparison against a recorded sync manifest and
 * produce a per-dimension verdict suitable for CI / programmatic gating.
 *
 * Composes over the existing `checkBounds` helper: a dimension is
 * `uncovered` when checkBounds flags it (or when the comparison surfaces
 * a dimension the manifest doesn't cover), `reconverging` when checkBounds
 * marks it as such, `aligned` when the current distance is ~0, and
 * otherwise `covered`.
 */
export function buildGateReport(args: BuildGateReportArgs): GateReport {
  const { comparison, manifest } = args;
  const tolerance = args.tolerance ?? DEFAULT_TOLERANCE;

  const bounds = checkBounds(manifest, comparison, {
    tolerance,
    maxDivergenceDays: args.maxDivergenceDays,
  });
  const exceededSet = new Set(bounds.dimensions);
  const reconvergingSet = new Set(bounds.reconverging);

  const dimensions: Record<string, GateDimensionReport> = {};

  for (const [key, delta] of Object.entries(comparison.dimensions)) {
    const ack = manifest.dimensions[key];
    const distance = delta.distance;

    if (!ack) {
      dimensions[key] = {
        distance,
        verdict: "uncovered",
        reason: "no ack recorded",
      };
      continue;
    }

    const effectiveTolerance = ack.tolerance ?? tolerance;

    if (exceededSet.has(key)) {
      const reason =
        ack.stance === "diverging"
          ? buildDivergenceExceededReason(ack, args.maxDivergenceDays)
          : `current ${formatNumber(distance)} exceeds acked ${formatNumber(
              ack.distance,
            )} + tolerance ${formatNumber(effectiveTolerance)}`;
      dimensions[key] = {
        distance,
        ackDistance: ack.distance,
        stance: ack.stance,
        verdict: "uncovered",
        reason,
      };
      continue;
    }

    if (reconvergingSet.has(key)) {
      dimensions[key] = {
        distance,
        ackDistance: ack.distance,
        stance: ack.stance,
        verdict: "reconverging",
      };
      continue;
    }

    if (
      ack.stance === "aligned" &&
      distance < ALIGNED_THRESHOLD &&
      ack.distance < ALIGNED_THRESHOLD
    ) {
      dimensions[key] = {
        distance,
        ackDistance: ack.distance,
        stance: ack.stance,
        verdict: "aligned",
      };
      continue;
    }

    dimensions[key] = {
      distance,
      ackDistance: ack.distance,
      stance: ack.stance,
      verdict: "covered",
    };
  }

  const verdicts = Object.values(dimensions).map((d) => d.verdict);
  let overall: GateOverallVerdict;
  if (verdicts.some((v) => v === "uncovered")) {
    overall = "uncovered";
  } else if (verdicts.length > 0 && verdicts.every((v) => v === "aligned")) {
    overall = "aligned";
  } else {
    overall = "covered";
  }

  return {
    schema: GATE_SCHEMA,
    trackedFingerprintId: comparison.source.id,
    localFingerprintId: comparison.target.id,
    overall: {
      distance: comparison.distance,
      verdict: overall,
    },
    dimensions,
  };
}

/**
 * Map a gate report to its CI exit code.
 * - 0 when no uncovered drift (aligned, covered, or reconverging).
 * - 1 when any dimension is uncovered.
 */
export function gateExitCode(report: GateReport): 0 | 1 {
  return report.overall.verdict === "uncovered" ? 1 : 0;
}

export function formatGateReportJSON(report: GateReport): string {
  return JSON.stringify(report);
}

const MARKERS: Record<GateDimensionVerdict, string> = {
  aligned: "✓",
  covered: "=",
  reconverging: "~",
  uncovered: "✗",
};

export function formatGateReportCLI(report: GateReport): string {
  const lines: string[] = [];
  lines.push(
    `Gate: ${report.trackedFingerprintId} vs ${report.localFingerprintId}`,
  );

  const dimEntries = Object.entries(report.dimensions);
  const nameWidth = dimEntries.reduce(
    (max, [name]) => Math.max(max, name.length),
    0,
  );

  for (const [name, dim] of dimEntries) {
    const marker = MARKERS[dim.verdict];
    const distance = formatPercent(dim.distance);
    const tail = dim.reason ? `  ${dim.reason}` : "";
    lines.push(
      `  ${marker} ${name.padEnd(nameWidth)}  ${distance.padStart(6)}  ${dim.verdict}${tail}`,
    );
  }

  lines.push("");
  lines.push(
    `Overall: ${report.overall.verdict} (${formatPercent(report.overall.distance)})`,
  );
  return `${lines.join("\n")}\n`;
}

function formatNumber(n: number): string {
  return Number.isFinite(n) ? n.toFixed(3).replace(/\.?0+$/, "") : String(n);
}

function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function buildDivergenceExceededReason(
  ack: DimensionAck,
  maxDivergenceDays?: number,
): string {
  if (maxDivergenceDays === undefined || !ack.divergedAt) {
    return "diverging stance exceeded recorded bounds";
  }
  const divergedDate = new Date(ack.divergedAt);
  const days = Math.floor(
    (Date.now() - divergedDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return `diverging for ${days} days exceeds --max-divergence-days ${maxDivergenceDays}`;
}

// --- CLI runner ---

export interface RunGateCliOptions {
  fingerprints: string[];
  cwd: string;
  sync?: unknown;
  format?: unknown;
  maxDivergenceDays?: unknown;
  loadFingerprint: (path: string) => Promise<Fingerprint>;
  compare: (fingerprints: Fingerprint[]) => CompareResult;
}

/**
 * CLI adapter for `ghost-drift compare --gate`. Validates inputs, loads
 * the sync manifest, runs the comparison, and writes the verdict to
 * stdout. Calls `process.exit` with the gate exit code (or 2 on error).
 */
export async function runGateCli(opts: RunGateCliOptions): Promise<void> {
  if (opts.fingerprints.length !== 2) {
    console.error(
      `Error: --gate requires exactly 2 fingerprints (got ${opts.fingerprints.length}).`,
    );
    process.exit(2);
    return;
  }

  const syncPath = resolve(
    opts.cwd,
    typeof opts.sync === "string" ? opts.sync : DEFAULT_SYNC_PATH,
  );
  if (!existsSync(syncPath)) {
    console.error(
      `Error: sync manifest not found at ${syncPath}. Run \`ghost-drift ack\` first or pass --sync <path>.`,
    );
    process.exit(2);
    return;
  }

  let manifest: SyncManifest;
  try {
    manifest = JSON.parse(await readFile(syncPath, "utf-8")) as SyncManifest;
  } catch (err) {
    console.error(
      `Error: failed to load sync manifest at ${syncPath}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    process.exit(2);
    return;
  }

  if (!manifest || typeof manifest !== "object" || !manifest.dimensions) {
    console.error(
      `Error: sync manifest at ${syncPath} is malformed (missing dimensions).`,
    );
    process.exit(2);
    return;
  }

  const maxDivergenceDays = parseMaxDivergenceDays(opts.maxDivergenceDays);
  if (maxDivergenceDays === "invalid") {
    console.error(
      "Error: --max-divergence-days must be a non-negative integer.",
    );
    process.exit(2);
    return;
  }

  const exprs = await Promise.all(opts.fingerprints.map(opts.loadFingerprint));
  const result = opts.compare(exprs);
  if (result.mode !== "pairwise") {
    console.error("Error: --gate requires pairwise comparison.");
    process.exit(2);
    return;
  }

  const report = buildGateReport({
    comparison: result.comparison,
    manifest,
    maxDivergenceDays:
      maxDivergenceDays === undefined ? undefined : maxDivergenceDays,
  });

  const output =
    opts.format === "json"
      ? formatGateReportJSON(report)
      : formatGateReportCLI(report);
  process.stdout.write(`${output}\n`);
  process.exit(gateExitCode(report));
}

function parseMaxDivergenceDays(raw: unknown): number | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return "invalid";
  return n;
}
