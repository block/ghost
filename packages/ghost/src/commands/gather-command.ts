import type { CAC } from "cac";
import { buildCatalogMenu, type CatalogMenuEntry } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { appendGhostEvent } from "../observability-events.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

export function registerGatherCommand(cli: CAC): void {
  cli
    .command(
      "gather [...ask]",
      "Emit the fingerprint menu — every node's id, kind, and description — for the agent to select from.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (askParts: string[] | undefined, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const ask = normalizeAsk(askParts);
        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const menu = buildCatalogMenu(loaded.catalog);
        await appendGhostEvent(paths.packageDir, {
          event: "gather",
          ...(ask ? { ask } : {}),
          menu: menu.map((entry) => entry.id),
        });

        // Ghost does no selection. It emits the catalog; the agent reads the
        // ask against it and pulls the nodes it judges relevant.
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "menu",
                ...(ask ? { ask } : {}),
                nodes: menu,
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(formatMenuMarkdown(menu, ask));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function normalizeAsk(askParts: string[] | undefined): string | undefined {
  const ask = (askParts ?? []).join(" ").trim();
  return ask.length > 0 ? ask : undefined;
}

function formatMenuMarkdown(menu: CatalogMenuEntry[], ask?: string): string {
  const lines: string[] = [
    ask ? `# Ghost Nodes — for: ${ask}` : "# Ghost Nodes",
    "",
    "The fingerprint menu. Match the ask against these nodes and read the ones you judge relevant.",
    "",
  ];
  for (const entry of menu) {
    const kind = entry.kind ? ` _(${entry.kind})_` : "";
    lines.push(`- \`${entry.id}\`${kind}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
    if (entry.materials !== undefined) {
      lines.push(`  - materials: ${entry.materials}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
