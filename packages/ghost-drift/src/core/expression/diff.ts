import type { DesignDecision, Expression } from "@ghost/core";

export interface DecisionChange {
  dimension: string;
  decisionChanged: boolean;
  fromDecision?: string;
  toDecision?: string;
  evidenceAdded: string[];
  evidenceRemoved: string[];
}

export interface TokenChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface ColorChange {
  role: string;
  from: string;
  to: string;
}

export interface SemanticDiff {
  decisions: {
    added: DesignDecision[];
    removed: DesignDecision[];
    modified: DecisionChange[];
  };
  palette: {
    dominantAdded: Array<{ role: string; value: string }>;
    dominantRemoved: Array<{ role: string; value: string }>;
    dominantChanged: ColorChange[];
    semanticAdded: Array<{ role: string; value: string }>;
    semanticRemoved: Array<{ role: string; value: string }>;
    semanticChanged: ColorChange[];
    neutralsChanged: boolean;
  };
  tokens: TokenChange[];
  unchanged: boolean;
}

/**
 * Produce a semantic diff between two expressions — decisions added/
 * removed/modified (matched by dimension slug), palette role swaps, and
 * token-scale changes. This is *not* a vector distance calculation (see
 * compareExpressions for that) — it's the qualitative "what changed in
 * meaning" that shows up in PR reviews.
 */
export function diffExpressions(a: Expression, b: Expression): SemanticDiff {
  const decisions = diffDecisions(a.decisions ?? [], b.decisions ?? []);
  const palette = diffPalette(a, b);
  const tokens = diffTokens(a, b);

  const unchanged =
    decisions.added.length === 0 &&
    decisions.removed.length === 0 &&
    decisions.modified.length === 0 &&
    palette.dominantAdded.length === 0 &&
    palette.dominantRemoved.length === 0 &&
    palette.dominantChanged.length === 0 &&
    palette.semanticAdded.length === 0 &&
    palette.semanticRemoved.length === 0 &&
    palette.semanticChanged.length === 0 &&
    !palette.neutralsChanged &&
    tokens.length === 0;

  return { decisions, palette, tokens, unchanged };
}

function diffDecisions(
  a: DesignDecision[],
  b: DesignDecision[],
): SemanticDiff["decisions"] {
  const aMap = new Map(a.map((d) => [d.dimension, d]));
  const bMap = new Map(b.map((d) => [d.dimension, d]));

  const added: DesignDecision[] = [];
  const removed: DesignDecision[] = [];
  const modified: DecisionChange[] = [];

  for (const [dim, dec] of bMap) {
    if (!aMap.has(dim)) added.push(dec);
  }
  for (const [dim, dec] of aMap) {
    if (!bMap.has(dim)) removed.push(dec);
  }
  for (const [dim, before] of aMap) {
    const after = bMap.get(dim);
    if (!after) continue;
    const decisionChanged = before.decision.trim() !== after.decision.trim();
    const beforeEv = new Set(before.evidence ?? []);
    const afterEv = new Set(after.evidence ?? []);
    const evidenceAdded = [...afterEv].filter((e) => !beforeEv.has(e));
    const evidenceRemoved = [...beforeEv].filter((e) => !afterEv.has(e));
    if (decisionChanged || evidenceAdded.length || evidenceRemoved.length) {
      modified.push({
        dimension: dim,
        decisionChanged,
        fromDecision: decisionChanged ? before.decision : undefined,
        toDecision: decisionChanged ? after.decision : undefined,
        evidenceAdded,
        evidenceRemoved,
      });
    }
  }

  return { added, removed, modified };
}

function diffPalette(a: Expression, b: Expression): SemanticDiff["palette"] {
  const fromDominant = byRole(a.palette?.dominant ?? []);
  const toDominant = byRole(b.palette?.dominant ?? []);
  const fromSemantic = byRole(a.palette?.semantic ?? []);
  const toSemantic = byRole(b.palette?.semantic ?? []);

  const neutralsA = (a.palette?.neutrals?.steps ?? []).join(",");
  const neutralsB = (b.palette?.neutrals?.steps ?? []).join(",");

  return {
    dominantAdded: addedColors(fromDominant, toDominant),
    dominantRemoved: addedColors(toDominant, fromDominant),
    dominantChanged: changedColors(fromDominant, toDominant),
    semanticAdded: addedColors(fromSemantic, toSemantic),
    semanticRemoved: addedColors(toSemantic, fromSemantic),
    semanticChanged: changedColors(fromSemantic, toSemantic),
    neutralsChanged: neutralsA !== neutralsB,
  };
}

