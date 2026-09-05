import type { CAC } from "cac";
import { type CatalogMenuEntry, UsageError } from "#ghost-core";
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

const NO_GUIDANCE_HEADING = /^##[ \t]+If no guidance applies[ \t]*$/im;

function formatMenuMarkdown(menu: GhostGatherResult): string {
  if (!menu.ask) {
    throw new UsageError("Markdown gather output requires a task.");
  }

  const lines: string[] = [
    "# Guidance for this task",
    "",
    `Task: ${menu.ask}`,
    "",
  ];

  if (menu.cover.state === "resolved") {
    lines.push(menu.cover.node.body, "");
  }
  if (
    menu.cover.state !== "resolved" ||
    !NO_GUIDANCE_HEADING.test(menu.cover.node.body)
  ) {
    lines.push(
      "## If no guidance applies",
      "",
      menu.cover.state === "resolved"
        ? "Continue with ordinary reasoning for reversible choices unless the guidance above requires input. Ask before consequential, irreversible, or brand-defining choices."
        : "Continue with ordinary reasoning for reversible choices. Ask before consequential, irreversible, or brand-defining choices.",
      "",
    );
  }

  lines.push(
    "## Available guidance",
    "",
    "Check every item below. Pull all applicable IDs together with `ghost pull <id> [<id>…]`. Skip clear non-matches; topic overlap alone is not enough. Do not limit the number.",
    "",
  );

  const groups = groupMenuByKind(menu.nodes, menu.kinds ?? []);
  for (const group of groups) {
    lines.push(group.kind ? `### ${group.kind}` : "### Other guidance", "");
    for (const entry of group.entries) {
      lines.push(`- \`${entry.id}\``);
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

  return orderedKeys.map((kind) => ({ kind, entries: groups.get(kind) ?? [] }));
}
