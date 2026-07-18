import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { CAC } from "cac";
import {
  classifyMaterialLocator,
  type GhostCatalogNode,
  resolveLocalMaterialLocator,
  type TransportedMaterialTier,
} from "#ghost-core";
import { lintGhostPackage, resolveGhostPackage } from "../package.js";
import { readPackageVersion } from "../package-version.js";
import { GHOST_CHECKS_DIR } from "../scan/check-files.js";
import {
  GHOST_EVENTS_FILENAME,
  GHOST_MATERIALS_DIR,
} from "../scan/constants.js";
import {
  type LoadedGhostPackage,
  loadGhostPackage,
} from "../scan/fingerprint-package.js";
import { resolveGitRoot } from "../scan/package-paths.js";
import { defaultArchiveName, writeDirectoryTarball } from "../scan/tarball.js";
import { failFromError } from "./errors.js";

interface ExportAuditTravelingLocator {
  nodeId: string;
  locator: string;
  tier: Extract<TransportedMaterialTier, "bundled" | "url">;
}

interface ExportAuditStrandedLocator {
  nodeId: string;
  locator: string;
}

interface ExportAudit {
  travels: ExportAuditTravelingLocator[];
  stranded: ExportAuditStrandedLocator[];
}

const EXPORT_SCHEMA = "ghost.export/v1";

export function registerExportCommand(cli: CAC): void {
  cli
    .command(
      "export",
      "Package the ghost package as a portable brand artifact with a locator audit.",
    )
    .option("--out <path>", "Write the archive to this path")
    .option("--no-checks", "Exclude the checks/ directory from the archive")
    .option(
      "--strict",
      "Exit 2 if any referenced local material locators will not travel",
    )
    .option(
      "--package <dir>",
      "Use this ghost package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const paths = resolveGhostPackage(opts.package, process.cwd());
        const report = await lintGhostPackage(opts.package, process.cwd());
        if (report.errors > 0) {
          console.error(
            "Error: ghost package has validation errors. Run `ghost validate` and fix them before exporting.",
          );
          process.exit(2);
          return;
        }
        const loaded = await loadGhostPackage(paths);

        const archive =
          typeof opts.out === "string"
            ? resolve(process.cwd(), opts.out)
            : resolve(process.cwd(), defaultArchiveName(loaded.manifest.id));
        const exported = new Date().toISOString();
        await mkdir(dirname(archive), { recursive: true });
        await writeDirectoryTarball({
          rootDir: paths.packageDir,
          outFile: archive,
          extraEntries: [
            {
              path: "export.yml",
              data: formatExportManifest({
                id: loaded.manifest.id,
                cli: readPackageVersion(),
                exported,
              }),
              mtime: new Date(exported),
            },
          ],
          exclude: (relativePath) =>
            relativePath === GHOST_EVENTS_FILENAME ||
            (opts.checks === false &&
              (relativePath === GHOST_CHECKS_DIR ||
                relativePath.startsWith(`${GHOST_CHECKS_DIR}/`))),
        });

        const repoRoot = await resolveGitRoot(process.cwd());
        const audit = buildExportAudit(loaded, {
          repoRoot,
          packageDir: paths.packageDir,
        });

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "export",
                archive,
                id: loaded.manifest.id,
                audit,
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            formatExportMarkdown({
              archive,
              id: loaded.manifest.id,
              audit,
            }),
          );
        }

        process.exit(opts.strict && audit.stranded.length > 0 ? 2 : 0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function buildExportAudit(
  loaded: LoadedGhostPackage,
  options: { repoRoot: string; packageDir: string },
): ExportAudit {
  const travels: ExportAuditTravelingLocator[] = [];
  const stranded: ExportAuditStrandedLocator[] = [];

  for (const node of loaded.catalog.nodes.values()) {
    auditNodeMaterials(node, options, travels, stranded);
  }

  return { travels, stranded };
}

function auditNodeMaterials(
  node: GhostCatalogNode,
  options: { repoRoot: string; packageDir: string },
  travels: ExportAuditTravelingLocator[],
  stranded: ExportAuditStrandedLocator[],
): void {
  for (const locator of node.materials ?? []) {
    const classified = classifyMaterialLocator(locator);
    if (classified.kind === "url") {
      travels.push({ nodeId: node.id, locator, tier: "url" });
      continue;
    }

    const resolved = resolveLocalMaterialLocator(locator, {
      repoRoot: options.repoRoot,
      packageDir: options.packageDir,
      materialsDir: GHOST_MATERIALS_DIR,
    });
    if (resolved.tier === "bundled") {
      travels.push({ nodeId: node.id, locator, tier: "bundled" });
    } else {
      stranded.push({ nodeId: node.id, locator });
    }
  }
}

function formatExportManifest(fields: {
  id: string;
  cli: string;
  exported: string;
}): string {
  return [
    `schema: ${EXPORT_SCHEMA}`,
    `id: ${fields.id}`,
    `cli: ${fields.cli}`,
    `exported: ${fields.exported}`,
    "",
  ].join("\n");
}

function formatExportMarkdown(fields: {
  archive: string;
  id: string;
  audit: ExportAudit;
}): string {
  const lines = [
    "# ghost Export",
    "",
    `Archive: \`${fields.archive}\``,
    `Package: \`${fields.id}\``,
    "",
    "## Locator audit",
    "",
  ];

  if (fields.audit.travels.length > 0) {
    lines.push("Travels with the archive:", "");
    for (const item of fields.audit.travels) {
      const label = item.tier === "url" ? "HTTPS URL" : "bundled material";
      lines.push(`- \`${item.nodeId}\` — \`${item.locator}\` (${label})`);
    }
  } else {
    lines.push("Travels with the archive: none.");
  }

  lines.push("", "Will not travel:", "");
  if (fields.audit.stranded.length > 0) {
    for (const item of fields.audit.stranded) {
      lines.push(
        `- \`${item.nodeId}\` — \`${item.locator}\``,
        "  - Bundle it into `.ghost/materials/` or accept the gap.",
      );
    }
  } else {
    lines.push("- No referenced local material locators are stranded.");
  }

  return `${lines.join("\n")}\n`;
}
