import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundle } from "@ghost/core";
import { cac } from "cac";
import { loadMembers, summarizeMember, writeFleetView } from "./core/index.js";

/**
 * The skill bundle's source files live in `src/skill-bundle/` as real
 * markdown and are copied verbatim into `dist/skill-bundle/` by the
 * package build step. This loader points the shared `@ghost/core`
 * walker at that built directory at runtime.
 */
const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("./skill-bundle", import.meta.url),
);

const DEFAULT_SKILL_OUT = ".claude/skills/ghost-fleet";

/**
 * Build the cac CLI for `ghost-fleet`.
 *
 * Three deterministic verbs:
 *   - `members <dir>` — list registered members + freshness signal
 *   - `view <dir>` — emit fleet.md + fleet.json into `<dir>/reports/`
 *   - `emit skill` — install the agentskills.io bundle into a host agent
 *
 * Tracks-graph extraction, temporal aggregation, and group-by axis stacking
 * are scoped out of this milestone — see the per-verb deferral notes in
 * `docs/ideas/ghost-fleet.md`.
 */
export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-fleet");

  // --- members ---
  cli
    .command(
      "members [dir]",
      "List registered fleet members and their freshness — one row per (map.md, expression.md) subdirectory.",
    )
    .option("--json", "Output JSON (one object per member) instead of a table")
    .action(async (dir: string | undefined, opts: { json?: boolean }) => {
      try {
        const target = resolve(process.cwd(), dir ?? ".");
        const members = await loadMembers(target);
        const summaries = members.map(summarizeMember);

        if (opts.json) {
          process.stdout.write(`${JSON.stringify(summaries, null, 2)}\n`);
          process.exit(0);
        }

        if (summaries.length === 0) {
          process.stdout.write(`No members found under ${target}\n`);
          process.exit(0);
        }

        process.stdout.write(formatMembersTable(summaries));
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });

  // --- view ---
  cli
    .command(
      "view [dir]",
      "Compute the fleet's pairwise distances, group-by tables, and tracks-graph; emit fleet.md + fleet.json into <dir>/reports/.",
    )
    .option(
      "--id <id>",
      "Override the fleet id (default: directory basename slug)",
    )
    .option("--out <path>", "Reports directory (default: <dir>/reports)")
    .action(
      async (dir: string | undefined, opts: { id?: string; out?: string }) => {
        try {
          const target = resolve(process.cwd(), dir ?? ".");
          const result = await writeFleetView(target, {
            id: opts.id,
            outDir: opts.out,
          });
          const cwd = process.cwd();
          process.stdout.write(
            `Wrote ${result.files.length} file${
              result.files.length === 1 ? "" : "s"
            } to ${displayPath(cwd, result.outDir)}:\n`,
          );
          for (const f of result.files) {
            process.stdout.write(`  ${f}\n`);
          }
          const memberCount = result.view.members.length;
          const distanceCount = result.view.distances.length;
          process.stdout.write(
            `\n${memberCount} member${memberCount === 1 ? "" : "s"}, ${distanceCount} pairwise distance${
              distanceCount === 1 ? "" : "s"
            }, ${result.view.tracks.length} track edge${
              result.view.tracks.length === 1 ? "" : "s"
            }\n`,
          );
          process.exit(0);
        } catch (err) {
          process.stderr.write(
            `Error: ${err instanceof Error ? err.message : String(err)}\n`,
          );
          process.exit(2);
        }
      },
    );

  // --- emit skill ---
  cli
    .command(
      "emit <kind>",
      "Emit the ghost-fleet agentskills.io bundle (kind: skill).",
    )
    .option(
      "-o, --out <path>",
      `Output directory (default: ${DEFAULT_SKILL_OUT})`,
    )
    .action(async (kind: string, opts: { out?: string }) => {
      try {
        if (kind !== "skill") {
          process.stderr.write(
            `Error: unknown emit kind '${kind}'. Supported: skill.\n`,
          );
          process.exit(2);
          return;
        }

        const outDir = resolve(process.cwd(), opts.out ?? DEFAULT_SKILL_OUT);
        const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);
        const written: string[] = [];
        for (const file of bundle) {
          const outPath = resolve(outDir, file.path);
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, file.content, "utf-8");
          written.push(file.path);
        }
        process.stdout.write(
          `Wrote ${written.length} file${
            written.length === 1 ? "" : "s"
          } to ${outDir}:\n`,
        );
        for (const f of written) process.stdout.write(`  ${f}\n`);
        process.exit(0);
      } catch (err) {
        process.stderr.write(
          `Error: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(2);
      }
    });

  cli.help();
  cli.version(readPackageVersion());

  return cli;
}

/**
 * Format the members table for human stdout.
 *
 * Columns: id, platform, build_system, registry, expression mtime, status.
 */
function formatMembersTable(
  summaries: ReturnType<typeof summarizeMember>[],
): string {
  const headers = [
    "ID",
    "PLATFORM",
    "BUILD",
    "REGISTRY",
    "EXPRESSION",
    "STATUS",
  ];
  const rows = summaries.map((s) => [
    s.id,
    formatCellValue(s.platform),
    formatCellValue(s.build_system),
    s.registry ?? "-",
    s.expression_mtime ? s.expression_mtime.slice(0, 10) : "-",
    s.ok ? "ok" : `${s.mapStatus}/${s.expressionStatus}`,
  ]);
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i]?.length ?? 0)),
  );
  const fmt = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i] ?? 0)).join("  ");
  const out: string[] = [fmt(headers), fmt(widths.map((w) => "-".repeat(w)))];
  for (const row of rows) out.push(fmt(row));
  return `${out.join("\n")}\n`;
}

/**
 * Format a single-or-array `MemberSummary` cell for the human table.
 * Arrays render as comma-separated values so multi-platform repos show
 * all members in one row.
 */
function formatCellValue(value: string | string[] | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.join(",");
  }
  return value;
}

function displayPath(cwd: string, target: string): string {
  const rel = relative(cwd, target);
  if (rel.length > 0 && !rel.startsWith("..")) return rel;
  return target;
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
