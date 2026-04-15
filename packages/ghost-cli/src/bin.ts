#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
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
  formatReviewCLI,
  formatReviewJSON,
  formatGitHubPRComments,
  formatReviewSummary,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  loadConfig,
  profile,
  profileRegistry,
  profileTarget,
  readHistory,
  readSyncManifest,
  resolveTarget,
  review,
  scan,
} from "@ghost/core";
import { defineCommand, runMain } from "citty";
import {
  ackCommand,
  adoptCommand,
  divergeCommand,
  fleetCommand,
} from "./evolution-commands.js";
import { vizCommand } from "./viz-command.js";

const scanCommand = defineCommand({
  meta: {
    name: "scan",
    description: "Scan for design drift",
  },
  args: {
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
    "no-color": {
      type: "boolean",
      description: "Disable colored output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig(args.config);
      const report = await scan(config);

      const output =
        args.format === "json"
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
  },
});

const profileCommand = defineCommand({
  meta: {
    name: "profile",
    description:
      "Generate a design fingerprint for any target (directory, URL, npm package, GitHub repo)",
  },
  args: {
    target: {
      type: "positional",
      description:
        "Target to profile: path, URL, npm package, or owner/repo (defaults to current directory)",
      required: false,
    },
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    registry: {
      type: "string",
      description:
        "Path or URL to a registry.json (profiles registry directly)",
      alias: "r",
    },
    output: {
      type: "string",
      description: "Write fingerprint to file",
      alias: "o",
    },
    emit: {
      type: "boolean",
      description:
        "Write .ghost-fingerprint.json to project root (publishable artifact)",
      default: false,
    },
    ai: {
      type: "boolean",
      description: "Enable AI-powered enrichment (requires LLM API key)",
      default: false,
    },
    verbose: {
      type: "boolean",
      description: "Show agent reasoning",
      default: false,
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      let fingerprint: DesignFingerprint;

      if (args.registry) {
        let embeddingConfig: EmbeddingConfig | undefined;
        try {
          const config = await loadConfig(args.config);
          embeddingConfig = config.embedding;
        } catch {
          // No config file is fine
        }
        fingerprint = await profileRegistry(args.registry, embeddingConfig);
      } else if (args.target && args.target !== ".") {
        // Use the new target-based pipeline
        const config = await loadConfig(args.config);
        const target = resolveTarget(args.target);

        if (args.verbose) {
          console.log(
            `Profiling ${target.type}: ${target.value}`,
          );
        }

        const result = await profileTarget(target, config);
        fingerprint = result.fingerprint;

        if (args.verbose) {
          console.log(
            `Confidence: ${result.confidence.toFixed(2)}`,
          );
          for (const r of result.reasoning) {
            console.log(`  ${r}`);
          }
          if (result.warnings.length > 0) {
            console.log("Warnings:");
            for (const w of result.warnings) {
              console.log(`  ⚠ ${w}`);
            }
          }
          console.log();
        }
      } else {
        // Default: profile current directory with legacy pipeline
        const config = await loadConfig(args.config);
        fingerprint = await profile(config, { emit: args.emit });
      }

      const output =
        args.format === "json"
          ? formatFingerprintJSON(fingerprint)
          : formatFingerprint(fingerprint);

      if (args.output) {
        await writeFile(args.output, formatFingerprintJSON(fingerprint));
        console.log(`Fingerprint written to ${args.output}`);
      }

      if (args.emit) {
        console.log("Published .ghost-fingerprint.json");
      }

      process.stdout.write(`${output}\n`);
      process.exit(0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  },
});

const compareCommand = defineCommand({
  meta: {
    name: "compare",
    description: "Compare two design fingerprints",
  },
  args: {
    source: {
      type: "positional",
      description: "Path to source fingerprint JSON",
      required: true,
    },
    target: {
      type: "positional",
      description: "Path to target fingerprint JSON",
      required: true,
    },
    temporal: {
      type: "boolean",
      description: "Include temporal data: velocity, trajectory, ack status",
      default: false,
    },
    "history-dir": {
      type: "string",
      description:
        "Directory containing .ghost/history.jsonl (for --temporal, defaults to cwd)",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      const sourceData = await readFile(args.source, "utf-8");
      const targetData = await readFile(args.target, "utf-8");

      const source: DesignFingerprint = JSON.parse(sourceData);
      const target: DesignFingerprint = JSON.parse(targetData);

      const comparison = compareFingerprints(source, target, {
        includeVectors: args.temporal,
      });

      if (args.temporal) {
        const historyDir = args["history-dir"] ?? process.cwd();
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
          args.format === "json"
            ? formatTemporalComparisonJSON(temporal)
            : formatTemporalComparison(temporal);

        process.stdout.write(`${output}\n`);
        process.exit(temporal.distance > 0.5 ? 1 : 0);
        return;
      }

      const output =
        args.format === "json"
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
  },
});

const diffCommand = defineCommand({
  meta: {
    name: "diff",
    description:
      "Compare local components against registry with drift analysis",
  },
  args: {
    component: {
      type: "positional",
      description: "Component name (optional, all if omitted)",
      required: false,
    },
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig(args.config);
      const results = await diff(config, args.component || undefined);

      const output =
        args.format === "json"
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
  },
});

const discoverCommand = defineCommand({
  meta: {
    name: "discover",
    description: "Find public design systems matching a query",
  },
  args: {
    query: {
      type: "positional",
      description: "Search query (e.g., 'react', 'material', 'minimal')",
      required: false,
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      const { Director } = await import("@ghost/core");
      const config = await loadConfig().catch(() => undefined);
      const director = new Director();
      const result = await director.discover(
        { query: args.query || undefined },
        { llm: config?.llm ?? (undefined as never) },
      );

      const output =
        args.format === "json"
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
  },
});

const complyCommand = defineCommand({
  meta: {
    name: "comply",
    description: "Check design system compliance against rules and parent",
  },
  args: {
    target: {
      type: "positional",
      description:
        "Target to check (path, URL, npm package, owner/repo). Defaults to current directory.",
      required: false,
    },
    against: {
      type: "string",
      description: "Path to parent fingerprint JSON to check drift against",
    },
    "max-drift": {
      type: "string",
      description: "Maximum overall drift distance (default: 0.3)",
      default: "0.3",
    },
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    format: {
      type: "string",
      description: "Output format: cli, json, or sarif",
      default: "cli",
    },
    verbose: {
      type: "boolean",
      description: "Show agent reasoning",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { Director } = await import("@ghost/core");
      const config = await loadConfig(args.config);
      const targetStr = args.target || ".";
      const target = resolveTarget(targetStr);

      // Load parent fingerprint if --against provided
      let parentFingerprint: DesignFingerprint | undefined;
      if (args.against) {
        const data = await readFile(args.against, "utf-8");
        parentFingerprint = JSON.parse(data);
      }

      const director = new Director();
      const { fingerprint, compliance } = await director.comply(
        target,
        {
          parentFingerprint,
          thresholds: {
            maxOverallDrift: Number.parseFloat(args["max-drift"]),
          },
        },
        {
          llm: config.llm ?? (undefined as never),
          embedding: config.embedding,
          verbose: args.verbose,
        },
      );

      if (args.verbose) {
        console.log(`Profiled ${target.type}: ${target.value}`);
        console.log(
          `Confidence: ${fingerprint.confidence.toFixed(2)}`,
        );
        console.log();
      }

      let output: string;
      if (args.format === "sarif") {
        output = formatComplianceSARIF(compliance.data);
      } else if (args.format === "json") {
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
  },
});

const reviewCommand = defineCommand({
  meta: {
    name: "review",
    description:
      "Review files for visual language drift against a design fingerprint",
  },
  args: {
    files: {
      type: "positional",
      description:
        "Files to review (omit to review git diff)",
      required: false,
    },
    fingerprint: {
      type: "string",
      description:
        "Path to fingerprint JSON (default: .ghost-fingerprint.json)",
      alias: "f",
    },
    staged: {
      type: "boolean",
      description: "Review staged changes only",
      default: false,
    },
    base: {
      type: "string",
      description: "Base ref for git diff (default: HEAD)",
      alias: "b",
    },
    format: {
      type: "string",
      description: "Output format: cli, json, github (default: cli)",
      default: "cli",
    },
    dimensions: {
      type: "string",
      description:
        "Comma-separated dimensions to check: palette,spacing,typography,surfaces",
    },
    all: {
      type: "boolean",
      description: "Report issues on all lines, not just changed lines",
      default: false,
    },
  },
  async run({ args }) {
    try {
      // Parse dimensions flag
      let dimensions: Record<string, boolean> | undefined;
      if (args.dimensions) {
        dimensions = {};
        for (const d of (args.dimensions as string).split(",")) {
          const dim = d.trim();
          if (
            dim === "palette" ||
            dim === "spacing" ||
            dim === "typography" ||
            dim === "surfaces"
          ) {
            dimensions[dim] = true;
          }
        }
        // Explicitly disable unchecked dimensions
        for (const d of ["palette", "spacing", "typography", "surfaces"]) {
          if (!dimensions[d]) dimensions[d] = false;
        }
      }

      // Build file list from positional arg
      const files =
        args.files && typeof args.files === "string"
          ? (args.files as string).split(",").map((f: string) => f.trim())
          : undefined;

      const report = await review({
        files: files && files.length > 0 ? files : undefined,
        diff:
          !files || files.length === 0
            ? { base: args.base as string | undefined, staged: args.staged as boolean }
            : undefined,
        fingerprintPath: args.fingerprint as string | undefined,
        config: {
          dimensions,
          changedLinesOnly: !(args.all as boolean),
        },
      });

      let output: string;
      switch (args.format) {
        case "json":
          output = formatReviewJSON(report);
          break;
        case "github": {
          const comments = formatGitHubPRComments(report);
          const summary = formatReviewSummary(report);
          output = JSON.stringify({ summary, comments }, null, 2);
          break;
        }
        default:
          output = formatReviewCLI(report);
      }

      process.stdout.write(`${output}\n`);
      process.exit(report.summary.errors > 0 ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "ghost",
    version: "0.2.0",
    description: "Universal design system fingerprinting and drift detection",
  },
  subCommands: {
    scan: scanCommand,
    profile: profileCommand,
    compare: compareCommand,
    diff: diffCommand,
    discover: discoverCommand,
    comply: complyCommand,
    review: reviewCommand,
    fleet: fleetCommand,
    ack: ackCommand,
    adopt: adoptCommand,
    diverge: divergeCommand,
    viz: vizCommand,
  },
});

runMain(main);
