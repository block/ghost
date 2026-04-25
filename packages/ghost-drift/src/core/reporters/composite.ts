import type { CompositeComparison } from "../types.js";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";

const useColor =
  process.env.NO_COLOR === undefined && process.stdout.isTTY !== false;

function c(code: string, text: string): string {
  return useColor ? `${code}${text}${RESET}` : text;
}

export function formatCompositeComparison(
  composite: CompositeComparison,
): string {
  const lines: string[] = [];

  lines.push(
    c(BOLD, `Composite Expression: ${composite.members.length} members`),
  );
  lines.push("");

  // Spread
  const spreadPct = (composite.spread * 100).toFixed(1);
  const spreadColor =
    composite.spread < 0.1 ? GREEN : composite.spread < 0.3 ? YELLOW : RED;
  lines.push(`Spread: ${c(spreadColor, `${spreadPct}%`)}`);
  lines.push("");

  // Members
  lines.push(c(BOLD, "Members"));
  for (const member of composite.members) {
    const trackedStr =
      member.distanceToTracked != null
        ? ` (${(member.distanceToTracked * 100).toFixed(1)}% from tracked)`
        : "";
    lines.push(`  ${member.id}${c(DIM, trackedStr)}`);
  }
  lines.push("");

  // Pairwise distances (sorted by distance)
  lines.push(c(BOLD, "Pairwise Distances"));
  for (const pair of composite.pairwise) {
    const pct = (pair.distance * 100).toFixed(1);
    const color =
      pair.distance < 0.1 ? GREEN : pair.distance < 0.3 ? YELLOW : RED;
    lines.push(`  ${pair.a} ${c(DIM, "<>")} ${pair.b}  ${c(color, `${pct}%`)}`);
  }
  lines.push("");

  // Clusters
  if (composite.clusters && composite.clusters.length > 1) {
    lines.push(c(CYAN, "Clusters"));
    for (let i = 0; i < composite.clusters.length; i++) {
      const cluster = composite.clusters[i];
      lines.push(
        `  ${c(BOLD, `Cluster ${i + 1}:`)} ${cluster.memberIds.join(", ")}`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function formatCompositeComparisonJSON(
  composite: CompositeComparison,
): string {
  return JSON.stringify(
    {
      memberCount: composite.members.length,
      members: composite.members.map((m) => ({
        id: m.id,
        distanceToTracked: m.distanceToTracked,
      })),
      pairwise: composite.pairwise,
      spread: composite.spread,
      clusters: composite.clusters,
    },
    null,
    2,
  );
}
