import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CAC } from "cac";
import type { Fingerprint, SyncManifest, Target } from "#ghost-core";
import { compareFingerprints } from "#ghost-core";
import { loadComparableFingerprint } from "./comparable-fingerprint.js";
import {
  buildGateReport,
  formatGateReportCLI,
  type GateReport,
  gateExitCode,
  loadConfig,
  resolveTarget,
  resolveTrackedFingerprint,
} from "./core/index.js";
import {
  readOptionalPackageConfig,
  resolveFingerprintPackage,
} from "./fingerprint.js";

const DEFAULT_SYNC_PATH = ".ghost-sync.json";
const DRIFT_STATUS_SCHEMA = "ghost.drift.status/v1" as const;
const DRIFT_CHECK_SCHEMA = "ghost.drift.check/v1" as const;

export type DesignLoopMode = "off" | "advisory" | "required";

export interface DriftStatusReport {
  schema: typeof DRIFT_STATUS_SCHEMA;
  designLoop: {
    enabled: boolean;
    mode: DesignLoopMode;
    source: "config" | "default";
  };
  fingerprintDir: string;
  configPath: string;
}

export interface DriftCheckReport {
  schema: typeof DRIFT_CHECK_SCHEMA;
  designLoop: DriftStatusReport["designLoop"];
  trackedFingerprintId: string;
  localFingerprintId: string;
  overall: GateReport["overall"];
  dimensions: GateReport["dimensions"];
  gate: GateReport;
}

interface DriftStatusOptions {
  cwd?: string;
  packageDir?: string;
}

interface DriftCheckOptions extends DriftStatusOptions {
  config?: string;
  local?: string;
  tracked?: string;
  sync?: string;
  maxDivergenceDays?: number | string;
}

export async function getDriftStatus(
  options: DriftStatusOptions = {},
): Promise<DriftStatusReport> {
  const cwd = options.cwd ?? process.cwd();
  const paths = resolveFingerprintPackage(options.packageDir, cwd);
  const config = await readOptionalPackageConfig(paths.config);
  const designLoop = config?.design_loop ?? { enabled: false, mode: "off" };

  return {
    schema: DRIFT_STATUS_SCHEMA,
    designLoop: {
      enabled: designLoop.enabled,
      mode: designLoop.mode,
      source: config ? "config" : "default",
    },
    fingerprintDir: paths.fingerprintDir,
    configPath: paths.config,
  };
}

export async function runDriftCheck(
  options: DriftCheckOptions = {},
): Promise<DriftCheckReport> {
  const cwd = options.cwd ?? process.cwd();
  const status = await getDriftStatus(options);
  const manifest = await readSyncManifest(cwd, options.sync);
  const local = await loadLocalFingerprint(
    cwd,
    options.local,
    options.packageDir,
  );
  const tracked = await loadTrackedFingerprint(cwd, {
    explicitPath: options.tracked,
    configPath: options.config,
    ledgerTarget: manifest.tracks,
  });
  validateManifestFingerprintIds(manifest, { local, tracked });
  const maxDivergenceDays = parseMaxDivergenceDays(options.maxDivergenceDays);
  if (maxDivergenceDays === "invalid") {
    throw new Error("--max-divergence-days must be a non-negative integer.");
  }

  const comparison = compareFingerprints(tracked, local);
  const gate = buildGateReport({
    comparison,
    manifest,
    maxDivergenceDays,
  });

  return {
    schema: DRIFT_CHECK_SCHEMA,
    designLoop: status.designLoop,
    trackedFingerprintId: gate.trackedFingerprintId,
    localFingerprintId: gate.localFingerprintId,
    overall: gate.overall,
    dimensions: gate.dimensions,
    gate,
  };
}

export function formatDriftStatusMarkdown(report: DriftStatusReport): string {
  return [
    "# Ghost drift status",
    "",
    `Design loop: ${report.designLoop.enabled ? "enabled" : "disabled"} (${report.designLoop.mode})`,
    `Source: ${report.designLoop.source}`,
    `Fingerprint dir: ${report.fingerprintDir}`,
    `Config: ${report.configPath}`,
    "",
  ].join("\n");
}

export function formatDriftCheckMarkdown(report: DriftCheckReport): string {
  const lines = [
    "# Ghost drift check",
    "",
    `Design loop: ${report.designLoop.enabled ? "enabled" : "disabled"} (${report.designLoop.mode})`,
    "",
    formatGateReportCLI(report.gate).trimEnd(),
    "",
  ];
  return lines.join("\n");
}

