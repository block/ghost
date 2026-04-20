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

import type { EmbeddingConfig, Expression } from "@ghost/core";
import {
  compare,
  EMBEDDING_FRAGMENT_FILENAME,
  EXPRESSION_SCHEMA_VERSION,
  formatComparison,
  formatComparisonJSON,
  formatDiscoveryCLI,
  formatDiscoveryJSON,
  formatExpression,
  formatExpressionJSON,
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
import { registerDriftCommand } from "./drift-command.js";
import { registerEmitCommand } from "./emit-command.js";
import {
  registerAckCommand,
  registerAdoptCommand,
  registerDivergeCommand,
} from "./evolution-commands.js";
import { registerGenerateCommand } from "./generate-command.js";
import { registerLintCommand } from "./lint-command.js";
import { registerReviewCommand } from "./review-command.js";
import { registerVerifyCommand } from "./verify-command.js";
import { registerVizCommand } from "./viz-command.js";

const cli = cac("ghost");

// --- profile ---
cli
  .command(
    "profile [...targets]",
    "Generate a design expression — accepts one or more targets (directory, URL, npm package, GitHub repo)",
  )
  .option("-c, --config <path>", "Path to ghost config file")
  .option(
    "-r, --registry <path>",
    "Path or URL to a registry.json (profiles registry directly)",
  )
  .option("-o, --output <file>", "Write expression to file")
  .option(
    "--emit",
    "Write expression.md to project root (publishable artifact)",
  )
  .option(
    "--max-iterations <n>",
    "Maximum agent iterations for exploration (default: 99). Lower for faster/cheaper runs.",
  )
  .option("-v, --verbose", "Show agent reasoning")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (targets: string[], opts) => {
    try {
      let expression: Expression;

      if (opts.registry) {
        let embeddingConfig: EmbeddingConfig | undefined;
        try {
          const cfg = await loadConfig(opts.config);
          embeddingConfig = cfg.embedding;
        } catch {
          // No config file is fine
        }
        expression = await profileRegistry(opts.registry, embeddingConfig);
      } else {
        const targetStrings = targets.length > 0 ? targets : ["."];
        const maxIterations = opts.maxIterations
          ? Number.parseInt(String(opts.maxIterations), 10)
          : undefined;

        if (targetStrings.length === 1 && targetStrings[0] === ".") {
          const config = await loadConfig(opts.config);
          expression = await profile(config, { emit: opts.emit });
        } else if (targetStrings.length === 1) {
          const config = await loadConfig(opts.config);
          const target = resolveTarget(targetStrings[0]);

          if (opts.verbose) {
            console.log(`Profiling ${target.type}: ${target.value}`);
          }

          const result = await profileTarget(target, config);
          expression = result.expression;

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
          expression = result.expression;

          if (opts.verbose) printVerboseResult(result);
        }
      }

      const output =
        opts.format === "json"
          ? formatExpressionJSON(expression)
          : formatExpression(expression);

      if (opts.output) {
        const isMd = opts.output.endsWith(".md");
        const content = isMd
          ? serializeExpression(expression)
          : formatExpressionJSON(expression);
        await writeFile(opts.output, content);
        console.log(`Expression written to ${opts.output}`);

        // v4: when writing an expression.md, drop the embedding next to it
        // as a sibling fragment file. Keeps the index lean and the vector
        // cacheable — loaders fall back to recompute if missing.
        if (isMd && expression.embedding?.length) {
          const { dirname, resolve: resolvePath } = await import("node:path");
          const embeddingPath = resolvePath(
            dirname(opts.output),
            EMBEDDING_FRAGMENT_FILENAME,
          );
          await writeFile(
            embeddingPath,
            serializeEmbeddingFragment(
              expression.embedding,
              expression.id,
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
// N=2 → pairwise (with optional --semantic / --temporal enrichment).
// N≥3 → fleet (pairwise matrix + clusters).
cli
  .command(
    "compare [...expressions]",
    "Compare two or more expressions (N≥3 = fleet).",
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
  .action(async (expressions: string[], opts) => {
    try {
      const parsed = await Promise.all(
        expressions.map((path) => loadExpression(path)),
      );
      const exprs = parsed.map((p) => p.expression);

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

// --- discover ---
cli
  .command("discover [query]", "Find public design systems matching a query")
  .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
  .action(async (query: string | undefined, opts) => {
    try {
      const { DiscoveryAgent } = await import("@ghost/core");
      const config = await loadConfig().catch(() => undefined);
      const agent = new DiscoveryAgent();
      const result = await agent.execute(
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
registerDriftCommand(cli);
registerVerifyCommand(cli);
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
