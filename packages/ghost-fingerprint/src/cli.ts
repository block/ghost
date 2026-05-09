import { readFileSync } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  catalogSurveyValues,
  type Fingerprint,
  formatSurveyCatalogMarkdown,
  formatSurveySummaryMarkdown,
  lintGhostChecks,
  lintSurvey,
  mergeSurveys,
  recomputeSurveyIds,
  type Survey,
  type SurveyLintReport,
  type SurveySummaryBudget,
  summarizeSurvey,
} from "@ghost/core";
import { cac } from "cac";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  diffFingerprints,
  formatLayout,
  formatSemanticDiff,
  formatVerifyProfileReport,
  initFingerprintPackage,
  inventory,
  layoutFingerprint,
  lintFingerprint,
  lintFingerprintPackage,
  lintMap,
  loadFingerprint,
  proposeGhostChecks,
  resolveFingerprintPackage,
  scanStatus,
  verifyProfile,
} from "./core/index.js";
import { registerEmitCommand } from "./emit-command.js";

/**
 * Build the cac CLI for `ghost-fingerprint`.
 *
 * Verbs author and validate the `.ghost/fingerprint/` package:
 * `lint` (schema check, auto-detects file kind), `verify-profile`
 * (profile-to-survey fidelity check), `describe` (section ranges + token
 * estimates for profiles), `diff` (structural prose-level diff between two
 * profiles), `emit` (derive review-command, context-bundle, or skill
 * artifacts), and `survey` operations for deterministic `ghost.survey/v2`
 * merge, ID repair, bounded summary output, derived value catalogs, and
 * observed pattern summaries.
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
      "Validate a fingerprint package, profile.md, map.md, survey.json, or checks.yml — defaults to .ghost/fingerprint",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = resolveFingerprintPackage(path, process.cwd()).dir;
        let report: ReturnType<typeof lintFingerprint>;
        if (path === undefined || (await isDirectory(target))) {
          report = await lintFingerprintPackage(path, process.cwd());
          writeLintReport(report, opts.format);
          process.exit(report.errors > 0 ? 1 : 0);
          return;
        }

        const fileTarget = resolve(process.cwd(), path ?? target);
        const raw = await readFile(fileTarget, "utf-8");
        const kind = detectFileKind(fileTarget, raw);

        report =
          kind === "survey"
            ? lintSurveyFile(raw)
            : kind === "map"
              ? lintMap(raw)
              : kind === "checks"
                ? lintChecksFile(raw)
                : lintFingerprint(raw);

        if (kind === "profile" && hasExtends(raw) && report.errors === 0) {
          try {
            await loadFingerprint(fileTarget, { noEmbeddingBackfill: true });
          } catch (err) {
            report = appendLintError(
              report,
              "extends-resolution",
              err instanceof Error ? err.message : String(err),
              "extends",
            );
          }
        }

        writeLintReport(report, opts.format);

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- init-package ---
  cli
    .command(
      "init-package [dir]",
      "Create a .ghost/fingerprint package skeleton (map.md, survey.json, profile.md, checks.yml)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        const paths = await initFingerprintPackage(dirArg, process.cwd());
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(paths, null, 2)}\n`);
        } else {
          process.stdout.write(
            `Initialized fingerprint package: ${paths.dir}\n`,
          );
          process.stdout.write(`  map.md: ${paths.map}\n`);
          process.stdout.write(`  survey.json: ${paths.survey}\n`);
          process.stdout.write(`  profile.md: ${paths.profile}\n`);
          process.stdout.write(`  checks.yml: ${paths.checks}\n`);
        }
        process.exit(0);
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
      "verify-profile <profile> <survey>",
      "Verify profile.md is faithful to its survey.json: palette values must be survey-backed",
    )
    .option(
      "--root <dir>",
      "Optional target root used by profile fidelity checks that need repo context",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (profilePath: string, surveyPath: string, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }

        const profileTarget = resolve(process.cwd(), profilePath);
        const surveyTarget = resolve(process.cwd(), surveyPath);
        const [fingerprintRaw, surveyRaw] = await Promise.all([
          readFile(profileTarget, "utf-8"),
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

        let resolvedFingerprint: Fingerprint | undefined;
        if (hasExtends(fingerprintRaw)) {
          resolvedFingerprint = (
            await loadFingerprint(profileTarget, {
              noEmbeddingBackfill: true,
            })
          ).fingerprint;
        }

        const report = verifyProfile(fingerprintRaw, survey, {
          root: opts.root ? resolve(process.cwd(), opts.root) : undefined,
          resolvedFingerprint,
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
      "Report which fingerprint package stages have produced artifacts: map.md, survey.json, profile.md, checks.yml.",
    )
    .option(
      "--include-scopes",
      "Also report per-scope survey and fingerprint artifacts under modules/<scope>/ and fingerprints/<scope>.md",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        const dir = resolveFingerprintPackage(dirArg, process.cwd()).dir;
        const status = await scanStatus(dir, {
          includeScopes: Boolean(opts.includeScopes),
        });
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
            `  profile    (profile.md):    ${fmt(status.profile.state)}\n`,
          );
          process.stdout.write(
            `  checks     (checks.yml):    ${fmt(status.checks.state)}\n\n`,
          );
          if (status.recommended_next) {
            process.stdout.write(
              `next: run the ${status.recommended_next} stage\n`,
            );
          } else {
            process.stdout.write("next: scan complete — all stages present\n");
          }
          if (status.scope_error) {
            process.stdout.write(`\nscopes: error — ${status.scope_error}\n`);
          } else if (status.scopes) {
            process.stdout.write("\nscopes:\n");
            if (status.scopes.length === 0) {
              process.stdout.write("  none\n");
            } else {
              for (const scope of status.scopes) {
                process.stdout.write(
                  `  ${scope.id}: survey ${scope.survey.state}, fingerprint ${scope.fingerprint.state}\n`,
                );
              }
            }
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
      "describe [profile]",
      "Print a section map of profile.md (line ranges + token estimates) so agents can selectively load only the sections they need.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = path
          ? resolve(process.cwd(), path)
          : resolveFingerprintPackage(undefined, process.cwd()).profile;
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
      "Structural diff between two profile.md files — what decisions, palette roles, and tokens changed (text-level, NOT embedding distance; for that, use `ghost-drift compare`).",
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
      "Operate on ghost.survey/v2 files. Ops: merge, fix-ids, summarize, catalog, patterns.",
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
          op !== "catalog" &&
          op !== "patterns"
        ) {
          console.error(
            `Error: unknown survey op '${op}'. Supported: merge, fix-ids, summarize, catalog, patterns`,
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
        if ((op === "catalog" || op === "patterns") && surveys.length !== 1) {
          console.error(`Error: survey ${op} takes exactly one input file`);
          process.exit(2);
          return;
        }
        if (op === "summarize" || op === "catalog" || op === "patterns") {
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
          if (
            op === "merge" ||
            op === "summarize" ||
            op === "catalog" ||
            op === "patterns"
          ) {
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
        } else if (op === "patterns") {
          const patterns = summarizeSurveyPatterns(parsed[0]);
          out =
            opts.format === "json"
              ? `${JSON.stringify(patterns, null, 2)}\n`
              : formatSurveyPatternsMarkdown(patterns);
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

  // --- checks <op> ---
  cli
    .command(
      "checks <op> [package]",
      "Operate on ghost.checks/v1 documents. Ops: propose.",
    )
    .option("--format <fmt>", "Output format: yaml or json", {
      default: "yaml",
    })
    .action(async (op: string, packageDir: string | undefined, opts) => {
      try {
        if (op !== "propose") {
          console.error(`Error: unknown checks op '${op}'. Supported: propose`);
          process.exit(2);
          return;
        }
        if (opts.format !== "yaml" && opts.format !== "json") {
          console.error(
            "Error: checks propose --format must be 'yaml' or 'json'",
          );
          process.exit(2);
          return;
        }

        const report = await proposeGhostChecks({
          packageDir,
          cwd: process.cwd(),
        });
        const out =
          opts.format === "json"
            ? `${JSON.stringify(report, null, 2)}\n`
            : stringifyYaml(report.checks);
        process.stdout.write(out.endsWith("\n") ? out : `${out}\n`);
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
 * Decide whether a file is a `profile.md`, `map.md`, `survey.json`, or
 * `checks.yml`. JSON paths/contents route to the survey linter; markdown with
 * `schema: ghost.map/v2` in its YAML frontmatter routes to the map linter;
 * checks YAML routes to the checks linter; everything else stays on the profile
 * path.
 */
