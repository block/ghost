#!/usr/bin/env node

import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
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

import type { DesignFingerprint, EmbeddingConfig } from "@ghost/core";
import {
  compareFingerprints,
  computeTemporalComparison,
  diff,
  formatCLIReport,
  formatComparison,
  formatComparisonJSON,
  formatComplianceCLI,
  formatComplianceJSON,
  formatComplianceSARIF,
  formatDiffCLI,
  formatDiffJSON,
  formatDiscoveryCLI,
  formatDiscoveryJSON,
  formatFingerprint,
  formatFingerprintJSON,
  formatJSONReport,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  loadConfig,
  loadExpression,
  profile,
  profileMultiTarget,
  profileRegistry,
  profileTarget,
  readHistory,
  readSyncManifest,
  resolveTarget,
  scan,
  serializeExpression,
} from "@ghost/core";
import { cac } from "cac";
import { registerContextCommand } from "./context-command.js";
import {
  registerAckCommand,
  registerAdoptCommand,
  registerDivergeCommand,
  registerFleetCommand,
} from "./evolution-commands.js";
import { registerExprDiffCommand } from "./expr-diff-command.js";
import { registerGenerateCommand } from "./generate-command.js";
import { registerLintCommand } from "./lint-command.js";
import { registerReviewCommand } from "./review-command.js";
import { registerVerifyCommand } from "./verify-command.js";
import { registerVizCommand } from "./viz-command.js";

const cli = cac("ghost");

