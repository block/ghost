#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Load .env from project root if present.
// The library (ghost-core) reads process.env — this is the only place .env files are loaded.
// Supports: .env, .env.local (local takes precedence)
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

import type { DesignFingerprint } from "@ghost/core";
import {
  compareFingerprints,
  computeTemporalComparison,
  diff,
  formatCLIReport,
  formatComparison,
  formatComparisonJSON,
  formatDiffCLI,
  formatDiffJSON,
  formatFingerprint,
  formatFingerprintJSON,
  formatJSONReport,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  loadConfig,
  profile,
  profileRegistry,
  readHistory,
  readSyncManifest,
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
    description: "Generate a design fingerprint for a project",
  },
  args: {
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
        // Still load config if available — for embedding settings
        let embeddingConfig: import("@ghost/core").EmbeddingConfig | undefined;
        try {
          const config = await loadConfig({
            configPath: args.config,
            requireDesignSystems: false,
          });
          embeddingConfig = config.embedding;
        } catch {
          // No config file is fine when --registry is provided
        }
        fingerprint = await profileRegistry(args.registry, embeddingConfig);
      } else {
        const config = await loadConfig({
          configPath: args.config,
          requireDesignSystems: false,
        });
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

const main = defineCommand({
  meta: {
    name: "ghost",
    version: "0.1.0",
    description: "Design drift detection",
  },
  subCommands: {
    scan: scanCommand,
    profile: profileCommand,
    compare: compareCommand,
    diff: diffCommand,
    fleet: fleetCommand,
    ack: ackCommand,
    adopt: adoptCommand,
    diverge: divergeCommand,
    viz: vizCommand,
  },
});

runMain(main);