export function registerDriftCommand(cli: CAC): void {
  cli
    .command(
      "drift <action>",
      "Inspect continuous design-loop drift status or run the stance-ledger check.",
    )
    .option("--package <dir>", "Exact fingerprint package directory")
    .option("--config <path>", "Path to ghost config file for tracked source")
    .option("--local <path>", "Local fingerprint or bundle to check")
    .option("--tracked <path>", "Tracked/reference fingerprint or bundle")
    .option("--sync <path>", "Sync manifest path (default: ./.ghost-sync.json)")
    .option(
      "--max-divergence-days <n>",
      "Flag diverging dimensions older than this many days as uncovered",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (action: string, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        if (action === "status") {
          const report = await getDriftStatus({
            packageDir:
              typeof opts.package === "string" ? opts.package : undefined,
          });
          await writeAndFlush(
            opts.format === "json"
              ? `${JSON.stringify(report, null, 2)}\n`
              : formatDriftStatusMarkdown(report),
          );
          process.exit(0);
          return;
        }

        if (action !== "check") {
          console.error(
            "Error: unknown drift action. Supported: status, check",
          );
          process.exit(2);
          return;
        }

        const report = await runDriftCheck({
          packageDir:
            typeof opts.package === "string" ? opts.package : undefined,
          config: typeof opts.config === "string" ? opts.config : undefined,
          local: typeof opts.local === "string" ? opts.local : undefined,
          tracked: typeof opts.tracked === "string" ? opts.tracked : undefined,
          sync: typeof opts.sync === "string" ? opts.sync : undefined,
          maxDivergenceDays: opts.maxDivergenceDays,
        });
        await writeAndFlush(
          opts.format === "json"
            ? `${JSON.stringify(report, null, 2)}\n`
            : formatDriftCheckMarkdown(report),
        );
        process.exit(gateExitCode(report.gate));
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}

async function readSyncManifest(
  cwd: string,
  syncPathOption: string | undefined,
): Promise<SyncManifest> {
  const syncPath = resolve(cwd, syncPathOption ?? DEFAULT_SYNC_PATH);
  if (!existsSync(syncPath)) {
    throw new Error(
      `sync manifest not found at ${syncPath}. Run \`ghost track\` or \`ghost ack\` first, or pass --sync <path>.`,
    );
  }
  const manifest = JSON.parse(
    await readFile(syncPath, "utf-8"),
  ) as SyncManifest;
  if (!manifest || typeof manifest !== "object" || !manifest.dimensions) {
    throw new Error(
      `sync manifest at ${syncPath} is malformed (missing dimensions).`,
    );
  }
  return manifest;
}

function validateManifestFingerprintIds(
  manifest: SyncManifest,
  fingerprints: { local: Fingerprint; tracked: Fingerprint },
): void {
  if (
    manifest.trackedFingerprintId &&
    manifest.trackedFingerprintId !== fingerprints.tracked.id
  ) {
    throw new Error(
      `sync manifest tracks fingerprint "${manifest.trackedFingerprintId}" but resolved tracked fingerprint "${fingerprints.tracked.id}". Run \`ghost track\`/\`ghost ack\` for this tracked source, or pass the matching --sync manifest.`,
    );
  }
  if (
    manifest.localFingerprintId &&
    manifest.localFingerprintId !== fingerprints.local.id
  ) {
    throw new Error(
      `sync manifest was recorded for local fingerprint "${manifest.localFingerprintId}" but resolved local fingerprint "${fingerprints.local.id}". Run \`ghost ack\` for the current local fingerprint, or pass the matching --sync manifest.`,
    );
  }
}

async function writeAndFlush(text: string): Promise<void> {
  await new Promise<void>((resolve) => {
    process.stdout.write(text, () => resolve());
  });
}

async function loadLocalFingerprint(
  cwd: string,
  localPath: string | undefined,
  packageDir: string | undefined,
): Promise<Fingerprint> {
  const source = localPath ?? packageDir ?? ".ghost";
  try {
    return await loadComparableFingerprintFrom(cwd, source);
  } catch (err) {
    const defaultPackage = !localPath && !packageDir;
    const manifestPath = resolve(cwd, source, "fingerprint", "manifest.yml");
    if (!defaultPackage || existsSync(manifestPath)) throw err;
    return await loadComparableFingerprintFrom(cwd, ".ghost/fingerprint.md");
  }
}

async function loadTrackedFingerprint(
  cwd: string,
  options: {
    explicitPath?: string;
    configPath?: string;
    ledgerTarget?: Target | string;
  },
): Promise<Fingerprint> {
  if (options.explicitPath) {
    return loadComparableFingerprintFrom(cwd, options.explicitPath);
  }

  const config = await loadConfig({ configPath: options.configPath, cwd });
  const target = config.tracks ?? normalizeTarget(options.ledgerTarget);
  if (!target) {
    throw new Error(
      "No tracked fingerprint declared. Set `tracks` in ghost.config.ts/js, run `ghost track`, or pass --tracked <path>.",
    );
  }
  return loadTargetFingerprint(cwd, target);
}

function normalizeTarget(
  value: Target | string | undefined,
): Target | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? resolveTarget(value) : value;
}

async function loadTargetFingerprint(
  cwd: string,
  target: Target,
): Promise<Fingerprint> {
  if (target.type === "path") {
    return loadComparableFingerprintFrom(cwd, target.value);
  }
  if (target.type === "npm") {
    const packageGhostDir = resolve(
      cwd,
      "node_modules",
      target.value,
      ".ghost",
    );
    if (
      existsSync(resolve(packageGhostDir, "fingerprint", "manifest.yml")) ||
      existsSync(resolve(packageGhostDir, "fingerprint.md"))
    ) {
      return loadComparableFingerprintFrom(cwd, packageGhostDir);
    }
  }
  return resolveTrackedFingerprint(target, cwd);
}

async function loadComparableFingerprintFrom(
  cwd: string,
  path: string,
): Promise<Fingerprint> {
  const previousCwd = process.cwd();
  try {
    process.chdir(cwd);
    return await loadComparableFingerprint(path);
  } finally {
    process.chdir(previousCwd);
  }
}

function parseMaxDivergenceDays(
  raw: number | string | undefined,
): number | undefined | "invalid" {
  if (raw === undefined) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return "invalid";
  return n;
}