function detectFileKind(
  path: string,
  raw: string,
): "survey" | "map" | "profile" | "checks" {
  if (path.toLowerCase().endsWith(".json")) return "survey";
  if (path.toLowerCase().endsWith(".yml")) return "checks";
  if (path.toLowerCase().endsWith(".yaml")) return "checks";
  if (raw.trimStart().startsWith("{")) return "survey";
  if (/^\s*schema:\s*ghost\.checks\/v1\b/m.test(raw)) return "checks";
  // Cheap markdown frontmatter sniff for `schema: ghost.map/v2`. We don't
  // parse YAML here; the linter does the heavy lift.
  const fmEnd = raw.indexOf("\n---", 3);
  if (raw.startsWith("---") && fmEnd > 0) {
    const fm = raw.slice(0, fmEnd);
    if (/\bschema:\s*ghost\.map\/v2\b/.test(fm)) return "map";
  }
  if (path.toLowerCase().endsWith("map.md")) return "map";
  return "profile";
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

function lintChecksFile(raw: string): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostChecks(parseYaml(raw));
  } catch (err) {
    return {
      issues: [
        {
          severity: "error",
          rule: "checks-not-yaml",
          message: `checks file is not valid YAML: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ],
      errors: 1,
      warnings: 0,
      info: 0,
    };
  }
}

function writeLintReport(
  report: ReturnType<typeof lintFingerprint>,
  format: unknown,
): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

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

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

function hasExtends(raw: string): boolean {
  try {
    const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (!frontmatter) return false;
    const parsed = parseYaml(frontmatter);
    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        typeof (parsed as Record<string, unknown>).extends === "string",
    );
  } catch {
    return false;
  }
}

function appendLintError(
  report: ReturnType<typeof lintFingerprint>,
  rule: string,
  message: string,
  path?: string,
): ReturnType<typeof lintFingerprint> {
  const issues = [
    ...report.issues,
    { severity: "error" as const, rule, message, ...(path ? { path } : {}) },
  ];
  return {
    issues,
    errors: report.errors + 1,
    warnings: report.warnings,
    info: report.info,
  };
}

function isSurveySummaryBudget(value: unknown): value is SurveySummaryBudget {
  return value === "compact" || value === "standard" || value === "full";
}

function surveyVerbName(op: string): string {
  if (op === "merge") return "merging";
  if (op === "summarize") return "summarizing";
  if (op === "catalog") return "cataloging";
  if (op === "patterns") return "summarizing patterns";
  return op;
}

interface SurveyPatternSummary {
  schema: "ghost.survey.patterns/v1";
  surfaces: number;
  surface_types: Array<{ value: string; count: number; examples: string[] }>;
  densities: Array<{ value: string; count: number; examples: string[] }>;
  layout_shapes: Array<{ value: string; count: number; examples: string[] }>;
  layout_patterns: Array<{ value: string; count: number; examples: string[] }>;
  components: Array<{ value: string; count: number; examples: string[] }>;
  examples: Array<{ name: string; locator: string; files: string[] }>;
}

function summarizeSurveyPatterns(survey: Survey): SurveyPatternSummary {
  const surfaceTypes = new Map<string, PatternAccumulator>();
  const densities = new Map<string, PatternAccumulator>();
  const layoutShapes = new Map<string, PatternAccumulator>();
  const layoutPatterns = new Map<string, PatternAccumulator>();
  const components = new Map<string, PatternAccumulator>();
  const examples: SurveyPatternSummary["examples"] = [];

  for (const surface of survey.ui_surfaces) {
    const label = surface.locator || surface.name;
    const classification = surface.classification;
    if (classification?.surface_type) {
      addPattern(surfaceTypes, classification.surface_type, label);
    }
    if (classification?.density) {
      addPattern(densities, classification.density, label);
    }
    if (classification?.layout_shape) {
      addPattern(layoutShapes, classification.layout_shape, label);
    }
    for (const pattern of surface.signals?.layout_patterns ?? []) {
      addPattern(layoutPatterns, pattern, label);
    }
    for (const component of surface.signals?.dominant_components ?? []) {
      addPattern(components, component, label);
    }
    examples.push({
      name: surface.name,
      locator: surface.locator,
      files: surface.files.slice(0, 3),
    });
  }

  return {
    schema: "ghost.survey.patterns/v1",
    surfaces: survey.ui_surfaces.length,
    surface_types: topPatterns(surfaceTypes),
    densities: topPatterns(densities),
    layout_shapes: topPatterns(layoutShapes),
    layout_patterns: topPatterns(layoutPatterns),
    components: topPatterns(components),
    examples: examples.slice(0, 12),
  };
}

interface PatternAccumulator {
  count: number;
  examples: string[];
}

function addPattern(
  map: Map<string, PatternAccumulator>,
  value: string,
  example: string,
): void {
  const current = map.get(value) ?? { count: 0, examples: [] };
  current.count += 1;
  if (!current.examples.includes(example) && current.examples.length < 5) {
    current.examples.push(example);
  }
  map.set(value, current);
}

function topPatterns(
  map: Map<string, PatternAccumulator>,
): Array<{ value: string; count: number; examples: string[] }> {
  return [...map.entries()]
    .map(([value, accumulator]) => ({
      value,
      count: accumulator.count,
      examples: accumulator.examples,
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function formatSurveyPatternsMarkdown(summary: SurveyPatternSummary): string {
  const lines = ["# Survey Patterns", "", `Surfaces: ${summary.surfaces}`, ""];
  appendPatternSection(lines, "Surface Types", summary.surface_types);
  appendPatternSection(lines, "Densities", summary.densities);
  appendPatternSection(lines, "Layout Shapes", summary.layout_shapes);
  appendPatternSection(lines, "Layout Patterns", summary.layout_patterns);
  appendPatternSection(lines, "Dominant Components", summary.components);
  lines.push("## Examples", "");
  for (const example of summary.examples) {
    lines.push(
      `- ${example.name} (${example.locator}) — ${example.files.join(", ")}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function appendPatternSection(
  lines: string[],
  title: string,
  rows: Array<{ value: string; count: number; examples: string[] }>,
): void {
  lines.push(`## ${title}`, "");
  if (rows.length === 0) {
    lines.push("- none", "");
    return;
  }
  for (const row of rows) {
    lines.push(`- ${row.value}: ${row.count} (${row.examples.join(", ")})`);
  }
  lines.push("");
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
