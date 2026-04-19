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
  compareExpressions,
  compareFingerprints,
  compareFleet,
  computeTemporalComparison,
  diff,
  EMBEDDING_FRAGMENT_FILENAME,
  EXPRESSION_SCHEMA_VERSION,
  formatComparison,
  formatComparisonJSON,
  formatDiffCLI,
  formatDiffJSON,
  formatDiscoveryCLI,
  formatDiscoveryJSON,
  formatFingerprint,
  formatFingerprintJSON,
  formatFleetComparison,
  formatFleetComparisonJSON,
  formatSemanticDiff,
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
  serializeEmbeddingFragment,
  serializeExpression,
} from "@ghost/core";
import { cac } from "cac";
import { selectCompareMode } from "./compare-mode.js";
import { registerEmitCommand } from "./emit-command.js";
import {
  registerAckCommand,
  registerAdoptCommand,
  registerDivergeCommand,
} from "./evolution-commands.js";
import { registerGenerateCommand } from "./generate-command.js";
import { registerLintCommand } from "./lint-command.js";
import { registerReviewCommand } from "./review-command.js";
import { registerVizCommand } from "./viz-command.js";

const cli = cac("ghost");

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
          fingerprint = await profile(config, { emit: opts.emit });
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
        const isMd = opts.output.endsWith(".md");
        const content = isMd
          ? serializeExpression(fingerprint)
          : formatFingerprintJSON(fingerprint);
        await writeFile(opts.output, content);
        console.log(`Fingerprint written to ${opts.output}`);

        // v4: when writing an expression.md, drop the embedding next to it
        // as a sibling fragment file. Keeps the index lean and the vector
        // cacheable — loaders fall back to recompute if missing.
        if (isMd && fingerprint.embedding?.length) {
          const { dirname, resolve: resolvePath } = await import("node:path");
          const embeddingPath = resolvePath(
            dirname(opts.output),
            EMBEDDING_FRAGMENT_FILENAME,
          );
          await writeFile(
            embeddingPath,
            serializeEmbeddingFragment(
              fingerprint.embedding,
              fingerprint.id,
              EXPRESSION_SCHEMA_VERSION,
            ),
          );
        }
      }

      if (opts.emit) {
        console.log("Published expression.md");
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
// Unified comparison verb. Modes (flag-dispatched):
//   default (N=2):         pairwise fingerprint distance
//   --temporal (N=2):      pairwise + velocity/trajectory/ack
//   --semantic (N=2):      semantic expression diff
//   N≥3 or --cluster:      fleet comparison (pairwise matrix + optional clusters)
//   --components:          local components vs registry (no fingerprint args)
cli
  .command(
    "compare [...fingerprints]",
    "Compare two or more fingerprints (N≥3 = fleet). Use --components for local vs registry.",
  )
  .option(
    "--temporal",
    "Include temporal data: velocity, trajectory, ack status (N=2 only)",
  )
  .option(
    "--history-dir <dir>",
    "Directory containing .ghost/history.jsonl (for --temporal, defaults to cwd)",
  )
  .option("--semantic", "Semantic diff of decisions/values/palette (N=2 only)")
  .option("--cluster", "Include cluster analysis (N≥3)")
  .option(
    "--components",
    "Compare local components against registry (ignores fingerprint args)",
  )
  .option("--component <name>", "Limit --components to one component")
  .option("-c, --config <path>", "Path to ghost config file (for --components)")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (fingerprints: string[], opts) => {
    try {
      const dispatch = selectCompareMode({
        fingerprintCount: fingerprints.length,
        components: Boolean(opts.components),
        cluster: Boolean(opts.cluster),
        semantic: Boolean(opts.semantic),
        temporal: Boolean(opts.temporal),
      });

      if (!dispatch.ok) {
        console.error(`Error: ${dispatch.error}`);
        process.exit(2);
      }

      if (dispatch.mode === "components") {
        const config = await loadConfig(opts.config);
        const results = await diff(config, opts.component || undefined);
        const output =
          opts.format === "json"
            ? formatDiffJSON(results)
            : formatDiffCLI(results);
        process.stdout.write(output);
        const hasBreaking = results.some((r) =>
          r.components.some((c) => c.severity === "error"),
        );
        process.exit(hasBreaking ? 1 : 0);
      }

      if (dispatch.mode === "fleet") {
        const members = await Promise.all(
          fingerprints.map(async (p) => {
            const { fingerprint } = await loadExpression(p);
            return { id: fingerprint.id, fingerprint };
          }),
        );
        const fleet = compareFleet(members, { cluster: Boolean(opts.cluster) });
        const output =
          opts.format === "json"
            ? formatFleetComparisonJSON(fleet)
            : formatFleetComparison(fleet);
        process.stdout.write(`${output}\n`);
        process.exit(0);
      }

      // Pairwise modes (N=2): load both fingerprints once.
      const [a, b] = fingerprints;
      const [aParsed, bParsed] = await Promise.all([
        loadExpression(a),
        loadExpression(b),
      ]);
      const src = aParsed.fingerprint;
      const tgt = bParsed.fingerprint;

      if (dispatch.mode === "semantic") {
        const semantic = compareExpressions(src, tgt);
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(semantic, null, 2)}\n`);
        } else {
          process.stdout.write(formatSemanticDiff(semantic));
        }
        process.exit(semantic.unchanged ? 0 : 1);
      }

      const comparison = compareFingerprints(src, tgt, {
        includeVectors: dispatch.mode === "temporal",
      });

      if (dispatch.mode === "temporal") {
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
      }

      // dispatch.mode === "pairwise"
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

// Commands defined in other files register themselves on the same cli instance
registerReviewCommand(cli);
registerAckCommand(cli);
registerAdoptCommand(cli);
registerDivergeCommand(cli);
registerVizCommand(cli);
registerGenerateCommand(cli);
registerLintCommand(cli);
registerEmitCommand(cli);

cli.help();
cli.version("0.2.0");
cli.parse();
