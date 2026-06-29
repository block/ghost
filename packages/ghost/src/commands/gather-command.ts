import type { CAC } from "cac";
import {
  buildGraphMenu,
  GHOST_GRAPH_ROOT_ID,
  type GraphMenuEntry,
  type GraphSlice,
  type GraphSliceProvenance,
  resolveGraphSlice,
  type SearchHit,
  searchGraph,
} from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

export function registerGatherCommand(cli: CAC): void {
  cli
    .command(
      "gather [surface]",
      "Gather the composed context slice for a surface (the right context at the right time).",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option(
      "--as <incarnation>",
      "Filter to one incarnation (e.g. email, billboard, voice). Essence (untagged) nodes always pass.",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (surfaceArg: string | undefined, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const incarnation =
          typeof opts.as === "string" && opts.as.length > 0
            ? opts.as
            : undefined;

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const menu = buildGraphMenu(loaded.graph);

        // The agent names the node (it analyzed the prompt + diff). Ghost
        // does not infer the anchor from repo paths.
        const surface = surfaceArg;
        const known = new Set(menu.map((entry) => entry.id));

        // No node named: list the full menu so the agent can match against it.
        if (!surface) {
          if (opts.format === "json") {
            process.stdout.write(
              `${JSON.stringify({ kind: "menu", surfaces: menu }, null, 2)}\n`,
            );
          } else {
            process.stdout.write(formatMenuMarkdown(menu));
          }
          process.exit(0);
          return;
        }

        // An inexact query (not an exact node id): rank the closest nodes
        // rather than dumping the whole menu. This is `gather`'s search front
        // end — the same act as picking from the menu, done intelligently.
        if (!known.has(surface)) {
          const matches = searchGraph(surface, loaded.graph);
          if (opts.format === "json") {
            process.stdout.write(
              `${JSON.stringify(
                {
                  kind: "candidates",
                  code: "ERR_UNKNOWN_SURFACE",
                  query: surface,
                  candidates: matches,
                },
                null,
                2,
              )}\n`,
            );
          } else {
            process.stdout.write(formatCandidatesMarkdown(surface, matches));
          }
          process.exit(2);
          return;
        }

        const slice = resolveGraphSlice(loaded.graph, surface, {
          ...(incarnation !== undefined ? { incarnation } : {}),
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(slice, null, 2)}\n`);
        } else {
          process.stdout.write(formatSliceMarkdown(slice));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function formatMenuMarkdown(menu: GraphMenuEntry[]): string {
  const lines: string[] = [
    "# Ghost Nodes",
    "",
    "No node selected. Match the ask to one of these nodes, then run `ghost gather <node>`.",
    "",
  ];
  for (const entry of menu) {
    const parent =
      entry.parent === entry.id ? "" : ` (under \`${entry.parent}\`)`;
    lines.push(`- \`${entry.id}\`${parent}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
  }
  return `${lines.join("\n")}\n`;
}

function formatCandidatesMarkdown(query: string, matches: SearchHit[]): string {
  const lines: string[] = ["# Ghost Nodes", ""];
  if (matches.length === 0) {
    lines.push(
      `No node matches \`${query}\`. Run \`ghost gather\` to list every node.`,
    );
    return `${lines.join("\n")}\n`;
  }
  lines.push(
    `\`${query}\` is not a node id. Closest matches — run \`ghost gather <node>\`:`,
    "",
  );
  for (const hit of matches) {
    const kind = hit.surface ? "surface" : "node";
    lines.push(`- \`${hit.id}\` (${kind})`);
    if (hit.description) lines.push(`  - ${hit.description}`);
  }
  return `${lines.join("\n")}\n`;
}

function provenanceLabel(provenance: GraphSliceProvenance): string {
  switch (provenance.kind) {
    case "own":
      return "own";
    case "ancestor":
      return `from \`${provenance.from}\``;
    case "edge":
      return provenance.via
        ? `${provenance.via} \`${provenance.from}\``
        : `relates \`${provenance.from}\``;
  }
}

const PROVENANCE_RANK: Record<GraphSliceProvenance["kind"], number> = {
  own: 0,
  ancestor: 1,
  edge: 2,
};

function formatSliceMarkdown(slice: GraphSlice): string {
  const lines: string[] = [`# Ghost Context: \`${slice.surface}\``];
  const chain =
    slice.surface === GHOST_GRAPH_ROOT_ID
      ? slice.surface
      : [slice.surface, ...slice.ancestors].join(" → ");
  lines.push("", `Cascade: ${chain}`);
  if (slice.incarnation) lines.push(`As: ${slice.incarnation}`);

  // Provenance-ordered: own first, then ancestors, then edges.
  const ordered = [...slice.nodes].sort(
    (a, b) =>
      PROVENANCE_RANK[a.provenance.kind] - PROVENANCE_RANK[b.provenance.kind],
  );

  lines.push("", "## Nodes");
  if (ordered.length === 0) {
    lines.push("- none");
  } else {
    for (const node of ordered) {
      const tag = node.incarnation ? ` _(as ${node.incarnation})_` : "";
      lines.push(
        "",
        `### \`${node.id}\` — ${provenanceLabel(node.provenance)}${tag}`,
        "",
        node.body,
      );
    }
  }

  // Spokes: pointers the agent may pull on demand (descendants + edge hubs).
  if (slice.spokes.length > 0) {
    lines.push(
      "",
      "## Available to pull",
      "",
      "Pointers to nearby context — run `ghost gather <id>` to expand.",
      "",
    );
    for (const spoke of slice.spokes) {
      const via = spoke.kind === "edge-hub" ? ` _(via \`${spoke.hub}\`)_` : "";
      lines.push(`- \`${spoke.id}\`${via}`);
      if (spoke.description) lines.push(`  - ${spoke.description}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
