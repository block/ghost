import type { CAC } from "cac";
import { buildCatalogMenu, type CatalogMenuEntry } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import {
  type HauntMaterialEntry,
  loadHauntMaterials,
} from "../scan/haunt-materials.js";
import { failFromError } from "./errors.js";

export function registerGatherCommand(cli: CAC): void {
  cli
    .command(
      "gather",
      "Emit the fingerprint menu — every node's id, kind, and description — for the agent to select from.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
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

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const menu = buildCatalogMenu(loaded.catalog);
        // Materials come from the haunt plugin's inventory (id + description
        // only). Checks are feed-back only and are never served here.
        const materials = await loadHauntMaterials(paths.packageDir);

        // Ghost does no selection. It emits the catalog; the agent reads the
        // ask against it and pulls the nodes it judges relevant.
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "menu",
                nodes: menu,
                ...(materials !== undefined ? { materials } : {}),
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(formatMenuMarkdown(menu, materials));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function formatMenuMarkdown(
  menu: CatalogMenuEntry[],
  materials?: HauntMaterialEntry[],
): string {
  const lines: string[] = [
    "# Ghost Nodes",
    "",
    "The fingerprint menu. Match the ask against these nodes and read the ones you judge relevant.",
    "",
  ];
  for (const entry of menu) {
    const kind = entry.kind ? ` _(${entry.kind})_` : "";
    lines.push(`- \`${entry.id}\`${kind}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
  }
  if (materials !== undefined && materials.length > 0) {
    lines.push(
      "",
      "## Materials (haunt inventory)",
      "",
      "Repo-local building blocks from the haunt plugin — inspect their paths in .ghost/haunt/inventory/.",
      "",
    );
    for (const material of materials) {
      lines.push(
        material.description
          ? `- \`${material.id}\` — ${material.description}`
          : `- \`${material.id}\``,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
