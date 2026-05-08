import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundle } from "@ghost/core";
import { cac } from "cac";
import { formatSemanticDiff, loadFingerprint } from "ghost-fingerprint";
import {
  compare,
  formatComparison,
  formatComparisonJSON,
  formatCompositeComparison,
  formatCompositeComparisonJSON,
  formatTemporalComparison,
  formatTemporalComparisonJSON,
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

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-drift");

  // --- compare ---
  cli
    .command(
      "compare [...fingerprints]",
      "Compare two or more fingerprints. N=2 returns a pairwise delta; N≥3 returns a composite fingerprint (pairwise matrix, centroid, spread, clusters).",
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
      "Emit the ghost-drift agentskills.io bundle (kind: skill).",
    )
    .option(
      "-o, --out <path>",
      `Output directory (default: ${DEFAULT_SKILL_OUT})`,
    )
    .action(async (kind: string, opts) => {
      try {
        if (kind !== "skill") {
          console.error(
            `Error: unknown emit kind '${kind}'. Supported: skill.`,
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
