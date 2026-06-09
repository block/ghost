import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  catalogSurveyValues,
  formatSurveyCatalogMarkdown,
  formatSurveySummaryMarkdown,
  type GhostFingerprintDocument,
  type GhostPatternsDocument,
  lintSurvey,
  mergeSurveys,
  recomputeSurveyIds,
  type Survey,
  type SurveySummaryBudget,
  summarizeSurvey,
} from "#ghost-core";
import { detectFileKind, lintDetectedFileKind } from "./scan/file-kind.js";
import {
  diffFingerprints,
  discoverGhostPackages,
  fingerprintPackageDisplayPath,
  formatLayout,
  formatSemanticDiff,
  formatVerifyFingerprintReport,
  initFingerprintPackage,
  initScopedFingerprintPackage,
  inventory,
  layoutFingerprint,
  lintAllFingerprintStacks,
  type lintFingerprint,
  lintFingerprintPackage,
  loadFingerprint,
  loadFingerprintPackage,
  normalizeMemoryDir,
  resolveFingerprintPackage,
  scanStatus,
  verifyAllFingerprintStacks,
  verifyFingerprintPackage,
} from "./scan/index.js";
import { registerEmitCommand } from "./scan-emit-command.js";
import { registerStackCommand } from "./scan-stack-command.js";

/**
 * Register fingerprint package commands on the unified Ghost CLI.
 *
 * Verbs author and validate the root `.ghost/` fingerprint package:
 * `lint` (schema check, auto-detects file kind), `verify` (cross-artifact
 * fidelity), `describe` (section ranges + token estimates for intent or direct
 * fingerprint markdown), `diff` (structural prose-level diff between direct
 * fingerprint files), `emit` (derive review-command, context-bundle, or skill
 * artifacts), and `survey` operations for deterministic `ghost.survey/v1`
 * merge, ID repair, bounded summary output, derived value catalogs, and
 * operational pattern synthesis.
 */
