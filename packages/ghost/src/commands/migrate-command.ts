import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CAC } from "cac";
import { parse as parseYaml } from "yaml";
import { UsageError } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import {
  looksLegacy,
  type MigrationNote,
  type MigrationResult,
  migratedNodeFiles,
  migrateLegacyPackage,
} from "../scan/index.js";
import { failFromError } from "./errors.js";

export function registerMigrateCommand(cli: CAC): void {
  cli
    .command(
      "migrate [dir]",
      "Migrate a legacy .ghost/ package onto the directory-tree node model.",
    )
    .option("--dry-run", "Print the migration plan and report; write nothing")
    .option("--force", "Overwrite existing facet files with the migrated form")
    .option("--format <fmt>", "Report format: cli or json", { default: "cli" })
    .action(async (dirArg: string | undefined, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }

        const paths = resolveFingerprintPackage(dirArg, process.cwd());
        const input = {
          ...(await readYaml(paths.intent, "intent")),
          ...(await readYaml(paths.inventory, "inventory")),
          ...(await readYaml(paths.composition, "composition")),
        };

        if (!looksLegacy(input)) {
          console.error(
            "Error: no legacy coordinates found (topology / applies_to / surface_type / scope). Nothing to migrate.",
          );
          process.exit(2);
          return;
        }

        const result = migrateLegacyPackage(input);

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(reportJson(result), null, 2)}\n`,
          );
        } else {
          process.stdout.write(formatReport(result, paths.packageDir));
        }

        if (opts.dryRun) {
          process.exit(0);
          return;
        }

        await writeMigrated(
          {
            packageDir: paths.packageDir,
            facetFiles: [paths.intent, paths.inventory, paths.composition],
          },
          result,
          Boolean(opts.force),
        );
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

async function readYaml(
  path: string,
  key: "intent" | "inventory" | "composition",
): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = parseYaml(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { [key]: parsed };
    }
    return {};
  } catch {
    return {};
  }
}

async function writeMigrated(
  paths: {
    packageDir: string;
    facetFiles: string[];
  },
  result: MigrationResult,
  force: boolean,
): Promise<void> {
  // One-way conversion to the directory-tree node form. Facet files are
  // removed; Git history preserves the old form.
  const nodeFiles = migratedNodeFiles(result);
  const writes: Array<[string, string]> = nodeFiles.map(
    (file): [string, string] => [
      join(paths.packageDir, file.relativePath),
      file.content,
    ],
  );

  // Ensure nested surface directories exist.
  const dirs = new Set(writes.map(([path]) => dirname(path)));
  await Promise.all([...dirs].map((dir) => mkdir(dir, { recursive: true })));

  await Promise.all(
    writes.map(([path, content]) =>
      writeFile(path, content, {
        encoding: "utf-8",
        flag: force ? "w" : "wx",
      }).catch((err: unknown) => {
        if (!force && isExisting(err)) {
          throw new UsageError(
            `Refusing to overwrite ${path}. Pass --force to rewrite the package in place.`,
          );
        }
        throw err;
      }),
    ),
  );

  // Remove the legacy facet files (one-way migration).
  await Promise.all(paths.facetFiles.map((path) => rm(path, { force: true })));
}

function isExisting(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "EEXIST"
  );
}

function reportJson(result: MigrationResult): Record<string, unknown> {
  return {
    surfaces: result.surfaceIds,
    notes: result.notes,
  };
}

function formatReport(result: MigrationResult, packageDir: string): string {
  const surfaceIds = result.surfaceIds;
  const lines: string[] = ["# Ghost Migration"];
  lines.push(
    "",
    `Derived ${surfaceIds.length} surface director(ies) under ${packageDir}/`,
    ...surfaceIds.map((id) => `  - \`${id}/\``),
  );
  lines.push("", `## Review (${result.notes.length})`);
  if (result.notes.length === 0) {
    lines.push("- nothing needs manual review");
  } else {
    for (const note of result.notes) lines.push(`- ${formatNote(note)}`);
  }
  return `${lines.join("\n")}\n`;
}

function formatNote(note: MigrationNote): string {
  const where = note.node_id ? `\`${note.node_id}\` (${note.path})` : note.path;
  return `${where}: ${note.detail}`;
}
