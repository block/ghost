import type { CAC } from "cac";
import { buildCatalogMenu } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import {
  type GhostObservabilityEvent,
  type PullMiss,
  readGhostEvents,
} from "../observability-events.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

export function registerPulseCommand(cli: CAC): void {
  cli
    .command("pulse", "Summarize local gather/pull events from .ghost/.events.")
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
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

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const menu = buildCatalogMenu(loaded.catalog);
        const events = await readGhostEvents(paths.packageDir);
        const report = buildPulseReport(
          events,
          menu.map((entry) => entry.id),
        );

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
        } else {
          process.stdout.write(formatPulseMarkdown(report));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

type NodeHitReport = {
  id: string;
  appearances: number;
  pulls: number;
  hitRate: number;
};

type MissReport = {
  requested: string;
  count: number;
  suggested: string[];
};

type PulseReport = {
  kind: "pulse";
  events: number;
  gathers: number;
  pulls: number;
  abandonedGathers: number;
  pullsPerGather: number;
  nodes: NodeHitReport[];
  coldNodes: string[];
  misses: MissReport[];
};

function buildPulseReport(
  events: GhostObservabilityEvent[],
  currentMenuIds: string[],
): PulseReport {
  const exposureCounts = new Map<string, number>();
  const pullCounts = new Map<string, number>();
  const missCounts = new Map<
    string,
    { count: number; suggested: Set<string> }
  >();

  let gathers = 0;
  let pulls = 0;
  let abandonedGathers = 0;
  let activeGatherHasPull = false;
  let sawGather = false;

  for (const event of events) {
    if (event.event === "gather") {
      if (sawGather && !activeGatherHasPull) abandonedGathers += 1;
      sawGather = true;
      activeGatherHasPull = false;
      gathers += 1;
      for (const id of event.menu) {
        exposureCounts.set(id, (exposureCounts.get(id) ?? 0) + 1);
      }
      continue;
    }

    pulls += 1;
    if (sawGather) activeGatherHasPull = true;
    for (const id of event.ids) {
      pullCounts.set(id, (pullCounts.get(id) ?? 0) + 1);
    }
    for (const miss of event.missed ?? []) {
      recordMiss(missCounts, miss);
    }
  }

  if (sawGather && !activeGatherHasPull) abandonedGathers += 1;

  const nodeIds = new Set([...currentMenuIds, ...exposureCounts.keys()]);
  const nodes = [...nodeIds]
    .map((id) => {
      const appearances = exposureCounts.get(id) ?? 0;
      const nodePulls = pullCounts.get(id) ?? 0;
      return {
        id,
        appearances,
        pulls: nodePulls,
        hitRate: appearances > 0 ? nodePulls / appearances : 0,
      };
    })
    .sort((a, b) => {
      if (b.appearances !== a.appearances) return b.appearances - a.appearances;
      if (b.pulls !== a.pulls) return b.pulls - a.pulls;
      return a.id.localeCompare(b.id);
    });

  return {
    kind: "pulse",
    events: events.length,
    gathers,
    pulls,
    abandonedGathers,
    pullsPerGather: gathers > 0 ? pulls / gathers : 0,
    nodes,
    coldNodes: nodes
      .filter((node) => node.appearances > 0 && node.pulls === 0)
      .map((node) => node.id),
    misses: [...missCounts.entries()]
      .map(([requested, value]) => ({
        requested,
        count: value.count,
        suggested: [...value.suggested].sort(),
      }))
      .sort(
        (a, b) => b.count - a.count || a.requested.localeCompare(b.requested),
      ),
  };
}

function recordMiss(
  missCounts: Map<string, { count: number; suggested: Set<string> }>,
  miss: PullMiss,
): void {
  const existing = missCounts.get(miss.requested) ?? {
    count: 0,
    suggested: new Set<string>(),
  };
  existing.count += 1;
  for (const suggestion of miss.suggested) existing.suggested.add(suggestion);
  missCounts.set(miss.requested, existing);
}

function formatPulseMarkdown(report: PulseReport): string {
  const lines: string[] = [
    "# Ghost Pulse",
    "",
    `- Events: ${report.events}`,
    `- Gathers: ${report.gathers}`,
    `- Pulls: ${report.pulls}`,
    `- Pulls per gather: ${formatRatio(report.pullsPerGather)}`,
    `- Abandoned gathers: ${report.abandonedGathers}`,
    "",
    "## Node hit rates",
    "",
  ];

  if (report.nodes.length === 0) {
    lines.push("No nodes found.");
  } else {
    lines.push(
      "| Node | Seen on menus | Pulled | Hit rate |",
      "|---|---:|---:|---:|",
    );
    for (const node of report.nodes) {
      lines.push(
        `| \`${node.id}\` | ${node.appearances} | ${node.pulls} | ${formatPercent(node.hitRate)} |`,
      );
    }
  }

  lines.push("", "## Cold nodes", "");
  if (report.coldNodes.length === 0) {
    lines.push("None.");
  } else {
    for (const id of report.coldNodes) lines.push(`- \`${id}\``);
  }

  lines.push("", "## Misses", "");
  if (report.misses.length === 0) {
    lines.push("None.");
  } else {
    for (const miss of report.misses) {
      const suggestions =
        miss.suggested.length > 0
          ? ` — suggested: ${miss.suggested.map((s) => `\`${s}\``).join(", ")}`
          : "";
      lines.push(`- \`${miss.requested}\` × ${miss.count}${suggestions}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatRatio(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
