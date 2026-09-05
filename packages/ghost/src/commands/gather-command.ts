import type { CAC } from "cac";
import type { CatalogMenuEntry } from "#ghost-core";
import type { GhostGatherResult } from "../embed/index.js";
import { gatherGhostPackage, loadGhostSnapshot } from "../embed/index.js";
import { appendGhostEvent, resolveRunId } from "../observability-events.js";
import { resolveGhostPackage } from "../package.js";
import { exitCli, failFromError } from "./errors.js";
import { parseEnumOption } from "./options.js";

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
        const format = parseEnumOption(opts.format, "--format", [
          "markdown",
          "json",
        ] as const);

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
        if (format === "json") {
          process.stdout.write(
            `${JSON.stringify(formatGatherJson(menu), null, 2)}\n`,
          );
        } else {
          process.stdout.write(formatMenuMarkdown(menu));
        }
        await exitCli(0);
      } catch (err) {
        await failFromError(err);
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
  const parts = [`${coverage.nodes} nodes`];
  if (coverage.concrete > 0) {
    parts.push(`${coverage.concrete} with concrete support`);
  } else {
    parts.push("all prose, no concrete support");
  }
  if (coverage.withoutFor > 0) {
    parts.push(`${coverage.withoutFor} lack \`for\` payloads`);
  }
  return parts.join(" · ");
}

function formatMenuMarkdown(menu: GhostGatherResult): string {
  const lines: string[] = ["# ghost package", ""];
  if (menu.ask) lines.push(`Ask: ${menu.ask}`, "");

  // Selection contract first: ghost's own instructions occupy the most
  // privileged position, ahead of any package-authored prose.
  lines.push(
    "## Selection contract",
    "",
    "Complete and unfiltered: every selectable node appears below; nothing was pre-selected.",
    menu.contract.selection.instruction,
    "",
  );
  if (!menu.ask) {
    lines.push(menu.contract.noAsk, "");
  }
  lines.push(menu.silence.ifNoneApply, "", "---", "");

  if (menu.cover.state === "resolved") {
    lines.push(
      `## Cover: \`${menu.cover.id}\``,
      "",
      menu.cover.node.body,
      "",
      "This cover is already in context and is not selectable.",
      "",
      "---",
      "",
    );
  }

  lines.push("## Available guidance", "", menuCoverageLine(menu), "");
  lines.push(
    `Evaluate all ${menu.nodes.length} selectable nodes. Numbering is for counting only. Pull by id.`,
    "",
  );

  const groups = groupMenuByKind(menu.nodes, menu.kinds ?? []);
  const kindPurpose = new Map(
    (menu.kinds ?? []).map((kind) => [kind.name, kind.purpose]),
  );
  let index = 0;
  for (const group of groups) {
    if (group.kind) {
      lines.push(`### ${group.kind}`, "");
      const purpose = kindPurpose.get(group.kind);
      if (purpose) lines.push(purpose, "");
    } else {
      lines.push(
        "### Uncategorized",
        "",
        "These nodes have no kind. Use the selection contract as written.",
        "",
      );
    }
    for (const entry of group.entries) {
      index += 1;
      lines.push(`${index}. \`${entry.id}\``);
      lines.push(
        entry.for?.trim()
          ? `   - Applies when: ${entry.for.trim()}`
          : "   - Applicability unstated: no `for` payload.",
      );
      const metadata = formatMetadata(entry);
      if (metadata.length > 0) {
        lines.push(`   - ${metadata.join("; ")}`);
      }
    }
    lines.push("");
  }

  lines.push("Next: `ghost pull <id> [<id>…]`.");
  return `${lines.join("\n")}\n`;
}

interface MenuGroup {
  kind: string | undefined;
  entries: CatalogMenuEntry[];
}

function groupMenuByKind(
  menu: readonly CatalogMenuEntry[],
  kinds: NonNullable<GhostGatherResult["kinds"]>,
): MenuGroup[] {
  const declaredOrder = kinds.map((kind) => kind.name);
  const declaredSet = new Set(declaredOrder);
  const groups = new Map<string | undefined, CatalogMenuEntry[]>();

  for (const entry of menu) {
    const key = entry.kind;
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.id.localeCompare(b.id));
  }

  const undeclaredKinds = [...groups.keys()]
    .filter((key): key is string => key !== undefined && !declaredSet.has(key))
    .sort((a, b) => a.localeCompare(b));

  const orderedKeys: (string | undefined)[] = [
    ...declaredOrder.filter((kind) => groups.has(kind)),
    ...undeclaredKinds,
    ...(groups.has(undefined) ? [undefined] : []),
  ];

  return orderedKeys.map((kind) => ({ kind, entries: groups.get(kind) ?? [] }));
}

function formatMetadata(entry: CatalogMenuEntry): string[] {
  const metadata: string[] = [];
  if (entry.materials !== undefined) {
    metadata.push(`materials: ${entry.materials}`);
  }
  const payloadTypes = formatPayloadTypes(entry);
  if (payloadTypes.length > 0) {
    metadata.push(`payloads: ${payloadTypes.join(", ")}`);
  }
  return metadata;
}

function formatPayloadTypes(entry: CatalogMenuEntry): string[] {
  const types: string[] = [];
  if (entry.hasFencedExample) types.push("substantial fenced example");
  if (entry.hasSkeleton) types.push("Skeleton");
  return types;
}
