import type { TemporalComparison } from "../types.js";

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

export function formatTemporalComparison(comp: TemporalComparison): string {
  const lines: string[] = [];

  lines.push(
    c(BOLD, `Temporal Comparison: ${comp.source.id} vs ${comp.target.id}`),
  );
  lines.push("");

  // Overall distance + trajectory
  const distPct = (comp.distance * 100).toFixed(1);
  const distColor =
    comp.distance < 0.1 ? GREEN : comp.distance < 0.3 ? YELLOW : RED;
  const trajColor =
    comp.trajectory === "converging"
      ? GREEN
      : comp.trajectory === "diverging"
        ? RED
        : comp.trajectory === "oscillating"
          ? YELLOW
          : DIM;

  lines.push(
    `Distance: ${c(distColor, `${distPct}%`)}  Trajectory: ${c(trajColor, comp.trajectory)}`,
  );
  lines.push("");

  // Ack status
  if (comp.daysSinceAck !== null) {
    const ackColor = comp.daysSinceAck > 30 ? YELLOW : DIM;
    lines.push(c(CYAN, "Acknowledgment"));
    lines.push(`  Last acked: ${c(ackColor, `${comp.daysSinceAck} days ago`)}`);
    if (comp.exceedsAckedBounds) {
      lines.push(
        `  ${c(RED, "Exceeded bounds:")} ${comp.exceedingDimensions.join(", ")}`,
      );
    } else {
      lines.push(`  ${c(GREEN, "Within acknowledged bounds")}`);
    }
    lines.push("");
  }

  // Per-dimension velocity
  lines.push(c(BOLD, "Dimensions"));
  for (const [key, delta] of Object.entries(comp.dimensions)) {
    const pct = (delta.distance * 100).toFixed(1);
    const color =
      delta.distance < 0.1 ? GREEN : delta.distance < 0.3 ? YELLOW : RED;

    const vel = comp.velocity.find((v) => v.dimension === key);
    let velStr = "";
    if (vel && vel.rate > 0) {
      const arrow =
        vel.direction === "converging"
          ? c(GREEN, "\u2193")
          : vel.direction === "diverging"
            ? c(RED, "\u2191")
            : c(DIM, "-");
      velStr = `  ${arrow} ${(vel.rate * 100).toFixed(2)}%/day`;
    }

    lines.push(
      `  ${key.padEnd(14)} ${c(color, `${pct}%`.padStart(6))}${velStr}  ${c(DIM, delta.description)}`,
    );
  }
  lines.push("");

  // Summary
  if (comp.summary) {
    lines.push(c(DIM, comp.summary));
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function formatTemporalComparisonJSON(comp: TemporalComparison): string {
  return JSON.stringify(
    {
      source: comp.source.id,
      target: comp.target.id,
      distance: comp.distance,
      trajectory: comp.trajectory,
      daysSinceAck: comp.daysSinceAck,
      exceedsAckedBounds: comp.exceedsAckedBounds,
      exceedingDimensions: comp.exceedingDimensions,
      dimensions: comp.dimensions,
      velocity: comp.velocity,
      vectors: comp.vectors,
      summary: comp.summary,
    },
    null,
    2,
  );
}
