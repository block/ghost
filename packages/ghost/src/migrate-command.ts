import { readFile, writeFile } from "node:fs/promises";
import type { CAC } from "cac";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { resolveFingerprintPackage } from "./fingerprint.js";
import {
  looksLegacy,
  type MigrationNote,
  type MigrationResult,
  migrateLegacyPackage,
} from "./scan/index.js";

export function registerMigrateCommand(cli: CAC): void {
  cli
    .command(
      "migrate [dir]",
      "Migrate a legacy .ghost/ package onto the surface model (surfaces.yml + surface: placement).",
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
          process.stdout.write(formatReport(result, paths.surfaces));
        }

        if (opts.dryRun) {
          process.exit(0);
          return;
        }

        await writeMigrated(
          {
            surfaces: paths.surfaces,
            intent: paths.intent,
            inventory: paths.inventory,
            composition: paths.composition,
          },
          result,
          Boolean(opts.force),
        );
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
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
    surfaces: string;
    intent: string;
    inventory: string;
    composition: string;
  },
  result: MigrationResult,
  force: boolean,
): Promise<void> {
  const writes: Array<[string, string]> = [
    [paths.surfaces, stringifyYaml(result.surfaces)],
  ];
  if (result.intent) writes.push([paths.intent, stringifyYaml(result.intent)]);
  if (result.inventory) {
    writes.push([paths.inventory, stringifyYaml(result.inventory)]);
  }
  if (result.composition) {
    writes.push([paths.composition, stringifyYaml(result.composition)]);
  }
  await Promise.all(
    writes.map(([path, content]) =>
      writeFile(path, content, {
        encoding: "utf-8",
        flag: force ? "w" : "wx",
      }).catch((err: unknown) => {
        if (!force && isExisting(err)) {
          throw new Error(
            `Refusing to overwrite ${path}. Pass --force to rewrite the package in place.`,
          );
        }
        throw err;
      }),
    ),
  );
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
    surfaces: (result.surfaces.surfaces as unknown[]) ?? [],
    notes: result.notes,
  };
}

function formatReport(result: MigrationResult, surfacesPath: string): string {
  const surfaces = (result.surfaces.surfaces as Array<{ id: string }>) ?? [];
  const lines: string[] = ["# Ghost Migration"];
  lines.push(
    "",
    `Derived ${surfaces.length} surface(s) → ${surfacesPath}`,
    ...surfaces.map((surface) => `  - \`${surface.id}\``),
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
