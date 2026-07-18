import type { CAC } from "cac";
import type { TransportedMaterial } from "#ghost-core";
import type { GhostPulledNode, GhostPullResult } from "../embed/index.js";
import { loadGhostSnapshot, pullGhostNodes } from "../embed/index.js";
import { appendGhostEvent, resolveRunId } from "../observability-events.js";
import { resolveGhostPackage } from "../package.js";
import { GHOST_EVENTS_FILENAME } from "../scan/constants.js";
import { resolveGitRoot } from "../scan/package-paths.js";
import { failFromError } from "./errors.js";

export function registerPullCommand(cli: CAC): void {
  cli
    .command(
      "pull <...ids>",
      "Emit the named nodes' full prose bodies, and append the pull to the events tape.",
    )
    .option(
      "--package <dir>",
      "Use this ghost package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option(
      "--no-materials",
      "Emit material locators only; do not inline files",
    )
    .option("--order <mode>", "Output order: steering or given", {
      default: "steering",
    })
    .option("--no-events", `Skip appending to .ghost/${GHOST_EVENTS_FILENAME}`)
    .option(
      "--run <id>",
      "Attribute the tape event to this run id (default: GHOST_RUN_ID)",
    )
    .action(async (ids: string[], opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }
        if (opts.order !== "steering" && opts.order !== "given") {
          console.error("Error: --order must be 'steering' or 'given'");
          process.exit(2);
          return;
        }

        const paths = resolveGhostPackage(opts.package, process.cwd());
        const snapshot = await loadGhostSnapshot(paths);
        const repoRoot = await resolveGitRoot(process.cwd());
        const result = await pullGhostNodes(snapshot, {
          ids,
          repoRoot,
          inlineMaterials: opts.materials !== false,
          order: opts.order,
        });

        for (const miss of result.missed) {
          const hint =
            miss.suggested.length > 0
              ? ` (did you mean ${miss.suggested.map((s) => `\`${s}\``).join(", ")}?)`
              : "";
          console.error(`Warning: unknown node \`${miss.requested}\`${hint}`);
        }
        if (result.missed.length > 0) {
          console.error("Run `ghost gather` to list every node.");
        }

        if (opts.events !== false) {
          const runId = resolveRunId(opts.run);
          await appendGhostEvent(paths.packageDir, {
            event: "pull",
            ...(runId ? { run: runId } : {}),
            ids: [...result.ids],
            inlinedMaterials: result.materialCounts.inlined,
            omittedMaterials: result.materialCounts.omitted,
            ...(result.missed.length > 0 ? { missed: [...result.missed] } : {}),
          });
        }

        if (result.ids.length === 0) {
          process.exit(2);
          return;
        }

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(formatPullJson(result, opts.materials !== false), null, 2)}\n`,
          );
        } else {
          process.stdout.write(formatPullMarkdown(result));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function formatPullJson(
  result: GhostPullResult,
  inlineMaterials: boolean,
): Record<string, unknown> {
  return {
    kind: "pull",
    ...(result.missed.length > 0 ? { missed: result.missed } : {}),
    nodes: result.nodes.map((node) => ({
      id: node.id,
      ...(node.kind !== undefined ? { kind: node.kind } : {}),
      ...(node.description ? { description: node.description } : {}),
      ...(node.declaredMaterials !== undefined
        ? {
            materials: inlineMaterials
              ? (node.materials ?? []).map(formatJsonMaterial)
              : node.declaredMaterials,
          }
        : {}),
      body: node.body,
    })),
    skeletons: result.skeletons,
  };
}

function formatPullMarkdown(result: GhostPullResult): string {
  const sections: string[] = [];
  for (const node of result.nodes) {
    const kind = node.kind ? ` _(${node.kind})_` : "";
    const lines = [`# \`${node.id}\`${kind}`];
    if (node.description) lines.push("", `> ${node.description}`);
    lines.push("", node.body.trim());
    if (node.materials !== undefined && node.materials.length > 0) {
      lines.push("", "Materials:");
      for (const material of node.materials) {
        appendMaterialMarkdown(lines, material);
      }
    }
    sections.push(lines.join("\n"));
  }

  if (result.skeletons.length > 0) {
    const lines = [
      "# Skeletons — begin the artifact from this structure",
      "",
      "Begin the artifact from the matching structure below verbatim, then fill it.",
    ];
    for (const skeleton of result.skeletons) {
      lines.push("", `## From \`${skeleton.nodeId}\``, "");
      lines.push(fencedMarkdown(skeleton.content.trimEnd(), skeleton.info));
    }
    sections.push(lines.join("\n"));
  }

  return `${sections.join("\n\n---\n\n")}\n`;
}

function appendMaterialMarkdown(
  lines: string[],
  material: NonNullable<GhostPulledNode["materials"]>[number],
): void {
  if (material.inlined !== undefined) {
    const info = material.path ?? material.locator;
    lines.push("", fencedMarkdown(material.inlined.trimEnd(), info));
  } else if (material.reason === "binary inspect-pointer") {
    lines.push(
      `- inspect: ${material.path ?? material.locator} — view this image before generating`,
    );
  } else {
    const reason = material.omitted
      ? ` — ${material.reason ?? "not inlined"}`
      : "";
    lines.push(`- ${material.locator}${reason}`);
  }
}

function formatJsonMaterial(material: TransportedMaterial): {
  locator: string;
  tier: TransportedMaterial["tier"];
  inlined?: string;
  omitted?: true;
  reason?: string;
  inspect?: string;
} {
  return {
    locator: material.locator,
    tier: material.tier,
    ...(material.inlined !== undefined ? { inlined: material.inlined } : {}),
    ...(material.omitted
      ? { omitted: true as const, reason: material.reason ?? "not inlined" }
      : {}),
    ...(material.reason === "binary inspect-pointer"
      ? { inspect: material.path ?? material.locator }
      : {}),
  };
}

function fencedMarkdown(content: string, info?: string): string {
  const fence = "`".repeat(Math.max(3, longestBacktickRun(content) + 1));
  return `${fence}${info ?? ""}\n${content}\n${fence}`;
}

function longestBacktickRun(content: string): number {
  let longest = 0;
  for (const match of content.matchAll(/`+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  return longest;
}