// --- scan ---
cli
  .command("scan", "Scan for design drift")
  .option("-c, --config <path>", "Path to ghost config file")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .option("--no-color", "Disable colored output")
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts.config);
      const report = await scan(config);
      const output =
        opts.format === "json"
          ? formatJSONReport(report)
          : formatCLIReport(report);
      process.stdout.write(output);
      process.exit(report.summary.errors > 0 ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// --- profile ---
cli
  .command(
    "profile [...targets]",
    "Generate a design fingerprint — accepts one or more targets (directory, URL, npm package, GitHub repo)",
  )
  .option("-c, --config <path>", "Path to ghost config file")
  .option(
    "-r, --registry <path>",
    "Path or URL to a registry.json (profiles registry directly)",
  )
  .option("-o, --output <file>", "Write fingerprint to file")
  .option(
    "--emit",
    "Write expression.md to project root (publishable artifact)",
  )
  .option(
    "--emit-legacy",
    "Write legacy .ghost-fingerprint.json instead of expression.md (deprecated escape hatch)",
  )
  .option("--ai", "Enable AI-powered enrichment (requires LLM API key)")
  .option(
    "--max-iterations <n>",
    "Maximum agent iterations for exploration (default: 99). Lower for faster/cheaper runs.",
  )
  .option("-v, --verbose", "Show agent reasoning")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (targets: string[], opts) => {
    try {
      let fingerprint: DesignFingerprint;

      if (opts.registry) {
        let embeddingConfig: EmbeddingConfig | undefined;
        try {
          const cfg = await loadConfig(opts.config);
          embeddingConfig = cfg.embedding;
        } catch {
          // No config file is fine
        }
        fingerprint = await profileRegistry(opts.registry, embeddingConfig);
      } else {
        const targetStrings = targets.length > 0 ? targets : ["."];
        const maxIterations = opts.maxIterations
          ? Number.parseInt(String(opts.maxIterations), 10)
          : undefined;

        if (targetStrings.length === 1 && targetStrings[0] === ".") {
          const config = await loadConfig(opts.config);
          fingerprint = await profile(config, {
            emit: opts.emit || opts.emitLegacy,
            emitFormat: opts.emitLegacy ? "json" : "md",
          });
        } else if (targetStrings.length === 1) {
          const config = await loadConfig(opts.config);
          const target = resolveTarget(targetStrings[0]);

          if (opts.verbose) {
            console.log(`Profiling ${target.type}: ${target.value}`);
          }

          const result = await profileTarget(target, config);
          fingerprint = result.fingerprint;

          if (opts.verbose) printVerboseResult(result);
        } else {
          const config = await loadConfig(opts.config);
          const ts = targetStrings.map((s) => resolveTarget(s));

          if (opts.verbose) {
            console.log(`Profiling ${ts.length} sources:`);
            for (const t of ts) console.log(`  ${t.type}: ${t.value}`);
            console.log();
          }

          const result = await profileMultiTarget(ts, config, {
            maxIterations,
          });
          fingerprint = result.fingerprint;

          if (opts.verbose) printVerboseResult(result);
        }
      }

      const output =
        opts.format === "json"
          ? formatFingerprintJSON(fingerprint)
          : formatFingerprint(fingerprint);

      if (opts.output) {
        const content = opts.output.endsWith(".md")
          ? serializeExpression(fingerprint)
          : formatFingerprintJSON(fingerprint);
        await writeFile(opts.output, content);
        console.log(`Fingerprint written to ${opts.output}`);
      }

      if (opts.emit || opts.emitLegacy) {
        const filename = opts.emitLegacy
          ? ".ghost-fingerprint.json"
          : "expression.md";
        console.log(`Published ${filename}`);
      }

      process.stdout.write(`${output}\n`);
      process.exit(0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

function printVerboseResult(result: {
  confidence: number;
  reasoning: string[];
  warnings: string[];
}) {
  console.log(`Confidence: ${result.confidence.toFixed(2)}`);
  for (const r of result.reasoning) {
    console.log(`  ${r}`);
  }
  if (result.warnings.length > 0) {
    console.log("Warnings:");
    for (const w of result.warnings) {
      console.log(`  ! ${w}`);
    }
  }
  console.log();
}

// --- compare ---
cli
  .command("compare <source> <target>", "Compare two design fingerprints")
  .option(
    "--temporal",
    "Include temporal data: velocity, trajectory, ack status",
  )
  .option(
    "--history-dir <dir>",
    "Directory containing .ghost/history.jsonl (for --temporal, defaults to cwd)",
  )
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (source: string, target: string, opts) => {
    try {
      const [srcParsed, tgtParsed] = await Promise.all([
        loadExpression(source),
        loadExpression(target),
      ]);
      const src = srcParsed.fingerprint;
      const tgt = tgtParsed.fingerprint;

      const comparison = compareFingerprints(src, tgt, {
        includeVectors: opts.temporal,
      });

      if (opts.temporal) {
        const historyDir = opts.historyDir ?? process.cwd();
        const [history, manifest] = await Promise.all([
          readHistory(historyDir),
          readSyncManifest(historyDir),
        ]);

        const temporal = computeTemporalComparison({
          comparison,
          history,
          manifest,
        });

        const output =
          opts.format === "json"
            ? formatTemporalComparisonJSON(temporal)
            : formatTemporalComparison(temporal);

        process.stdout.write(`${output}\n`);
        process.exit(temporal.distance > 0.5 ? 1 : 0);
        return;
      }

      const output =
        opts.format === "json"
          ? formatComparisonJSON(comparison)
          : formatComparison(comparison);

      process.stdout.write(`${output}\n`);
      process.exit(comparison.distance > 0.5 ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// --- diff ---
cli
  .command(
    "diff [component]",
    "Compare local components against registry with drift analysis",
  )
  .option("-c, --config <path>", "Path to ghost config file")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (component: string | undefined, opts) => {
    try {
      const config = await loadConfig(opts.config);
      const results = await diff(config, component || undefined);

      const output =
        opts.format === "json"
          ? formatDiffJSON(results)
          : formatDiffCLI(results);

      process.stdout.write(output);

      const hasBreaking = results.some((r) =>
        r.components.some((c) => c.severity === "error"),
      );
      process.exit(hasBreaking ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// --- discover ---
cli
  .command("discover [query]", "Find public design systems matching a query")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (query: string | undefined, opts) => {
    try {
      const { Director } = await import("@ghost/core");
      const config = await loadConfig().catch(() => undefined);
      const director = new Director();
      const result = await director.discover(
        { query: query || undefined },
        { llm: config?.llm ?? (undefined as never) },
      );

      const output =
        opts.format === "json"
          ? formatDiscoveryJSON(result.data)
          : formatDiscoveryCLI(result.data);

      process.stdout.write(`${output}\n`);
      process.exit(0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// --- comply ---
cli
  .command(
    "comply [target]",
    "Check design system compliance against rules and parent",
  )
  .option(
    "--against <path>",
    "Path to parent fingerprint JSON to check drift against",
  )
  .option("--max-drift <n>", "Maximum overall drift distance (default: 0.3)", {
    default: "0.3",
  })
  .option("-c, --config <path>", "Path to ghost config file")
  .option("--format <fmt>", "Output format: cli, json, or sarif", {
    default: "cli",
  })
  .option("-v, --verbose", "Show agent reasoning")
  .action(async (target: string | undefined, opts) => {
    try {
      const { Director } = await import("@ghost/core");
      const config = await loadConfig(opts.config);
      const targetStr = target || ".";
      const resolvedTarget = resolveTarget(targetStr);

      let parentFingerprint: DesignFingerprint | undefined;
      if (opts.against) {
        parentFingerprint = (await loadExpression(opts.against)).fingerprint;
      }

      const director = new Director();
      const { fingerprint, compliance } = await director.comply(
        resolvedTarget,
        {
          parentFingerprint,
          thresholds: {
            maxOverallDrift: Number.parseFloat(String(opts.maxDrift)),
          },
        },
        {
          llm: config.llm ?? (undefined as never),
          embedding: config.embedding,
          verbose: opts.verbose,
        },
      );

      if (opts.verbose) {
        console.log(`Profiled ${resolvedTarget.type}: ${resolvedTarget.value}`);
        console.log(`Confidence: ${fingerprint.confidence.toFixed(2)}`);
        console.log();
      }

      let output: string;
      if (opts.format === "sarif") {
        output = formatComplianceSARIF(compliance.data);
      } else if (opts.format === "json") {
        output = formatComplianceJSON(compliance.data);
      } else {
        output = formatComplianceCLI(compliance.data);
      }

      process.stdout.write(`${output}\n`);
      process.exit(compliance.data.passed ? 0 : 1);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  });

// Commands defined in other files register themselves on the same cli instance
registerReviewCommand(cli);
registerFleetCommand(cli);
registerAckCommand(cli);
registerAdoptCommand(cli);
registerDivergeCommand(cli);
registerVizCommand(cli);
registerContextCommand(cli);
registerGenerateCommand(cli);
registerVerifyCommand(cli);
registerLintCommand(cli);
registerExprDiffCommand(cli);

cli.help();
cli.version("0.2.0");
cli.parse();
