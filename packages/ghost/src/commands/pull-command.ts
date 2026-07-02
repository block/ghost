import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { CAC } from "cac";
import { closestIds, type GhostCatalogNode } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

/**
 * The pull history tape: one line per pull, appended to `.pulls` inside the
 * package directory. A dotfile, so the node scanner never sees it; disposable
 * local scratch (init ignores it via `.gitignore`), never canonical state —
 * nothing in Ghost reads it back. It exists so an author iterating on the
 * fingerprint can see what an agent reached for: `tail .ghost/.pulls`.
 */
export const PULL_HISTORY_FILENAME = ".pulls";

export function registerPullCommand(cli: CAC): void {
  cli
    .command(
      "pull <...ids>",
      "Emit the named nodes' full prose bodies, and append the pull to the local history tape.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option("--no-history", "Skip appending this pull to .ghost/.pulls")
    .action(async (ids: string[], opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const catalog = loaded.catalog;

        const requested = [...new Set(ids)];
        const missing = requested.filter((id) => !catalog.nodes.has(id));
        if (missing.length > 0) {
          const allIds = [...catalog.nodes.keys()];
          for (const id of missing) {
            const suggestions = closestIds(id, allIds);
            const hint =
              suggestions.length > 0
                ? ` (did you mean ${suggestions.map((s) => `\`${s}\``).join(", ")}?)`
                : "";
            console.error(`Error: unknown node \`${id}\`${hint}`);
          }
          console.error("Run `ghost gather` to list every node.");
          process.exit(2);
          return;
        }

        const nodes = requested.map(
          (id) => catalog.nodes.get(id) as GhostCatalogNode,
        );

        if (opts.history !== false) {
          const line = `${new Date().toISOString()} ${requested.join(" ")}\n`;
          await appendFile(
            join(paths.packageDir, PULL_HISTORY_FILENAME),
            line,
            "utf8",
          );
        }

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "pull",
                nodes: nodes.map((node) => ({
                  id: node.id,
                  ...(node.kind !== undefined ? { kind: node.kind } : {}),
                  ...(node.description
                    ? { description: node.description }
                    : {}),
                  body: node.body,
                })),
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(formatPullMarkdown(nodes));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function formatPullMarkdown(nodes: GhostCatalogNode[]): string {
  const sections: string[] = [];
  for (const node of nodes) {
    const kind = node.kind ? ` _(${node.kind})_` : "";
    const lines = [`# \`${node.id}\`${kind}`];
    if (node.description) lines.push("", `> ${node.description}`);
    lines.push("", node.body.trim());
    sections.push(lines.join("\n"));
  }
  return `${sections.join("\n\n---\n\n")}\n`;
}
