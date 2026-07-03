import type { CAC } from "cac";
import { closestIds, type GhostCatalogNode } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { appendGhostEvent, type PullMiss } from "../observability-events.js";
import { GHOST_EVENTS_FILENAME } from "../scan/constants.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

export function registerPullCommand(cli: CAC): void {
  cli
    .command(
      "pull <...ids>",
      "Emit the named nodes' full prose bodies, and append the pull to the local events tape.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option(
      "--no-history",
      `Skip appending this pull to .ghost/${GHOST_EVENTS_FILENAME}`,
    )
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
        const allIds = [...catalog.nodes.keys()];
        const known = requested.filter((id) => catalog.nodes.has(id));
        const missed: PullMiss[] = requested
          .filter((id) => !catalog.nodes.has(id))
          .map((id) => ({ requested: id, suggested: closestIds(id, allIds) }));

        for (const miss of missed) {
          const hint =
            miss.suggested.length > 0
              ? ` (did you mean ${miss.suggested.map((s) => `\`${s}\``).join(", ")}?)`
              : "";
          console.error(`Warning: unknown node \`${miss.requested}\`${hint}`);
        }
        if (missed.length > 0) {
          console.error("Run `ghost gather` to list every node.");
        }

        if (opts.history !== false) {
          await appendGhostEvent(paths.packageDir, {
            event: "pull",
            ids: known,
            ...(missed.length > 0 ? { missed } : {}),
          });
        }

        if (known.length === 0) {
          process.exit(2);
          return;
        }

        const nodes = known.map(
          (id) => catalog.nodes.get(id) as GhostCatalogNode,
        );

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "pull",
                ...(missed.length > 0 ? { missed } : {}),
                nodes: nodes.map((node) => ({
                  id: node.id,
                  ...(node.kind !== undefined ? { kind: node.kind } : {}),
                  ...(node.description
                    ? { description: node.description }
                    : {}),
                  ...(node.materials !== undefined
                    ? { materials: node.materials }
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
    if (node.materials !== undefined && node.materials.length > 0) {
      lines.push("", "Materials:");
      for (const material of node.materials) lines.push(`- ${material}`);
    }
    lines.push("", node.body.trim());
    sections.push(lines.join("\n"));
  }
  return `${sections.join("\n\n---\n\n")}\n`;
}
