import type { CAC } from "cac";
import type { CatalogMenuEntry } from "#ghost-core";
import type { GhostGatherResult } from "../embed/index.js";
import { gatherGhostPackage, loadGhostSnapshot } from "../embed/index.js";
import { appendGhostEvent, resolveRunId } from "../observability-events.js";
import { resolveGhostPackage } from "../package.js";
import { failFromError } from "./errors.js";

export function registerGatherCommand(cli: CAC): void {
  cli
    .command(
      "gather [...ask]",
      "Emit the complete available guidance menu so the agent can pull applicable nodes.",
    )
    .option(
      "--package <dir>",
      "Use this ghost package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option(
      "--run <id>",
      "Attribute the tape event to this run id (default: GHOST_RUN_ID)",
    )
    .action(async (askParts: string[] | undefined, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const ask = normalizeAskParts(askParts);
        const paths = resolveGhostPackage(opts.package, process.cwd());
        const snapshot = await loadGhostSnapshot(paths);
        const menu = gatherGhostPackage(snapshot, { ask });
        const runId = resolveRunId(opts.run);
        await appendGhostEvent(paths.packageDir, {
          event: "gather",
          ...(runId ? { run: runId } : {}),
          ...(menu.ask ? { ask: menu.ask } : {}),
          menu: menu.nodes.map((entry) => entry.id),
        });

        // ghost does no selection. It emits the complete catalog; the agent
        // reads the ask against it and pulls the nodes whose described
        // conditions apply.
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(formatGatherJson(menu), null, 2)}\n`,
          );
        } else {
          process.stdout.write(formatMenuMarkdown(menu));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function normalizeAskParts(askParts: string[] | undefined): string | undefined {
  const ask = (askParts ?? []).join(" ").trim();
  return ask.length > 0 ? ask : undefined;
}

function formatGatherJson(menu: GhostGatherResult): Record<string, unknown> {
  return {
    kind: menu.kind,
    ...(menu.ask ? { ask: menu.ask } : {}),
    source: menu.source,
    contract: menu.contract,
    ...(menu.cover.state === "resolved"
      ? {
          cover: {
            id: menu.cover.id,
            body: menu.cover.node.body,
            inContext: true,
            selectable: false,
          },
        }
      : {}),
    next: { command: "ghost pull <id> [<id>…]" },
    silence: menu.silence,
    coverage: menu.coverage,
    ...(menu.kinds !== undefined ? { kinds: menu.kinds } : {}),
    nodes: menu.nodes,
  };
}

function menuCoverageLine(menu: GhostGatherResult): string {
  const coverage = menu.coverage;
  const payloadParts = [
    `${coverage.payloads.materials} with materials`,
    `${coverage.payloads.fencedExamples} with substantial fenced examples`,
    `${coverage.payloads.skeletons} with Skeletons`,
  ];
  const parts = [
    `${coverage.nodes} nodes`,
    `${coverage.concrete} carry payloads (${payloadParts.join(", ")})`,
  ];
  if (coverage.undescribed > 0) {
    parts.push(`${coverage.undescribed} lack descriptions`);
  }
  return parts.join(" · ");
}

function formatMenuMarkdown(menu: GhostGatherResult): string {
  const lines: string[] = ["# ghost package", ""];
  if (menu.ask) lines.push(`Ask: ${menu.ask}`, "");
  if (menu.cover.state === "resolved") {
    lines.push(
      `## Cover in context: \`${menu.cover.id}\``,
      "",
      menu.cover.node.body,
      "",
      "Cover status: already in context; outside selection; do not pull again.",
      "",
      "---",
      "",
    );
  }
  lines.push("## Available guidance", "", menuCoverageLine(menu), "");
  if (menu.ask) {
    lines.push(
      "Complete, unfiltered, unranked list from the ghost package. ghost has not selected nodes for this ask.",
      "Pull every node whose description indicates its stated situation applies and whose guidance, material, structure, or refusal governs the work. Skip inapplicable nodes. Topic overlap alone is not applicability. Do not add nodes for completeness or omit applicable nodes to meet a count.",
      "Next: `ghost pull <id> [<id>…]`.",
      "If nothing applies, name the package's silence, follow the cover silence posture, and do not invent ghost-backed guidance.",
      "",
    );
  } else {
    lines.push(
      "Complete, unfiltered, unranked list from the ghost package. Bare gather is catalog inspection; ghost has not grounded a task or selected nodes.",
      "When grounding an ask, pull every applicable node with `ghost pull <id> [<id>…]`. Skip inapplicable nodes and do not invent ghost-backed guidance when the ghost package is silent.",
      "",
    );
  }
  if (menu.kinds !== undefined && menu.kinds.length > 0) {
    lines.push("Kinds:", "");
    for (const kind of menu.kinds) {
      lines.push(`- **${kind.name}** — ${kind.purpose}`);
    }
    lines.push("");
  }
  for (const entry of menu.nodes) {
    const kind = entry.kind ? ` _(${entry.kind})_` : "";
    lines.push(`- \`${entry.id}\`${kind}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
    if (entry.materials !== undefined) {
      lines.push(`  - materials: ${entry.materials}`);
    }
    const payloadTypes = formatPayloadTypes(entry);
    if (payloadTypes.length > 0) {
      lines.push(`  - payloads: ${payloadTypes.join(", ")}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function formatPayloadTypes(entry: CatalogMenuEntry): string[] {
  const types: string[] = [];
  if (entry.materials !== undefined) types.push("materials");
  if (entry.hasFencedExample) types.push("substantial fenced example");
  if (entry.hasSkeleton) types.push("Skeleton");
  return types;
}
