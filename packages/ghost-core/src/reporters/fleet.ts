import type { FleetComparison } from "../types.js";

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

export function formatFleetComparison(fleet: FleetComparison): string {
  const lines: string[] = [];

  lines.push(c(BOLD, `Fleet Overview: ${fleet.members.length} projects`));
  lines.push("");

  // Spread
  const spreadPct = (fleet.spread * 100).toFixed(1);
  const spreadColor =
    fleet.spread < 0.1 ? GREEN : fleet.spread < 0.3 ? YELLOW : RED;
  lines.push(`Spread: ${c(spreadColor, `${spreadPct}%`)}`);
  lines.push("");

  // Members
  lines.push(c(BOLD, "Members"));
  for (const member of fleet.members) {
    const parentStr =
      member.distanceToParent != null
        ? ` (${(member.distanceToParent * 100).toFixed(1)}% from parent)`
        : "";
    lines.push(`  ${member.id}${c(DIM, parentStr)}`);
  }
  lines.push("");

  // Pairwise distances (sorted by distance)
  lines.push(c(BOLD, "Pairwise Distances"));
  for (const pair of fleet.pairwise) {
    const pct = (pair.distance * 100).toFixed(1);
    const color =
      pair.distance < 0.1 ? GREEN : pair.distance < 0.3 ? YELLOW : RED;
    lines.push(`  ${pair.a} ${c(DIM, "<>")} ${pair.b}  ${c(color, `${pct}%`)}`);
  }
  lines.push("");

  // Clusters
  if (fleet.clusters && fleet.clusters.length > 1) {
    lines.push(c(CYAN, "Clusters"));
    for (let i = 0; i < fleet.clusters.length; i++) {
      const cluster = fleet.clusters[i];
      lines.push(
        `  ${c(BOLD, `Cluster ${i + 1}:`)} ${cluster.memberIds.join(", ")}`,
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function formatFleetComparisonJSON(fleet: FleetComparison): string {
  return JSON.stringify(
    {
      memberCount: fleet.members.length,
      members: fleet.members.map((m) => ({
        id: m.id,
        distanceToParent: m.distanceToParent,
      })),
      pairwise: fleet.pairwise,
      spread: fleet.spread,
      clusters: fleet.clusters,
    },
    null,
    2,
  );
}