export function registerScanCommands(cli: CAC): void {
  // --- lint ---
  cli
    .command(
      "lint [file]",
      "Validate a root Ghost fingerprint package, split fingerprint artifacts, checks, or direct markdown — defaults to .ghost",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .option(
      "--all",
      "Validate every nested fingerprint package and its resolved fingerprint stack",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for --all and default package lookup (flag name retained; default: .ghost)",
    )
    .action(async (path: string | undefined, opts) => {
      try {
        const memoryDir = memoryDirFromOpts(opts);
        if (opts.all) {
          const report = await lintAllFingerprintStacks(
            resolve(process.cwd(), path ?? "."),
            { memoryDir },
          );
          writeLintReport(report, opts.format);
          process.exit(report.errors > 0 ? 1 : 0);
          return;
        }

        const packagePath = path ?? memoryDir;
        const target = resolveFingerprintPackage(
          packagePath,
          process.cwd(),
        ).dir;
        let report: ReturnType<typeof lintFingerprint>;
        if (path === undefined || (await isDirectory(target))) {
          report = await lintFingerprintPackage(packagePath, process.cwd());
          writeLintReport(report, opts.format);
          process.exit(report.errors > 0 ? 1 : 0);
          return;
        }

        const fileTarget = resolve(process.cwd(), path ?? target);
        const raw = await readFile(fileTarget, "utf-8");
        const kind = detectFileKind(fileTarget, raw);
        const fingerprint =
          kind === "checks"
            ? await loadSiblingFingerprintForChecksLint(fileTarget)
            : undefined;

        report = lintDetectedFileKind(kind, raw, { fingerprint });

        if (kind === "fingerprint" && hasExtends(raw) && report.errors === 0) {
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

  // --- init ---
  cli
    .command("init [dir]", "Create a root .ghost split fingerprint package")
    .option(
      "--scope <path>",
      "Create a scoped <path>/<memory-dir> fingerprint package",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for init --scope or default root init (flag name retained; default: .ghost)",
    )
    .option(
      "--with-intent",
      "Also create optional fingerprint/memory/intent.md for human-authored or human-approved intent",
    )
    .option(
      "--with-config",
      "Also create optional config.yml for implementation roots and reference registries/libraries",
    )
    .option(
      "--reference <path-or-registry>",
      "Reference UI registry, library path, or fingerprint to record in config.yml and inventory building blocks",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        if (dirArg && typeof opts.scope === "string") {
          console.error("Error: use either init [dir] or init --scope <path>");
          process.exit(2);
          return;
        }
        if (dirArg && typeof opts.memoryDir === "string") {
          console.error("Error: use either init [dir] or --memory-dir");
          process.exit(2);
          return;
        }
        const memoryDir = memoryDirFromOpts(opts);
        const initOptions = {
          withIntent: Boolean(opts.withIntent),
          withConfig: Boolean(opts.withConfig || opts.reference),
          reference:
            typeof opts.reference === "string" ? opts.reference : undefined,
          memoryDir,
        };
        const paths =
          typeof opts.scope === "string"
            ? await initScopedFingerprintPackage(
                opts.scope,
                process.cwd(),
                initOptions,
              )
            : await initFingerprintPackage(
                dirArg ?? memoryDir,
                process.cwd(),
                initOptions,
              );
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              initCommandOutput(paths, {
                includeIntent: Boolean(opts.withIntent),
                includeConfig: Boolean(opts.withConfig || opts.reference),
              }),
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            `Initialized Ghost fingerprint package: ${paths.dir}\n`,
          );
          process.stdout.write(`  manifest.yml: ${paths.manifest}\n`);
          process.stdout.write(`  prose.yml: ${paths.prose}\n`);
          process.stdout.write(`  inventory.yml: ${paths.inventory}\n`);
          process.stdout.write(`  composition.yml: ${paths.composition}\n`);
          process.stdout.write(`  enforcement/checks.yml: ${paths.checks}\n`);
          if (opts.withConfig || opts.reference) {
            process.stdout.write(`  config.yml: ${paths.config}\n`);
          }
          if (opts.withIntent) {
            process.stdout.write(`  memory/intent.md: ${paths.intent}\n`);
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

  // --- verify ---
  cli
    .command(
      "verify [dir]",
      "Verify a root Ghost fingerprint package: prose/composition evidence, inventory exemplars, and checks are grounded.",
    )
    .option(
      "--root <dir>",
      "Optional target root used to resolve fingerprint evidence and exemplar paths (default: cwd)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .option(
      "--all",
      "Verify every nested fingerprint package and its resolved fingerprint stack",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for --all and default package lookup (flag name retained; default: .ghost)",
    )
    .action(async (dirArg: string | undefined, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }

        const memoryDir = memoryDirFromOpts(opts);
        const report = opts.all
          ? await verifyAllFingerprintStacks(
              resolve(process.cwd(), dirArg ?? "."),
              {
                memoryDir,
              },
            )
          : await verifyFingerprintPackage(dirArg ?? memoryDir, process.cwd(), {
              root: opts.root ? resolve(process.cwd(), opts.root) : undefined,
            });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(formatVerifyFingerprintReport(report));
        }

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- scan ---
  cli
    .command(
      "scan [dir]",
      "Report fingerprint layer readiness: produced artifacts, useful prose/inventory/composition, and the next BYOA step.",
    )
    .option(
      "--include-scopes",
      "Also report per-scope survey and fingerprint artifacts under modules/<scope>/ and fingerprints/<scope>.md",
    )
    .option(
      "--include-nested",
      "Also list nested fingerprint packages and readiness",
    )
    .option(
      "--memory-dir <relative-dir>",
      "Relative fingerprint package directory for nested discovery and default scan (flag name retained; default: .ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        const memoryDir = memoryDirFromOpts(opts);
        const dir = resolveFingerprintPackage(
          dirArg ?? memoryDir,
          process.cwd(),
        ).dir;
        const status = await scanStatus(dir, {
          includeScopes: Boolean(opts.includeScopes),
        });
        const nested = opts.includeNested
          ? await nestedPackageStatus(
              dirnameForFingerprintPackageDir(dir, memoryDir),
              memoryDir,
            )
          : undefined;
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              nested ? { ...status, nested_bundles: nested } : status,
              null,
              2,
            )}\n`,
          );
        } else {
          const fmt = (state: string) =>
            state === "present" ? "present" : "missing";
          process.stdout.write(`fingerprint dir: ${status.dir}\n\n`);
          process.stdout.write(
            `  fingerprint (fingerprint/): ${fmt(status.fingerprint.state)}\n`,
          );
          process.stdout.write(
            `  config      (config.yml):      ${fmt(status.config.state)}\n`,
          );
          process.stdout.write(
            `  checks      (fingerprint/enforcement/checks.yml): ${fmt(status.checks.state)}\n`,
          );
          process.stdout.write(
            `  cache       (fingerprint/sources/cache/):          ${fmt(status.cache.state)}\n`,
          );
          process.stdout.write(
            `  intent     (fingerprint/memory/intent.md):     ${fmt(status.intent.state)}\n\n`,
          );
          if (status.recommended_next) {
            process.stdout.write(
              `next: run the ${status.recommended_next} stage\n`,
            );
          } else {
            process.stdout.write(
              "next: edit fingerprint/ layers, then run ghost verify/check/review\n",
            );
          }
          process.stdout.write(`readiness: ${status.readiness.state}\n`);
          process.stdout.write(
            `  layers: prose ${status.readiness.layer_counts.prose}, inventory ${status.readiness.layer_counts.inventory}, composition ${status.readiness.layer_counts.composition}\n`,
          );
          if (status.readiness.missing_layers.length > 0) {
            process.stdout.write(
              `  missing layers: ${status.readiness.missing_layers.join(", ")}\n`,
            );
          }
          if (status.readiness.can_review.length > 0) {
            process.stdout.write(
              `  can review: ${status.readiness.can_review.join(", ")}\n`,
            );
          }
          if (status.readiness.cannot_review.length > 0) {
            process.stdout.write(
              `  cannot review: ${status.readiness.cannot_review.join(", ")}\n`,
            );
          }
          if (status.readiness.reasons[0]) {
            process.stdout.write(`  reason: ${status.readiness.reasons[0]}\n`);
          }
          const buildingBlockRows = status.readiness.building_block_rows;
          const buildingBlockCount =
            buildingBlockRows.tokens +
            buildingBlockRows.components +
            buildingBlockRows.libraries +
            buildingBlockRows.assets +
            buildingBlockRows.routes +
            buildingBlockRows.files +
            buildingBlockRows.notes;
          if (buildingBlockCount > 0) {
            process.stdout.write(
              `  inventory building blocks: ${buildingBlockRows.tokens} token(s), ${buildingBlockRows.components} component(s), ${buildingBlockRows.libraries} libraries, ${buildingBlockRows.assets} asset(s), ${buildingBlockRows.routes} route(s), ${buildingBlockRows.files} file(s), ${buildingBlockRows.notes} note(s)\n`,
            );
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
          if (nested) {
            process.stdout.write("\nnested bundles:\n");
            if (nested.length === 0) {
              process.stdout.write("  none\n");
            } else {
              for (const bundle of nested) {
                process.stdout.write(
                  `  ${fingerprintPackageDisplayPath(bundle.relative_root, bundle.fingerprint_dir)}: ${bundle.readiness.state}\n`,
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

  registerStackCommand(cli);

  // --- inventory ---
  cli
    .command(
      "inventory [path]",
      "Emit deterministic raw signals about a frontend repo as JSON for optional cache/source material: package manifests, language histogram, candidate config files, registry presence, top-level tree, and git remote.",
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
      "Print a section map of fingerprint/memory/intent.md or a markdown file (line ranges + token estimates).",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const target = path
          ? resolve(process.cwd(), path)
          : resolveFingerprintPackage(undefined, process.cwd()).intent;
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
      "Direct markdown diff between two fingerprint.md files — what decisions, palette roles, and tokens changed (text-level, NOT embedding distance; for that, use `ghost compare`).",
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
      "Survey/cache helpers for ghost.survey/v1 files. Ops: merge, fix-ids, summarize, catalog, patterns.",
    )
    .option(
      "-o, --out <path>",
      "Write the result to this path (default: stdout)",
    )
    .option(
      "--format <fmt>",
      "Output format: summarize/catalog use markdown or json; patterns use yaml, json, or markdown",
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
        const format = defaultSurveyFormat(op, opts.format);
        if (op === "summarize" || op === "catalog") {
          if (format !== "markdown" && format !== "json") {
            console.error(
              `Error: survey ${op} --format must be 'markdown' or 'json'`,
            );
            process.exit(2);
            return;
          }
        }
        if (op === "patterns") {
          if (format !== "yaml" && format !== "json" && format !== "markdown") {
            console.error(
              "Error: survey patterns --format must be 'yaml', 'json', or 'markdown'",
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
            format === "json"
              ? `${JSON.stringify(summary, null, 2)}\n`
              : formatSurveySummaryMarkdown(summary);
        } else if (op === "catalog") {
          const catalog = catalogSurveyValues(parsed[0], {
            kind: typeof opts.kind === "string" ? opts.kind : undefined,
          });
          out =
            format === "json"
              ? `${JSON.stringify(catalog, null, 2)}\n`
              : formatSurveyCatalogMarkdown(catalog);
        } else if (op === "patterns") {
          const patterns = summarizeSurveyPatterns(parsed[0]);
          out = formatPatternsOutput(patterns, format);
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
}

async function nestedPackageStatus(
  root: string,
  memoryDir: string,
): Promise<NestedPackageStatus[]> {
  const packages = await discoverGhostPackages(root, { memoryDir });
  return Promise.all(
    packages.map(async (pkg) => {
      const status = await scanStatus(pkg.dir);
      return {
        ...pkg,
        fingerprint: status.fingerprint,
        checks: status.checks,
        intent: status.intent,
        readiness: status.readiness,
      };
    }),
  );
}

interface NestedPackageStatus {
  dir: string;
  root: string;
  relative_root: string;
  fingerprint_dir: string;
  fingerprint: Awaited<ReturnType<typeof scanStatus>>["fingerprint"];
  checks: Awaited<ReturnType<typeof scanStatus>>["checks"];
  intent: Awaited<ReturnType<typeof scanStatus>>["intent"];
  readiness: Awaited<ReturnType<typeof scanStatus>>["readiness"];
}

function dirnameForFingerprintPackageDir(
  dir: string,
  memoryDir: string,
): string {
  let root = dir;
  for (const _segment of normalizeMemoryDir(memoryDir).split("/")) {
    root = dirname(root);
  }
  return root;
}

function memoryDirFromOpts(opts: { memoryDir?: unknown }): string {
  return normalizeMemoryDir(
    typeof opts.memoryDir === "string" ? opts.memoryDir : undefined,
  );
}

function initCommandOutput(
  paths: ReturnType<typeof resolveFingerprintPackage>,
  options: { includeIntent: boolean; includeConfig: boolean },
): Record<string, string> {
  return {
    dir: paths.dir,
    fingerprintDir: paths.fingerprintDir,
    manifest: paths.manifest,
    prose: paths.prose,
    inventory: paths.inventory,
    composition: paths.composition,
    ...(options.includeConfig ? { config: paths.config } : {}),
    checks: paths.checks,
    ...(options.includeIntent ? { intent: paths.intent } : {}),
  };
}

async function loadSiblingFingerprintForChecksLint(
  fileTarget: string,
): Promise<GhostFingerprintDocument | undefined> {
  const checksDir = dirname(fileTarget);
  const packageRoot = resolve(checksDir, "..", "..");
  try {
    return (
      await loadFingerprintPackage(resolveFingerprintPackage(packageRoot))
    ).fingerprint;
  } catch {
    return undefined;
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

function defaultSurveyFormat(op: string, format: unknown): string {
  if (typeof format === "string") return format;
  return op === "patterns" ? "yaml" : "markdown";
}

function formatPatternsOutput(
  patterns: GhostPatternsDocument,
  format: string,
): string {
  if (format === "json") return `${JSON.stringify(patterns, null, 2)}\n`;
  if (format === "markdown") return formatSurveyPatternsMarkdown(patterns);
  return stringifyYaml(patterns);
}

function summarizeSurveyPatterns(survey: Survey): GhostPatternsDocument {
  const surfaceTypes = new Map<string, PatternAccumulator>();
  const layoutPatterns = new Map<string, PatternAccumulator>();

  for (const surface of survey.ui_surfaces) {
    const label = surface.locator || surface.name;
    const classification = surface.classification;
    if (classification?.surface_type) {
      addPattern(surfaceTypes, classification.surface_type, label);
    }
    for (const pattern of surface.signals?.layout_patterns ?? []) {
      addPattern(layoutPatterns, pattern, label, surface);
    }
  }

  const surfaceTypeRows = topPatterns(surfaceTypes).map((entry) => ({
    id: slug(entry.value),
    title: entry.value,
    signals: entry.examples,
    preferred_patterns: preferredPatternsForSurfaceType(entry.value, survey),
    evidence: evidenceForSurfaceType(entry.value, survey),
  }));
  const surfaceTypeIds = new Set(surfaceTypeRows.map((row) => row.id));

  return {
    schema: "ghost.patterns/v1",
    id: slug(survey.sources[0]?.id ?? "survey-patterns"),
    surface_types: surfaceTypeRows,
    composition_patterns: topPatterns(layoutPatterns).map((entry) => ({
      id: slug(entry.value),
      title: entry.value,
      surface_types: surfaceTypesForPattern(entry.value, survey).filter((id) =>
        surfaceTypeIds.has(id),
      ),
      frequency: entry.count,
      confidence:
        survey.ui_surfaces.length > 0
          ? Number(
              Math.min(1, entry.count / survey.ui_surfaces.length).toFixed(2),
            )
          : 0,
      anatomy: {
        ordered: anatomyForPattern(entry.value, survey),
      },
      traits: traitsForPattern(entry.value, survey),
      evidence: entry.evidence,
      advisory: [
        "Use as advisory composition evidence; deterministic enforcement belongs in fingerprint/enforcement/checks.yml.",
      ],
    })),
    advisory: {
      review_expectations: surveyPatternReviewExpectations(survey),
    },
  };
}

function surveyPatternReviewExpectations(survey: Survey): string[] {
  if (survey.ui_surfaces.length === 0) {
    return [
      "No UI surface evidence is present; do not infer product composition patterns from values, tokens, or components alone.",
      "Use survey values, tokens, and components as implementation vocabulary until implemented product surfaces are observed.",
      "Treat fingerprint/memory/intent.md as human authority when present.",
    ];
  }

  const hasProductSurface = survey.ui_surfaces.some((surface) =>
    isProductSurfaceKind(surface.kind),
  );
  if (!hasProductSurface) {
    return [
      "Treat story, fixture, and doc-example rows as component demonstration evidence, not product composition authority.",
      "Cite matching composition_patterns[].evidence and survey.ui_surfaces evidence for advisory findings.",
      "Treat fingerprint/memory/intent.md as human authority when present.",
    ];
  }

  return [
    "Identify the surface type before assessing composition.",
    "Cite matching composition_patterns[].evidence and survey.ui_surfaces evidence for advisory findings.",
    "Treat fingerprint/memory/intent.md as human authority when present.",
  ];
}

function isProductSurfaceKind(kind: string): boolean {
  return (
    kind === "route" ||
    kind === "screen" ||
    kind === "screenshot" ||
    kind === "source"
  );
}

interface PatternAccumulator {
  count: number;
  examples: string[];
  evidence: Array<{ surface_id?: string; locator?: string; path?: string }>;
}

function addPattern(
  map: Map<string, PatternAccumulator>,
  value: string,
  example: string,
  surface?: Survey["ui_surfaces"][number],
): void {
  const current = map.get(value) ?? { count: 0, examples: [], evidence: [] };
  current.count += 1;
  if (!current.examples.includes(example) && current.examples.length < 5) {
    current.examples.push(example);
  }
  if (surface && current.evidence.length < 5) {
    current.evidence.push({
      surface_id: surface.id,
      locator: surface.locator,
      ...(surface.files[0] ? { path: surface.files[0] } : {}),
    });
  }
  map.set(value, current);
}

function topPatterns(map: Map<string, PatternAccumulator>): Array<{
  value: string;
  count: number;
  examples: string[];
  evidence: Array<{ surface_id?: string; locator?: string; path?: string }>;
}> {
  return [...map.entries()]
    .map(([value, accumulator]) => ({
      value,
      count: accumulator.count,
      examples: accumulator.examples,
      evidence: accumulator.evidence,
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function formatSurveyPatternsMarkdown(summary: GhostPatternsDocument): string {
  const lines = [
    "# Survey Patterns",
    "",
    `Schema: ${summary.schema}`,
    `Surface types: ${summary.surface_types.length}`,
    `Composition patterns: ${summary.composition_patterns.length}`,
    "",
  ];
  appendPatternSection(
    lines,
    "Surface Types",
    summary.surface_types.map((surfaceType) => ({
      value: surfaceType.id,
      count: surfaceType.evidence?.length ?? 0,
      examples: surfaceType.signals ?? [],
    })),
  );
  appendPatternSection(
    lines,
    "Composition Patterns",
    summary.composition_patterns.map((pattern) => ({
      value: pattern.id,
      count: pattern.frequency ?? 0,
      examples:
        pattern.evidence?.map((entry) => entry.locator ?? entry.path ?? "") ??
        [],
    })),
  );
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

function preferredPatternsForSurfaceType(
  surfaceType: string,
  survey: Survey,
): string[] {
  const counts = new Map<string, number>();
  for (const surface of survey.ui_surfaces) {
    if (surface.classification?.surface_type !== surfaceType) continue;
    for (const pattern of surface.signals?.layout_patterns ?? []) {
      counts.set(slug(pattern), (counts.get(slug(pattern)) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([id]) => id);
}

function evidenceForSurfaceType(
  surfaceType: string,
  survey: Survey,
): Array<{ surface_id: string; locator: string; path?: string }> {
  return survey.ui_surfaces
    .filter((surface) => surface.classification?.surface_type === surfaceType)
    .slice(0, 5)
    .map((surface) => ({
      surface_id: surface.id,
      locator: surface.locator,
      ...(surface.files[0] ? { path: surface.files[0] } : {}),
    }));
}

function surfaceTypesForPattern(pattern: string, survey: Survey): string[] {
  const types = new Set<string>();
  for (const surface of survey.ui_surfaces) {
    if (!surface.signals?.layout_patterns?.includes(pattern)) continue;
    const surfaceType = surface.classification?.surface_type;
    if (surfaceType) types.add(slug(surfaceType));
  }
  return [...types].sort();
}

function anatomyForPattern(pattern: string, survey: Survey): string[] {
  const counts = new Map<string, number>();
  for (const surface of survey.ui_surfaces) {
    if (!surface.signals?.layout_patterns?.includes(pattern)) continue;
    for (const item of surface.composition?.anatomy ?? []) {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([item]) => item);
}

function traitsForPattern(
  pattern: string,
  survey: Survey,
): Record<string, string[]> {
  const densities = new Set<string>();
  const layoutShapes = new Set<string>();
  const components = new Set<string>();
  for (const surface of survey.ui_surfaces) {
    if (!surface.signals?.layout_patterns?.includes(pattern)) continue;
    if (surface.classification?.density) {
      densities.add(surface.classification.density);
    }
    if (surface.classification?.layout_shape) {
      layoutShapes.add(surface.classification.layout_shape);
    }
    for (const component of surface.signals?.dominant_components ?? []) {
      components.add(component);
    }
  }
  return {
    density: [...densities].sort(),
    layout_shape: [...layoutShapes].sort(),
    dominant_components: [...components].sort().slice(0, 8),
    source_signal: [pattern],
  };
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "") || "pattern"
  );
}
