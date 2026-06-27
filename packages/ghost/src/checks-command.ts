import type { CAC } from "cac";
import {
  groundSurface,
  type RoutedCheck,
  type SurfaceGrounding,
  selectChecksForSurfaces,
} from "#ghost-core";
import { resolveFingerprintPackage } from "./fingerprint.js";
import { loadChecksDir } from "./scan/checks-dir.js";
import { loadFingerprintPackage } from "./scan/fingerprint-package.js";

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
      "--no-grounding",
      "Omit fingerprint grounding (why / what) and emit only the relevant checks",
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

        const routed = selectChecksForSurfaces(
          checks,
          loaded.surfaces,
          touched,
        );

        // grounding defaults on; cac sets opts.grounding=false for --no-grounding.
        const withGrounding = opts.grounding !== false;
        const grounding: SurfaceGrounding[] = withGrounding
          ? touched.map((surface) =>
              groundSurface(loaded.surfaces, loaded.fingerprint, surface),
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

function formatChecksMarkdown(
  touched: string[],
  routed: RoutedCheck[],
  grounding: SurfaceGrounding[],
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

  for (const surface of grounding) {
    if (surface.why.length === 0 && surface.what.length === 0) continue;
    lines.push("", `## Grounding: \`${surface.surface}\``);
    if (surface.why.length > 0) {
      lines.push("", "Why:");
      for (const item of surface.why) {
        lines.push(`- ${item.statement} (\`${item.ref}\`)`);
      }
    }
    if (surface.what.length > 0) {
      lines.push("", "What good looks like:");
      for (const item of surface.what) {
        const where = item.path ? ` — \`${item.path}\`` : "";
        lines.push(`- ${item.statement}${where} (\`${item.ref}\`)`);
      }
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
