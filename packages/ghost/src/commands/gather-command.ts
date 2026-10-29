import type { CAC } from "cac";
import { type CatalogMenuEntry, UsageError } from "#ghost-core";
import type { GhostGatherResult } from "../embed/index.js";
import { gatherGhostPackage, loadGhostSnapshot } from "../embed/index.js";
import { formatLoadDiagnostics } from "../internal/load-diagnostics.js";
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
    .option("--baseline <dir>", "Use this separate baseline ghost package")
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
        const paths = resolveGhostPackage(
          opts.package,
          process.cwd(),
          opts.baseline,
        );
        const snapshot = await loadGhostSnapshot(paths);
        for (const notice of snapshot.notices ?? [])
          console.error(`${notice.severity}: ${notice.message}`);
        if (format === "markdown" && ask === undefined) {
          throw new UsageError(
            "gather needs a task. Run `ghost gather <ask>`. For package inspection, use `ghost gather --format json`.",
          );
        }
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
            `${JSON.stringify(formatGatherJson(menu, paths.baseline ? `ghost pull [<id>…] --package ${JSON.stringify(paths.packageDir)} --baseline ${JSON.stringify(paths.baseline.packageDir)}` : undefined), null, 2)}\n`,
          );
        } else {
          process.stdout.write(
            formatMenuMarkdown(menu) +
              (paths.baseline
                ? `\nContinue with --package ${JSON.stringify(paths.packageDir)} --baseline ${JSON.stringify(paths.baseline.packageDir)} on pull, validate, and review.\n`
                : ""),
          );
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

function formatGatherJson(
  menu: GhostGatherResult,
  command = "ghost pull [<id>…]",
): Record<string, unknown> {
  return {
    kind: menu.kind,
    diagnostics: menu.diagnostics,
    ...(menu.ask ? { ask: menu.ask } : {}),
    source: menu.source,
    contract: menu.contract,
    next: { command },
    coverage: menu.coverage,
    ...(menu.kinds !== undefined ? { kinds: menu.kinds } : {}),
    nodes: menu.nodes,
    ...(menu.automatic !== undefined ? { automatic: menu.automatic } : {}),
  };
}

function formatMenuMarkdown(menu: GhostGatherResult): string {
  if (!menu.ask) {
    throw new UsageError("Markdown gather output requires a task.");
  }

  const lines: string[] = [
    "# Guidance menu",
    "",
    ...(menu.diagnostics.length > 0
      ? [formatLoadDiagnostics(menu.diagnostics), ""]
      : []),
    `${
      menu.contract.completeness.complete
        ? "This is the complete, unfiltered menu."
        : "This menu is incomplete because invalid guidance was skipped."
    } For the task below, check every \`Applies when\` condition and pull every applicable ID. The entries have not been selected or ranked.`,
    "",
    "## Task",
    "",
    menu.ask,
    "",
    "## Available guidance",
    "",
    "Pull the applicable IDs together with `ghost pull <id> [<id>…]`.",
    menu.contract.selection.instruction,
    menu.contract.ifNoneApply,
    "",
  ];

  if (menu.automatic !== undefined) {
    lines.push(
      "## Automatic core",
      "",
      "Already included by every pull. Do not select these IDs.",
      "",
    );
    for (const entry of menu.automatic) {
      lines.push(`- \`${entry.id}\` (${entry.scope}/${entry.layer})`);
      if (entry.for) lines.push(`  - Applies when: ${entry.for}`);
    }
    lines.push("", "## Selectable guidance", "");
  }
  const kinds = menu.kinds ?? [];
  const groups = groupMenuByKind(menu.nodes, kinds);
  for (const group of groups) {
    lines.push(group.kind ? `### ${group.kind}` : "### Other guidance", "");
    const purpose = kinds.find((kind) => kind.name === group.kind)?.purpose;
    if (purpose) lines.push(purpose, "");
    for (const entry of group.entries) {
      lines.push(`- \`${entry.id}\``);
      if (entry.scope)
        lines.push(`  - Scope: ${entry.scope}; layer: ${entry.layer}`);
      if (entry.for?.trim()) {
        lines.push(`  - Applies when: ${entry.for.trim()}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
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

  return orderedKeys.map((kind) => ({
    kind,
    entries: groups.get(kind) ?? [],
  }));
}
