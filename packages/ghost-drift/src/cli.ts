import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundle } from "@ghost/core";
import { cac } from "cac";
import {
  compare,
  formatComparison,
  formatComparisonJSON,
  formatCompositeComparison,
  formatCompositeComparisonJSON,
  formatSemanticDiff,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
  loadExpression,
  readHistory,
  readSyncManifest,
} from "./core/index.js";
import {
  registerAckCommand,
  registerDivergeCommand,
  registerTrackCommand,
} from "./evolution-commands.js";

/**
 * The skill bundle's source files live in `src/skill-bundle/` as real
 * markdown and are copied verbatim into `dist/skill-bundle/` by the
 * package build step. This loader points the shared `@ghost/core`
 * walker at that built directory at runtime.
 */
const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("./skill-bundle", import.meta.url),
);

const DEFAULT_SKILL_OUT = ".claude/skills/ghost-drift";

const MOVED_VERBS: Record<string, string> = {
  lint: "ghost-expression lint",
  describe: "ghost-expression describe",
};

const MOVED_EMIT_KINDS = new Set(["review-command", "context-bundle"]);

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-drift");

  // --- compare ---
  cli
    .command(
      "compare [...expressions]",
      "Compare two or more expressions. N=2 returns a pairwise delta; N≥3 returns a composite expression (pairwise matrix, centroid, spread, clusters).",
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
        let manifest: Awaited<ReturnType<typeof readSyncManifest>> | null =
          null;
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

        if (result.mode === "composite") {
          const output = isJson
            ? formatCompositeComparisonJSON(result.composite)
            : formatCompositeComparison(result.composite);
          process.stdout.write(`${output}\n`);
          process.exit(0);
        }

        if (result.semantic) {
          if (isJson) {
            process.stdout.write(
              `${JSON.stringify(result.semantic, null, 2)}\n`,
            );
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

  registerAckCommand(cli);
  registerTrackCommand(cli);
  registerDivergeCommand(cli);

  // --- emit (skill only) ---
  cli
    .command(
      "emit <kind>",
      "Emit the ghost-drift agentskills.io bundle (kind: skill). For review-command and context-bundle, use `ghost-expression emit`.",
    )
    .option(
      "-o, --out <path>",
      `Output directory (default: ${DEFAULT_SKILL_OUT})`,
    )
    .action(async (kind: string, opts) => {
      try {
        if (MOVED_EMIT_KINDS.has(kind)) {
          console.error(
            `Error: \`ghost-drift emit ${kind}\` moved to \`ghost-expression emit ${kind}\`. The expression authoring verbs now live in the ghost-expression package.`,
          );
          process.exit(2);
          return;
        }
        if (kind !== "skill") {
          console.error(
            `Error: unknown emit kind '${kind}'. Supported: skill. (review-command and context-bundle moved to ghost-expression.)`,
          );
          process.exit(2);
          return;
        }

        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? DEFAULT_SKILL_OUT,
        );
        const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);
        const written: string[] = [];
        for (const file of bundle) {
          const outPath = resolve(outDir, file.path);
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, file.content, "utf-8");
          written.push(file.path);
        }
        process.stdout.write(
          `Wrote ${written.length} file${written.length === 1 ? "" : "s"} to ${outDir}:\n`,
        );
        for (const f of written) process.stdout.write(`  ${f}\n`);
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- moved verbs: stub error commands so users get a clear migration path ---
  for (const [verb, replacement] of Object.entries(MOVED_VERBS)) {
    cli
      .command(
        `${verb} [...args]`,
        `Moved to \`${replacement}\`. Install ghost-expression and re-run.`,
      )
      .action(() => {
        console.error(
          `Error: \`ghost-drift ${verb}\` moved to \`${replacement}\`. The expression authoring verbs now live in the ghost-expression package — install it and re-run.`,
        );
        process.exit(2);
      });
  }

  cli.help();
  cli.version(readPackageVersion());

  return cli;
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
