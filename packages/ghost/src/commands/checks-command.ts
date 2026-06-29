import type { CAC } from "cac";
import {
  type GraphSlice,
  type RoutedCheck,
  resolveGraphSlice,
  selectChecksForSurfaces,
} from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { loadChecksDir } from "../scan/checks-dir.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { guardSurfaces } from "./surface-guard.js";

function parseSurfaceIds(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const ids = raw
    .flatMap((entry) => String(entry).split(","))
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return [...new Set(ids)];
}

export function registerChecksCommand(cli: CAC): void {
  cli
    .command(
      "checks",
      "Select the markdown checks (ghost.check/v1) relevant to the named surfaces.",
    )
    .option(
      "--surface <ids>",
      "Surface id(s) the change touches (comma-separated or repeated). The agent names them.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option(
      "--as <incarnation>",
      "Filter grounding to one incarnation (e.g. email, voice). Essence nodes always pass.",
    )
    .option(
      "--no-grounding",
      "Omit fingerprint grounding (the grounded nodes) and emit only the relevant checks",
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

        const cwd = process.cwd();
        const paths = resolveFingerprintPackage(opts.package, cwd);
        const loaded = await loadFingerprintPackage(paths);
        const { checks, invalid } = await loadChecksDir(paths.dir);

        // The agent names the touched surfaces (it analyzed the diff). Ghost
        // routes + grounds for those surfaces; it does not infer from paths.
        const touched = parseSurfaceIds(opts.surface);

        // A named surface absent from the graph is an error, not a silent
        // empty route — emit ERR_UNKNOWN_SURFACE with suggestions and stop.
        if (guardSurfaces(loaded.graph, touched, opts.format)) return;

        const routed = selectChecksForSurfaces(checks, loaded.graph, touched);

        const incarnation =
          typeof opts.as === "string" && opts.as.length > 0
            ? opts.as
            : undefined;

        // grounding defaults on; cac sets opts.grounding=false for --no-grounding.
        // Grounding is the gather slice: the prose nodes a finding can cite.
        const withGrounding = opts.grounding !== false;
        const grounding: GraphSlice[] = withGrounding
          ? touched.map((surface) =>
              resolveGraphSlice(loaded.graph, surface, {
                ...(incarnation !== undefined ? { incarnation } : {}),
              }),
            )
          : [];

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                touched_surfaces: touched,
                checks: routed.map((r) => ({
                  name: r.check.frontmatter.name,
                  severity: r.check.frontmatter.severity,
                  surface: r.check.frontmatter.surface ?? "core",
                  relevance: r.relevance,
                })),
                ...(withGrounding ? { grounding } : {}),
                invalid,
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            formatChecksMarkdown(touched, routed, grounding, invalid),
          );
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

const PROVENANCE_RANK = { own: 0, ancestor: 1, edge: 2 } as const;

function provenanceLabel(
  provenance: GraphSlice["nodes"][number]["provenance"],
): string {
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

function formatChecksMarkdown(
  touched: string[],
  routed: RoutedCheck[],
  grounding: GraphSlice[],
  invalid: Array<{ file: string; message: string }>,
): string {
  const lines = ["# Relevant Checks", ""];
  lines.push(
    `Touched surfaces: ${touched.length ? touched.map((s) => `\`${s}\``).join(", ") : "none (core only)"}`,
    "",
  );
  if (routed.length === 0) {
    lines.push("No checks govern the touched surfaces.");
  } else {
    for (const { check, relevance } of routed) {
      const why =
        relevance.kind === "own"
          ? `own \`${relevance.surface}\``
          : `inherited from \`${relevance.surface}\` (via \`${relevance.via}\`)`;
      lines.push(
        `- **${check.frontmatter.name}** (${check.frontmatter.severity}) — ${why}`,
      );
    }
  }

  for (const slice of grounding) {
    if (slice.nodes.length === 0) continue;
    lines.push("", `## Grounding: \`${slice.surface}\``);
    const ordered = [...slice.nodes].sort(
      (a, b) =>
        PROVENANCE_RANK[a.provenance.kind] - PROVENANCE_RANK[b.provenance.kind],
    );
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

  if (invalid.length > 0) {
    lines.push("", "## Skipped (invalid)");
    for (const { file, message } of invalid) {
      lines.push(`- \`${file}\`: ${message}`);
    }
  }
  return `${lines.join("\n")}\n`;
}
