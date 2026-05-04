import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatSurveySummaryMarkdown,
  lintSurvey,
  mergeSurveys,
  recomputeSurveyIds,
  type Survey,
  type SurveyLintReport,
  type SurveySummaryBudget,
  summarizeSurvey,
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
 * Verbs author and validate `expression.md` and `survey.json`:
 * `lint` (schema check, auto-detects file kind), `describe` (section ranges
 * + token estimates for expressions), `diff` (structural prose-level diff
 * between two expressions), `emit` (derive review-command, context-bundle,
 * or skill artifacts), and `survey` operations for deterministic
 * `ghost.survey/v2` merge, ID repair, and bounded summary output.
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
      "Validate expression.md, map.md, or survey.json — auto-detects the kind from path/content",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? EXPRESSION_FILENAME);
        const raw = await readFile(target, "utf-8");
        const kind = detectFileKind(target, raw);

        const report =
          kind === "survey"
            ? lintSurveyFile(raw)
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
      "Report which scan stages have produced artifacts in a directory: map (map.md), survey (survey.json), expression (expression.md). Tells orchestrators which stage to run next.",
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
            `  map        (map.md):        ${fmt(status.map.state)}\n`,
          );
          process.stdout.write(
            `  survey     (survey.json):   ${fmt(status.survey.state)}\n`,
          );
          process.stdout.write(
            `  expression (expression.md): ${fmt(status.expression.state)}\n\n`,
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

  // --- survey <op> ---
  cli
    .command(
      "survey <op> [...surveys]",
      "Operate on ghost.survey/v2 files. Ops: merge (concat with id-based dedup), fix-ids (recompute row IDs), summarize (bounded profile digest; Markdown by default, JSON with --format json).",
    )
    .option(
      "-o, --out <path>",
      "Write the result to this path (default: stdout)",
    )
    .option(
      "--format <fmt>",
      "survey summarize output format: markdown or json",
      { default: "markdown" },
    )
    .option(
      "--budget <name>",
      "survey summarize budget: compact, standard, full",
      {
        default: "standard",
      },
    )
    .action(async (op: string, surveys: string[], opts) => {
      try {
        if (op !== "merge" && op !== "fix-ids" && op !== "summarize") {
          console.error(
            `Error: unknown survey op '${op}'. Supported: merge, fix-ids, summarize`,
          );
          process.exit(2);
          return;
        }
        if (!Array.isArray(surveys) || surveys.length === 0) {
          console.error(`Error: survey ${op} requires at least one input file`);
          process.exit(2);
          return;
        }
        if (op === "fix-ids" && surveys.length !== 1) {
          console.error("Error: survey fix-ids takes exactly one input file");
          process.exit(2);
          return;
        }
        if (op === "summarize" && surveys.length !== 1) {
          console.error("Error: survey summarize takes exactly one input file");
          process.exit(2);
          return;
        }
        if (op === "summarize") {
          if (opts.format !== "markdown" && opts.format !== "json") {
            console.error(
              "Error: survey summarize --format must be 'markdown' or 'json'",
            );
            process.exit(2);
            return;
          }
          if (!isSurveySummaryBudget(opts.budget)) {
            console.error(
              "Error: survey summarize --budget must be 'compact', 'standard', or 'full'",
            );
            process.exit(2);
            return;
          }
        }

        const parsed: Survey[] = [];
        for (const path of surveys) {
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
          if (op === "merge" || op === "summarize") {
            const report = lintSurvey(json);
            if (report.errors > 0) {
              console.error(
                `Error: ${target} failed survey lint with ${report.errors} error(s); fix before ${op === "merge" ? "merging" : "summarizing"}`,
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
          parsed.push(json as Survey);
        }

        let out: string;
        if (op === "summarize") {
          const summary = summarizeSurvey(parsed[0], {
            budget: opts.budget as SurveySummaryBudget,
          });
          out =
            opts.format === "json"
              ? `${JSON.stringify(summary, null, 2)}\n`
              : formatSurveySummaryMarkdown(summary);
        } else {
          const result =
            op === "merge"
              ? mergeSurveys(...parsed)
              : recomputeSurveyIds(parsed[0]);
          out = `${JSON.stringify(result, null, 2)}\n`;
        }

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
 * `survey.json`. JSON paths/contents route to the survey linter; markdown
 * with `schema: ghost.map/v2` in its YAML frontmatter routes to the map
 * linter; everything else stays on the expression path.
 */
function detectFileKind(
  path: string,
  raw: string,
): "survey" | "map" | "expression" {
  if (path.toLowerCase().endsWith(".json")) return "survey";
  if (raw.trimStart().startsWith("{")) return "survey";
  // Cheap markdown frontmatter sniff for `schema: ghost.map/v2`. We don't
  // parse YAML here; the linter does the heavy lift.
  const fmEnd = raw.indexOf("\n---", 3);
  if (raw.startsWith("---") && fmEnd > 0) {
    const fm = raw.slice(0, fmEnd);
    if (/\bschema:\s*ghost\.map\/v2\b/.test(fm)) return "map";
  }
  if (path.toLowerCase().endsWith("map.md")) return "map";
  return "expression";
}

function lintSurveyFile(raw: string): SurveyLintReport {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return {
      issues: [
        {
          severity: "error",
          rule: "survey-not-json",
          message: `survey file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      errors: 1,
      warnings: 0,
      info: 0,
    };
  }
  return lintSurvey(json);
}

function isSurveySummaryBudget(value: unknown): value is SurveySummaryBudget {
  return value === "compact" || value === "standard" || value === "full";
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
