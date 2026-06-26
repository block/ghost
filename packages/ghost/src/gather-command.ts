import type { CAC } from "cac";
import {
  buildSurfaceMenu,
  type ResolvedSlice,
  resolveSurfaceSlice,
  type SliceProvenance,
  type SurfaceMenuEntry,
} from "#ghost-core";
import { resolveFingerprintPackage } from "./fingerprint.js";
import { loadFingerprintPackage } from "./scan/fingerprint-package.js";

const GHOST_SURFACE_ROOT_ID = "core";

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
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (surface: string | undefined, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const menu = buildSurfaceMenu(loaded.surfaces);

        // No surface named, or an unknown one: return the menu, never the tree.
        const known = new Set(menu.map((entry) => entry.id));
        if (!surface || !known.has(surface)) {
          if (opts.format === "json") {
            process.stdout.write(
              `${JSON.stringify({ kind: "menu", surfaces: menu }, null, 2)}\n`,
            );
          } else {
            process.stdout.write(formatMenuMarkdown(menu, surface));
          }
          // Unknown surface is an error (2); no surface at all is a valid menu
          // request (0).
          process.exit(surface && !known.has(surface) ? 2 : 0);
          return;
        }

        const slice = resolveSurfaceSlice(
          loaded.surfaces,
          loaded.fingerprint,
          surface,
        );

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(slice, null, 2)}\n`);
        } else {
          process.stdout.write(formatSliceMarkdown(slice));
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });
}

function formatMenuMarkdown(
  menu: SurfaceMenuEntry[],
  unknown: string | undefined,
): string {
  const lines: string[] = ["# Ghost Surfaces"];
  if (unknown) {
    lines.push(
      "",
      `Surface \`${unknown}\` is not declared. Pick one of the surfaces below.`,
    );
  } else {
    lines.push(
      "",
      "No surface selected. Match the ask to one of these surfaces, then run `ghost gather <surface>`.",
    );
  }
  lines.push("");
  for (const entry of menu) {
    const parent =
      entry.parent === entry.id ? "" : ` (under \`${entry.parent}\`)`;
    lines.push(`- \`${entry.id}\`${parent}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
    for (const edge of entry.edges) {
      lines.push(`  - ${edge.kind} → \`${edge.to}\``);
    }
  }
  return `${lines.join("\n")}\n`;
}

function provenanceLabel(provenance: SliceProvenance): string {
  switch (provenance.kind) {
    case "own":
      return "own";
    case "ancestor":
      return `from \`${provenance.surface}\``;
    case "edge":
      return `${provenance.edge} \`${provenance.surface}\``;
  }
}

function formatSliceMarkdown(slice: ResolvedSlice): string {
  const lines: string[] = [`# Ghost Context: \`${slice.surface}\``];
  const chain =
    slice.surface === GHOST_SURFACE_ROOT_ID
      ? slice.surface
      : [slice.surface, ...slice.ancestors].join(" → ");
  lines.push("", `Cascade: ${chain}`);

  section(lines, "Situations", slice.situations, (entry) => {
    const node = entry.node;
    return `\`${node.id}\` — ${node.title ?? node.user_intent ?? node.id} (${provenanceLabel(entry.provenance)})`;
  });
  section(lines, "Principles", slice.principles, (entry) => {
    return `\`${entry.node.id}\` — ${entry.node.principle} (${provenanceLabel(entry.provenance)})`;
  });
  section(
    lines,
    "Experience contracts",
    slice.experience_contracts,
    (entry) => {
      return `\`${entry.node.id}\` — ${entry.node.contract} (${provenanceLabel(entry.provenance)})`;
    },
  );
  section(lines, "Patterns", slice.patterns, (entry) => {
    return `\`${entry.node.id}\` (${entry.node.kind}) — ${entry.node.pattern} (${provenanceLabel(entry.provenance)})`;
  });

  return `${lines.join("\n")}\n`;
}

function section<T>(
  lines: string[],
  title: string,
  entries: T[],
  render: (entry: T) => string,
): void {
  lines.push("", `## ${title}`);
  if (entries.length === 0) {
    lines.push("- none");
    return;
  }
  for (const entry of entries) lines.push(`- ${render(entry)}`);
}
