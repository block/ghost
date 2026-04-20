#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env from project root if present.
for (const envFile of [".env", ".env.local"]) {
  const envPath = resolve(process.cwd(), envFile);
  if (existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Node < 20.12 or malformed file — silently skip
    }
  }
}

import { readFile } from "node:fs/promises";
import {
  compare,
  FINGERPRINT_FILENAME,
  formatComparison,
  formatComparisonJSON,
  formatFleetComparison,
  formatFleetComparisonJSON,
  formatSemanticDiff,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  lintFingerprint,
  loadFingerprint,
  readHistory,
  readSyncManifest,
} from "@ghost/core";
import { cac } from "cac";
import { registerEmitCommand } from "./emit-command.js";
import {
  registerAckCommand,
  registerAdoptCommand,
  registerDivergeCommand,
} from "./evolution-commands.js";

const cli = cac("ghost");

// --- compare ---
// N=2 → pairwise (with optional --semantic / --temporal enrichment).
// N≥3 → fleet (pairwise matrix + clusters).
cli
  .command(
    "compare [...fingerprints]",
    "Compare two or more fingerprints (N≥3 = fleet).",
  )
  .option("--semantic", "Qualitative diff of decisions + palette (N=2 only)")
  .option(
    "--temporal",
    "Add velocity, trajectory, and ack bounds (N=2, reads .ghost/history.jsonl)",
  )
  .option(
    "--history-dir <dir>",
    "Directory containing .ghost/history.jsonl (for --temporal, defaults to cwd)",
  )
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (fingerprints: string[], opts) => {
    try {
      const parsed = await Promise.all(
        fingerprints.map((path) => loadFingerprint(path)),
      );
      const exprs = parsed.map((p) => p.fingerprint);

      let history: Awaited<ReturnType<typeof readHistory>> | undefined;
      let manifest: Awaited<ReturnType<typeof readSyncManifest>> | null = null;
      if (opts.temporal) {
        const historyDir = opts.historyDir ?? process.cwd();
        [history, manifest] = await Promise.all([
          readHistory(historyDir),
          readSyncManifest(historyDir),
        ]);
      }

      const result = compare(exprs, {
        semantic: Boolean(opts.semantic),
        history,
        manifest,
      });

      const isJson = opts.format === "json";

      if (result.mode === "fleet") {
        const output = isJson
          ? formatFleetComparisonJSON(result.fleet)
          : formatFleetComparison(result.fleet);
        process.stdout.write(`${output}\n`);
        process.exit(0);
      }

      if (result.semantic) {
        if (isJson) {
          process.stdout.write(`${JSON.stringify(result.semantic, null, 2)}\n`);
        } else {
          process.stdout.write(formatSemanticDiff(result.semantic));
        }
        process.exit(result.semantic.unchanged ? 0 : 1);
      }

      if (result.temporal) {
        const output = isJson
          ? formatTemporalComparisonJSON(result.temporal)
          : formatTemporalComparison(result.temporal);
        process.stdout.write(`${output}\n`);
        process.exit(result.temporal.distance > 0.5 ? 1 : 0);
      }

      const output = isJson
        ? formatComparisonJSON(result.comparison)
        : formatComparison(result.comparison);
      process.stdout.write(`${output}\n`);
      process.exit(result.comparison.distance > 0.5 ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// --- lint ---
cli
  .command(
    "lint [fingerprint]",
    "Validate fingerprint.md schema and body/frontmatter coherence",
  )
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (path: string | undefined, opts) => {
    try {
      const target = resolve(process.cwd(), path ?? FINGERPRINT_FILENAME);
      const raw = await readFile(target, "utf-8");
      const report = lintFingerprint(raw);

      if (opts.format === "json") {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        for (const issue of report.issues) {
          const prefix =
            issue.severity === "error"
              ? "ERROR"
              : issue.severity === "warning"
                ? "WARN "
                : "INFO ";
          const pathSuffix = issue.path ? ` @ ${issue.path}` : "";
          process.stdout.write(
            `${prefix} [${issue.rule}] ${issue.message}${pathSuffix}\n`,
          );
        }
        process.stdout.write(
          `\n${report.errors} error(s), ${report.warnings} warning(s), ${report.info} info\n`,
        );
      }

      process.exit(report.errors > 0 ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// Commands defined in other files register themselves on the same cli instance
registerAckCommand(cli);
registerAdoptCommand(cli);
registerDivergeCommand(cli);
registerEmitCommand(cli);

cli.help();
cli.version("0.2.0");
cli.parse();
