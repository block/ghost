import type { CAC } from "cac";
import {
  type GhostCheckDocument,
  type GraphSlice,
  resolveGraphSlice,
} from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { loadChecksDir } from "../scan/checks-dir.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";
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
      "List the markdown checks (ghost.check/v1) and ground the named surfaces.",
    )
    .option(
      "--surface <ids>",
      "Surface id(s) the change touches (comma-separated or repeated). The agent names them; used to ground, not to filter checks.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
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
        // grounds those surfaces; it does not infer from paths. Every check is
        // offered — the agent judges relevance.
        const touched = parseSurfaceIds(opts.surface);

        // A named surface absent from the graph is an error, not a silent
        // empty slice — emit ERR_UNKNOWN_SURFACE with suggestions and stop.
        if (guardSurfaces(loaded.graph, touched, opts.format)) return;

        // grounding defaults on; cac sets opts.grounding=false for --no-grounding.
        // Grounding is the gather slice: the prose nodes a finding can cite.
        const withGrounding = opts.grounding !== false;
        const grounding: GraphSlice[] = withGrounding
          ? touched.map((surface) => resolveGraphSlice(loaded.graph, surface))
          : [];

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                touched_surfaces: touched,
                checks: checks.map((check) => ({
                  name: check.frontmatter.name,
                  severity: check.frontmatter.severity,
                  ...(check.frontmatter.source
                    ? { source: check.frontmatter.source }
                    : {}),
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
            formatChecksMarkdown(touched, checks, grounding, invalid),
          );
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
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
  checks: GhostCheckDocument[],
  grounding: GraphSlice[],
  invalid: Array<{ file: string; message: string }>,
): string {
  const lines = ["# Checks", ""];
  lines.push(
    `Touched surfaces: ${touched.length ? touched.map((s) => `\`${s}\``).join(", ") : "none (core only)"}`,
    "",
  );
  if (checks.length === 0) {
    lines.push("No checks defined.");
  } else {
    for (const check of checks) {
      const source = check.frontmatter.source
        ? ` — enforces \`${check.frontmatter.source}\``
        : "";
      lines.push(
        `- **${check.frontmatter.name}** (${check.frontmatter.severity})${source}`,
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
      lines.push(
        "",
        `### \`${node.id}\` — ${provenanceLabel(node.provenance)}`,
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
