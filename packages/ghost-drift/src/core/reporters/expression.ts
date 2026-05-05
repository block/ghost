import type { Expression, ExpressionComparison } from "@ghost/core";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";

const useColor =
  process.env.NO_COLOR === undefined && process.stdout.isTTY !== false;

function c(code: string, text: string): string {
  return useColor ? `${code}${text}${RESET}` : text;
}

export function formatExpression(fp: Expression): string {
  const lines: string[] = [];

  lines.push(c(BOLD, `Expression: ${fp.id}`));
  lines.push(c(DIM, `Source: ${fp.source} | ${fp.timestamp}`));
  if (fp.sources?.length) {
    lines.push(c(DIM, `Synthesized from: ${fp.sources.join(", ")}`));
  }
  lines.push("");

  // Observation (Layer 1)
  if (fp.observation) {
    lines.push(c(BOLD, "Observation"));
    lines.push(`  ${fp.observation.summary}`);
    if (fp.observation.personality.length > 0) {
      lines.push(`  Personality:  ${fp.observation.personality.join(", ")}`);
    }
    if (fp.observation.resembles.length > 0) {
      lines.push(`  Resembles:    ${fp.observation.resembles.join(", ")}`);
    }
    lines.push("");
  }

  // Design Decisions (Layer 2)
  if (fp.decisions && fp.decisions.length > 0) {
    lines.push(c(BOLD, "Design Decisions"));
    for (const d of fp.decisions) {
      lines.push(`  ${c(YELLOW, d.dimension.padEnd(22))} ${d.decision}`);
    }
    lines.push("");
  }

  // Palette
  lines.push(c(BOLD, "Palette"));
  if (fp.palette.dominant.length > 0) {
    lines.push(
      `  Dominant:    ${fp.palette.dominant.map((co) => `${co.role} (${co.value})`).join(", ")}`,
    );
  }
  if (fp.palette.semantic.length > 0) {
    lines.push(
      `  Semantic:    ${fp.palette.semantic.map((co) => co.role).join(", ")}`,
    );
  }
  lines.push(`  Neutrals:    ${fp.palette.neutrals.count} steps`);
  lines.push(`  Saturation:  ${fp.palette.saturationProfile}`);
  lines.push(`  Contrast:    ${fp.palette.contrast}`);
  lines.push("");

  // Spacing
  lines.push(c(BOLD, "Spacing"));
  lines.push(
    `  Scale:       ${fp.spacing.scale.length > 0 ? fp.spacing.scale.join(", ") : "(none detected)"}`,
  );
  lines.push(
    `  Base Unit:   ${fp.spacing.baseUnit ? `${fp.spacing.baseUnit}px` : "(none)"}`,
  );
  lines.push(`  Regularity:  ${(fp.spacing.regularity * 100).toFixed(0)}%`);
  lines.push("");

  // Typography
  lines.push(c(BOLD, "Typography"));
  lines.push(
    `  Families:    ${fp.typography.families.length > 0 ? fp.typography.families.join(", ") : "(none detected)"}`,
  );
  lines.push(
    `  Size Ramp:   ${fp.typography.sizeRamp.length > 0 ? fp.typography.sizeRamp.join(", ") : "(none detected)"}`,
  );
  lines.push(`  Line Height: ${fp.typography.lineHeightPattern}`);
  lines.push("");

  // Surfaces
  lines.push(c(BOLD, "Surfaces"));
  lines.push(
    `  Radii:       ${fp.surfaces.borderRadii.length > 0 ? fp.surfaces.borderRadii.map((r) => `${r}px`).join(", ") : "(none)"}`,
  );
  lines.push(`  Shadows:     ${fp.surfaces.shadowComplexity}`);
  lines.push(`  Borders:     ${fp.surfaces.borderUsage}`);
  lines.push("");

  return `${lines.join("\n")}\n`;
}

export function formatComparison(comp: ExpressionComparison): string {
  const lines: string[] = [];

  lines.push(c(BOLD, `Comparison: ${comp.source.id} vs ${comp.target.id}`));
  lines.push("");

  // Overall distance
  const distPct = (comp.distance * 100).toFixed(1);
  const distColor =
    comp.distance < 0.1 ? GREEN : comp.distance < 0.3 ? YELLOW : RED;
  lines.push(`Overall Distance: ${c(distColor, `${distPct}%`)}`);
  lines.push("");

  // Per-dimension breakdown
  lines.push(c(BOLD, "Dimensions"));
  for (const [key, delta] of Object.entries(comp.dimensions)) {
    const pct = (delta.distance * 100).toFixed(1);
    const color =
      delta.distance < 0.1 ? GREEN : delta.distance < 0.3 ? YELLOW : RED;
    lines.push(
      `  ${key.padEnd(14)} ${c(color, `${pct}%`.padStart(6))}  ${c(DIM, delta.description)}`,
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

export function formatExpressionJSON(fp: Expression): string {
  return JSON.stringify(fp, null, 2);
}

export function formatComparisonJSON(comp: ExpressionComparison): string {
  // Omit full expressions from JSON comparison to keep it concise
  return JSON.stringify(
    {
      source: comp.source.id,
      target: comp.target.id,
      distance: comp.distance,
      dimensions: comp.dimensions,
      summary: comp.summary,
    },
    null,
    2,
  );
}
