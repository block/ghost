import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Bucket,
  type BucketLintReport,
  lintBucket,
  mergeBuckets,
  recomputeBucketIds,
} from "@ghost/core";
import { cac } from "cac";
import {
  diffExpressions,
  EXPRESSION_FILENAME,
  formatLayout,
  formatSemanticDiff,
  inventory,
  layoutExpression,
  lintExpression,
  lintMap,
  loadExpression,
  scanStatus,
} from "./core/index.js";
import { registerEmitCommand } from "./emit-command.js";

/**
 * Build the cac CLI for `ghost-expression`.
 *
 * Verbs author and validate `expression.md` and `bucket.json`:
 * `lint` (schema check, auto-detects file kind), `describe` (section ranges
 * + token estimates for expressions), `diff` (structural prose-level diff
 * between two expressions), `emit` (derive review-command, context-bundle,
 * or skill artifacts), and `bucket merge` (deterministic union of N
 * `ghost.bucket/v1` files into one).
 *
 * Embedding-based comparison lives in `ghost-drift`. `diff` here is
 * text/structural — what decisions and palette roles changed — not
 * vector distance.
 */
export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-expression");

  // --- lint ---
  cli
    .command(
      "lint [file]",
      "Validate expression.md, map.md, or bucket.json — auto-detects the kind from path/content",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? EXPRESSION_FILENAME);
        const raw = await readFile(target, "utf-8");
        const kind = detectFileKind(target, raw);

        const report =
          kind === "bucket"
            ? lintBucketFile(raw)
            : kind === "map"
              ? lintMap(raw)
              : lintExpression(raw);

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

  // --- scan-status ---
  cli
    .command(
      "scan-status [dir]",
      "Report which scan stages have produced artifacts in a directory: topology (map.md), objective (bucket.json), subjective (expression.md). Tells orchestrators which stage to run next.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        const dir = resolve(process.cwd(), dirArg ?? ".");
        const status = await scanStatus(dir);
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
        } else {
          const fmt = (state: string) =>
            state === "present" ? "present" : "missing";
          process.stdout.write(`scan dir: ${status.dir}\n\n`);
          process.stdout.write(
            `  topology   (map.md):       ${fmt(status.topology.state)}\n`,
          );
          process.stdout.write(
            `  objective  (bucket.json):  ${fmt(status.objective.state)}\n`,
          );
          process.stdout.write(
            `  subjective (expression.md): ${fmt(status.subjective.state)}\n\n`,
          );
          if (status.recommended_next) {
            process.stdout.write(
              `next: run the ${status.recommended_next} stage\n`,
            );
          } else {
            process.stdout.write("next: scan complete — all stages present\n");
          }
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- inventory ---
  cli
    .command(
      "inventory [path]",
      "Emit deterministic raw signals about a frontend repo as JSON: package manifests, language histogram, candidate config files, registry presence, top-level tree, git remote. Feeds the topology recipe (map.md authoring).",
    )
    .action(async (path: string | undefined) => {
      try {
        const target = resolve(process.cwd(), path ?? ".");
        const out = inventory(target);
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });

  // --- describe ---
  cli
    .command(
      "describe [expression]",
      "Print a section map of expression.md (line ranges + token estimates) so agents can selectively load only the sections they need.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? EXPRESSION_FILENAME);
        const raw = await readFile(target, "utf-8");
        const layout = layoutExpression(raw);
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify({ path: target, ...layout }, null, 2)}\n`,
          );
        } else {
          process.stdout.write(`${formatLayout(layout, target)}\n`);
        }
        process.exit(0);
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
      "diff <a> <b>",
      "Structural diff between two expression.md files — what decisions, palette roles, and tokens changed (text-level, NOT embedding distance; for that, use `ghost-drift compare`).",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (a: string, b: string, opts) => {
      try {
        const [{ expression: exprA }, { expression: exprB }] =
          await Promise.all([
            loadExpression(resolve(process.cwd(), a), {
              noEmbeddingBackfill: true,
            }),
            loadExpression(resolve(process.cwd(), b), {
              noEmbeddingBackfill: true,
            }),
          ]);
        const diff = diffExpressions(exprA, exprB);
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(diff, null, 2)}\n`);
        } else {
          process.stdout.write(formatSemanticDiff(diff));
        }
        process.exit(diff.unchanged ? 0 : 1);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- bucket <op> ---
  cli
    .command(
      "bucket <op> [...buckets]",
      "Operate on ghost.bucket/v1 files. Ops: merge (concat with id-based dedup, deterministic and idempotent), fix-ids (recompute every row's id from content; use after authoring rows with empty id fields).",
    )
    .option(
      "-o, --out <path>",
      "Write the result to this path (default: stdout)",
    )
    .action(async (op: string, buckets: string[], opts) => {
      try {
        if (op !== "merge" && op !== "fix-ids") {
          console.error(
            `Error: unknown bucket op '${op}'. Supported: merge, fix-ids`,
          );
          process.exit(2);
          return;
        }
        if (!Array.isArray(buckets) || buckets.length === 0) {
          console.error(`Error: bucket ${op} requires at least one input file`);
          process.exit(2);
          return;
        }
        if (op === "fix-ids" && buckets.length !== 1) {
          console.error("Error: bucket fix-ids takes exactly one input file");
          process.exit(2);
          return;
        }

        const parsed: Bucket[] = [];
        for (const path of buckets) {
          const target = resolve(process.cwd(), path);
          const raw = await readFile(target, "utf-8");
          let json: unknown;
          try {
            json = JSON.parse(raw);
          } catch (err) {
            console.error(
              `Error: ${target} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
            );
            process.exit(2);
            return;
          }
          if (op === "merge") {
            const report = lintBucket(json);
            if (report.errors > 0) {
              console.error(
                `Error: ${target} failed bucket lint with ${report.errors} error(s); fix before merging`,
              );
              for (const issue of report.issues) {
                if (issue.severity !== "error") continue;
                const pathSuffix = issue.path ? ` @ ${issue.path}` : "";
                console.error(
                  `  [${issue.rule}] ${issue.message}${pathSuffix}`,
                );
              }
              process.exit(1);
              return;
            }
          }
          parsed.push(json as Bucket);
        }

        const result =
          op === "merge"
            ? mergeBuckets(...parsed)
            : recomputeBucketIds(parsed[0]);
        const out = `${JSON.stringify(result, null, 2)}\n`;

        if (opts.out) {
          const outPath = resolve(process.cwd(), opts.out);
          await writeFile(outPath, out, "utf-8");
        } else {
          process.stdout.write(out);
        }

        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  registerEmitCommand(cli);

  cli.help();
  cli.version(readPackageVersion());

  return cli;
}

/**
 * Decide whether a file is an `expression.md`, a `map.md`, or a
 * `bucket.json`. JSON paths/contents route to the bucket linter; markdown
 * with `schema: ghost.map/v1` in its YAML frontmatter routes to the map
 * linter; everything else stays on the expression path.
 */
function detectFileKind(
  path: string,
  raw: string,
): "bucket" | "map" | "expression" {
  if (path.toLowerCase().endsWith(".json")) return "bucket";
  if (raw.trimStart().startsWith("{")) return "bucket";
  // Cheap markdown frontmatter sniff for `schema: ghost.map/v1`. We don't
  // parse YAML here; the linter does the heavy lift.
  const fmEnd = raw.indexOf("\n---", 3);
  if (raw.startsWith("---") && fmEnd > 0) {
    const fm = raw.slice(0, fmEnd);
    if (/\bschema:\s*ghost\.map\/v1\b/.test(fm)) return "map";
  }
  if (path.toLowerCase().endsWith("map.md")) return "map";
  return "expression";
}

function lintBucketFile(raw: string): BucketLintReport {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return {
      issues: [
        {
          severity: "error",
          rule: "bucket-not-json",
          message: `bucket file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      errors: 1,
      warnings: 0,
      info: 0,
    };
  }
  return lintBucket(json);
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