function byRole(list: { role: string; value: string }[]): Map<string, string> {
  return new Map(list.map((c) => [c.role, c.value]));
}

function addedColors(
  from: Map<string, string>,
  to: Map<string, string>,
): Array<{ role: string; value: string }> {
  const out: Array<{ role: string; value: string }> = [];
  for (const [role, value] of to)
    if (!from.has(role)) out.push({ role, value });
  return out;
}

function changedColors(
  from: Map<string, string>,
  to: Map<string, string>,
): ColorChange[] {
  const out: ColorChange[] = [];
  for (const [role, toValue] of to) {
    const fromValue = from.get(role);
    if (fromValue !== undefined && fromValue !== toValue) {
      out.push({ role, from: fromValue, to: toValue });
    }
  }
  return out;
}

function diffTokens(a: Expression, b: Expression): TokenChange[] {
  const out: TokenChange[] = [];
  const pairs: Array<[string, unknown, unknown]> = [
    ["spacing.scale", a.spacing?.scale, b.spacing?.scale],
    ["spacing.baseUnit", a.spacing?.baseUnit, b.spacing?.baseUnit],
    ["typography.sizeRamp", a.typography?.sizeRamp, b.typography?.sizeRamp],
    ["typography.families", a.typography?.families, b.typography?.families],
    [
      "typography.lineHeightPattern",
      a.typography?.lineHeightPattern,
      b.typography?.lineHeightPattern,
    ],
    ["surfaces.borderRadii", a.surfaces?.borderRadii, b.surfaces?.borderRadii],
    [
      "surfaces.shadowComplexity",
      a.surfaces?.shadowComplexity,
      b.surfaces?.shadowComplexity,
    ],
    ["surfaces.borderUsage", a.surfaces?.borderUsage, b.surfaces?.borderUsage],
    [
      "palette.saturationProfile",
      a.palette?.saturationProfile,
      b.palette?.saturationProfile,
    ],
    ["palette.contrast", a.palette?.contrast, b.palette?.contrast],
  ];
  for (const [field, from, to] of pairs) {
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      out.push({ field, from, to });
    }
  }
  return out;
}

/** Render a SemanticDiff as a human-readable terminal report. */
export function formatSemanticDiff(diff: SemanticDiff): string {
  if (diff.unchanged) return "No semantic changes.\n";

  const lines: string[] = [];

  const { added, removed, modified } = diff.decisions;
  if (added.length || removed.length || modified.length) {
    lines.push("Decisions:");
    for (const d of added) lines.push(`  + ${d.dimension}: ${d.decision}`);
    for (const d of removed) lines.push(`  - ${d.dimension}: ${d.decision}`);
    for (const m of modified) {
      lines.push(`  ~ ${m.dimension}`);
      if (m.decisionChanged) {
        lines.push(
          `      decision: "${truncate(m.fromDecision ?? "")}" → "${truncate(m.toDecision ?? "")}"`,
        );
      }
      if (m.evidenceAdded.length) {
        lines.push(`      + evidence: ${m.evidenceAdded.join(", ")}`);
      }
      if (m.evidenceRemoved.length) {
        lines.push(`      - evidence: ${m.evidenceRemoved.join(", ")}`);
      }
    }
    lines.push("");
  }

  const p = diff.palette;
  if (
    p.dominantAdded.length ||
    p.dominantRemoved.length ||
    p.dominantChanged.length ||
    p.semanticAdded.length ||
    p.semanticRemoved.length ||
    p.semanticChanged.length ||
    p.neutralsChanged
  ) {
    lines.push("Palette:");
    for (const c of p.dominantAdded)
      lines.push(`  + dominant ${c.role}: ${c.value}`);
    for (const c of p.dominantRemoved)
      lines.push(`  - dominant ${c.role}: ${c.value}`);
    for (const c of p.dominantChanged)
      lines.push(`  ~ dominant ${c.role}: ${c.from} → ${c.to}`);
    for (const c of p.semanticAdded)
      lines.push(`  + semantic ${c.role}: ${c.value}`);
    for (const c of p.semanticRemoved)
      lines.push(`  - semantic ${c.role}: ${c.value}`);
    for (const c of p.semanticChanged)
      lines.push(`  ~ semantic ${c.role}: ${c.from} → ${c.to}`);
    if (p.neutralsChanged) lines.push("  ~ neutrals ramp changed");
    lines.push("");
  }

  if (diff.tokens.length) {
    lines.push("Tokens:");
    for (const t of diff.tokens) {
      const from = JSON.stringify(t.from);
      const to = JSON.stringify(t.to);
      lines.push(`  ~ ${t.field}: ${from} → ${to}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function truncate(s: string, max = 60): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
