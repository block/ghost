import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  catalogSurveyValues,
  formatSurveyCatalogMarkdown,
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
  diffFingerprints,
  FINGERPRINT_FILENAME,
  formatLayout,
  formatSemanticDiff,
  formatVerifyProfileReport,
  inventory,
  layoutFingerprint,
  lintFingerprint,
  lintMap,
  loadFingerprint,
  scanStatus,
  verifyProfile,
} from "./core/index.js";
import { registerEmitCommand } from "./emit-command.js";

/**
 * Build the cac CLI for `ghost-fingerprint`.
 *
 * Verbs author and validate `fingerprint.md` and `survey.json`:
 * `lint` (schema check, auto-detects file kind), `verify-profile`
 * (fingerprint-to-survey fidelity check), `describe` (section ranges + token
 * estimates for fingerprints), `diff` (structural prose-level diff between two
 * fingerprints), `emit` (derive review-command, context-bundle, or skill
 * artifacts), and `survey` operations for deterministic `ghost.survey/v2`
 * merge, ID repair, bounded summary output, and derived value catalogs.
 *
 * Embedding-based comparison lives in `ghost-drift`. `diff` here is
 * text/structural — what decisions and palette roles changed — not
 * vector distance.
 */
export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-fingerprint");

  // --- lint ---
  cli
    .command(
      "lint [file]",
      "Validate fingerprint.md, map.md, or survey.json — auto-detects the kind from path/content",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? FINGERPRINT_FILENAME);
        const raw = await readFile(target, "utf-8");
        const kind = detectFileKind(target, raw);

        const report =
          kind === "survey"
            ? lintSurveyFile(raw)
            : kind === "map"
              ? lintMap(raw)
              : lintFingerprint(raw);

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

  // --- verify-profile ---
  cli
    .command(
      "verify-profile <fingerprint> <survey>",
      "Verify fingerprint.md is faithful to its survey.json: palette values must be survey-backed and promoted checks must be calibrated",
    )
    .option(
      "--root <dir>",
      "Optional target root for counting promoted check pattern matches under checks[].paths",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (fingerprintPath: string, surveyPath: string, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }

        const fingerprintTarget = resolve(process.cwd(), fingerprintPath);
        const surveyTarget = resolve(process.cwd(), surveyPath);
        const [fingerprintRaw, surveyRaw] = await Promise.all([
          readFile(fingerprintTarget, "utf-8"),
          readFile(surveyTarget, "utf-8"),
        ]);

        let survey: unknown;
        try {
          survey = JSON.parse(surveyRaw);
        } catch (err) {
          console.error(
            `Error: ${surveyTarget} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
          );
          process.exit(2);
          return;
        }

        const report = verifyProfile(fingerprintRaw, survey, {
          root: opts.root ? resolve(process.cwd(), opts.root) : undefined,
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(formatVerifyProfileReport(report));
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
      "Report which scan stages have produced artifacts in a directory: map (map.md), survey (survey.json), fingerprint (fingerprint.md). Tells orchestrators which stage to run next.",
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
            `  fingerprint (fingerprint.md): ${fmt(status.fingerprint.state)}\n\n`,
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
      "describe [fingerprint]",
      "Print a section map of fingerprint.md (line ranges + token estimates) so agents can selectively load only the sections they need.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolve(process.cwd(), path ?? FINGERPRINT_FILENAME);
        const raw = await readFile(target, "utf-8");
        const layout = layoutFingerprint(raw);
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
      "Structural diff between two fingerprint.md files — what decisions, palette roles, and tokens changed (text-level, NOT embedding distance; for that, use `ghost-drift compare`).",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (a: string, b: string, opts) => {
      try {
        const [{ fingerprint: exprA }, { fingerprint: exprB }] =
          await Promise.all([
            loadFingerprint(resolve(process.cwd(), a), {
              noEmbeddingBackfill: true,
            }),
            loadFingerprint(resolve(process.cwd(), b), {
              noEmbeddingBackfill: true,
            }),
          ]);
        const diff = diffFingerprints(exprA, exprB);
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
      "Operate on ghost.survey/v2 files. Ops: merge (concat with id-based dedup), fix-ids (recompute row IDs), summarize (bounded profile digest), catalog (derived value enum/spec view).",
    )
    .option(
      "-o, --out <path>",
      "Write the result to this path (default: stdout)",
    )
    .option(
      "--format <fmt>",
      "survey summarize/catalog output format: markdown or json",
      { default: "markdown" },
    )
    .option(
      "--kind <kind>",
      "survey catalog filter: include only this value kind",
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
        if (
          op !== "merge" &&
          op !== "fix-ids" &&
          op !== "summarize" &&
          op !== "catalog"
        ) {
          console.error(
            `Error: unknown survey op '${op}'. Supported: merge, fix-ids, summarize, catalog`,
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
        if (op === "catalog" && surveys.length !== 1) {
          console.error("Error: survey catalog takes exactly one input file");
          process.exit(2);
          return;
        }
        if (op === "summarize" || op === "catalog") {
          if (opts.format !== "markdown" && opts.format !== "json") {
            console.error(
              `Error: survey ${op} --format must be 'markdown' or 'json'`,
            );
            process.exit(2);
            return;
          }
        }
        if (op === "summarize") {
          if (!isSurveySummaryBudget(opts.budget)) {
            console.error(
              "Error: survey summarize --budget must be 'compact', 'standard', or 'full'",
            );
            process.exit(2);
            return;
          }
        }
        if (opts.kind && op !== "catalog") {
          console.error("Error: --kind is only supported for survey catalog");
          process.exit(2);
          return;
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
          if (op === "merge" || op === "summarize" || op === "catalog") {
            const report = lintSurvey(json);
            if (report.errors > 0) {
              console.error(
                `Error: ${target} failed survey lint with ${report.errors} error(s); fix before ${surveyVerbName(op)}`,
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
        } else if (op === "catalog") {
          const catalog = catalogSurveyValues(parsed[0], {
            kind: typeof opts.kind === "string" ? opts.kind : undefined,
          });
          out =
            opts.format === "json"
              ? `${JSON.stringify(catalog, null, 2)}\n`
              : formatSurveyCatalogMarkdown(catalog);
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
 * Decide whether a file is an `fingerprint.md`, a `map.md`, or a
 * `survey.json`. JSON paths/contents route to the survey linter; markdown
 * with `schema: ghost.map/v2` in its YAML frontmatter routes to the map
 * linter; everything else stays on the fingerprint path.
 */
function detectFileKind(
  path: string,
  raw: string,
): "survey" | "map" | "fingerprint" {
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
  return "fingerprint";
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

function surveyVerbName(op: string): string {
  if (op === "merge") return "merging";
  if (op === "summarize") return "summarizing";
  if (op === "catalog") return "cataloging";
  return op;
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
