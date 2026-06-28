import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import type { CAC } from "cac";
import { stringify as stringifyYaml } from "yaml";
import type {
  GhostPatternsDocument,
  Survey,
  SurveySummaryBudget,
} from "#ghost-core";
import {
  formatVerifyFingerprintReport,
  type LintReport,
  lintFingerprintPackage,
  resolveFingerprintPackage,
  verifyFingerprintPackage,
} from "./fingerprint.js";
import { registerInitCommand } from "./init-command.js";
import { detectFileKind, lintDetectedFileKind } from "./scan/file-kind.js";
import { resolveGhostDirDefault, scanStatus, signals } from "./scan/index.js";
import { registerEmitCommand } from "./scan-emit-command.js";

/**
 * Register fingerprint package commands on the unified Ghost CLI.
 *
 * Verbs author and validate the root `.ghost/` fingerprint package:
 * `lint` (schema check, auto-detects file kind), `verify` (cross-artifact
 * fidelity), `describe` (section ranges + token estimates for direct
 * fingerprint markdown), `diff` (structural intent-level diff between direct
 * fingerprint files), `emit` (derive review-command artifacts), and `survey`
 * operations for deterministic `ghost.survey/v1`
 * merge, ID repair, bounded summary output, derived value catalogs, and
 * operational pattern synthesis.
 */
export function registerFingerprintCommands(cli: CAC): void {
  // --- lint ---
  cli
    .command(
      "lint [file]",
      "Validate a root Ghost fingerprint package, split fingerprint artifacts, checks, or direct markdown — defaults to .ghost",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (path: string | undefined, opts) => {
      try {
        const ghostDir = ghostDirFromEnv();
        const packagePath = path ?? ghostDir;
        const target = resolveFingerprintPackage(
          packagePath,
          process.cwd(),
        ).dir;
        let report: LintReport;
        if (path === undefined || (await isDirectory(target))) {
          report = await lintFingerprintPackage(packagePath, process.cwd());
          writeLintReport(report, opts.format);
          process.exit(report.errors > 0 ? 1 : 0);
          return;
        }

        const fileTarget = resolve(process.cwd(), path ?? target);
        const raw = await readFile(fileTarget, "utf-8");
        const kind = detectFileKind(fileTarget, raw);
        report = lintDetectedFileKind(kind, raw);

        writeLintReport(report, opts.format);

        process.exit(report.errors > 0 ? 1 : 0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  registerInitCommand(cli);

  // --- verify ---
  cli
    .command(
      "verify [dir]",
      "Verify a root Ghost fingerprint package: intent/composition evidence, inventory exemplars, and checks are grounded.",
    )
    .option(
      "--root <dir>",
      "Optional target root used to resolve fingerprint evidence and exemplar paths (default: cwd)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }

        const ghostDir = ghostDirFromEnv();
        const report = await verifyFingerprintPackage(
          dirArg ?? ghostDir,
          process.cwd(),
          {
            root: opts.root ? resolve(process.cwd(), opts.root) : undefined,
          },
        );

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
      "Report sparse fingerprint package contribution facets: intent, inventory, composition, and the next BYOA step.",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        const ghostDir = ghostDirFromEnv();
        const dir = resolveFingerprintPackage(
          dirArg ?? ghostDir,
          process.cwd(),
        ).dir;
        const status = await scanStatus(dir);
        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
        } else {
          const fmt = (state: string) =>
            state === "present" ? "present" : "missing";
          process.stdout.write(`package dir: ${status.dir}\n\n`);
          process.stdout.write(
            `  package    (manifest.yml): ${fmt(status.fingerprint.state)}\n`,
          );
          process.stdout.write("\n");
          if (status.recommended_next) {
            process.stdout.write(
              `next: run the ${status.recommended_next} stage\n`,
            );
          } else {
            process.stdout.write(
              "next: edit contributing fingerprint facets, then run ghost verify/check/review\n",
            );
          }
          process.stdout.write(`contribution: ${status.contribution.state}\n`);
          for (const facet of ["intent", "inventory", "composition"] as const) {
            const report = status.contribution.facets[facet];
            process.stdout.write(
              `  ${facet}: ${report.state} (${report.count})\n`,
            );
          }
          if (status.contribution.contributing_facets.length > 0) {
            process.stdout.write(
              `  contributing facets: ${status.contribution.contributing_facets.join(", ")}\n`,
            );
          }
          if (status.contribution.empty_facets.length > 0) {
            process.stdout.write(
              `  empty facets: ${status.contribution.empty_facets.join(", ")}\n`,
            );
          }
          if (status.contribution.absent_facets.length > 0) {
            process.stdout.write(
              `  absent facets: ${status.contribution.absent_facets.join(", ")}\n`,
            );
          }
          if (status.contribution.reasons[0]) {
            process.stdout.write(
              `  reason: ${status.contribution.reasons[0]}\n`,
            );
          }
          const buildingBlockRows = status.contribution.building_block_rows;
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
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  // --- signals ---
  cli
    .command(
      "signals [path]",
      "Emit deterministic raw repo signals as JSON: package manifests, language histogram, candidate config files, registry presence, top-level tree, and git remote.",
    )
    .action(async (path: string | undefined) => {
      try {
        const target = resolve(process.cwd(), path ?? ".");
        const out = signals(target);
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });

  registerEmitCommand(cli);
}

function ghostDirFromEnv(): string {
  return resolveGhostDirDefault();
}

function writeLintReport(report: LintReport, format: unknown): void {
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

function _isSurveySummaryBudget(value: unknown): value is SurveySummaryBudget {
  return value === "compact" || value === "standard" || value === "full";
}

function _surveyVerbName(op: string): string {
  if (op === "merge") return "merging";
  if (op === "summarize") return "summarizing";
  if (op === "catalog") return "cataloging";
  if (op === "patterns") return "summarizing patterns";
  return op;
}

function _defaultSurveyFormat(op: string, format: unknown): string {
  if (typeof format === "string") return format;
  return op === "patterns" ? "yaml" : "markdown";
}

function _formatPatternsOutput(
  patterns: GhostPatternsDocument,
  format: string,
): string {
  if (format === "json") return `${JSON.stringify(patterns, null, 2)}\n`;
  if (format === "markdown") return formatSurveyPatternsMarkdown(patterns);
  return stringifyYaml(patterns);
}

function _summarizeSurveyPatterns(survey: Survey): GhostPatternsDocument {
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
        "Use as advisory composition evidence; deterministic checks belong in validate.yml.",
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
      "Treat intent.yml, inventory.yml, and composition.yml as canonical authoring facets.",
    ];
  }

  const hasProductSurface = survey.ui_surfaces.some((surface) =>
    isProductSurfaceKind(surface.kind),
  );
  if (!hasProductSurface) {
    return [
      "Treat story, fixture, and doc-example rows as component demonstration evidence, not product composition authority.",
      "Cite matching composition_patterns[].evidence and survey.ui_surfaces evidence for advisory findings.",
      "Treat intent.yml, inventory.yml, and composition.yml as canonical authoring facets.",
    ];
  }

  return [
    "Identify the surface type before assessing composition.",
    "Cite matching composition_patterns[].evidence and survey.ui_surfaces evidence for advisory findings.",
    "Treat intent.yml, inventory.yml, and composition.yml as canonical authoring facets.",
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
