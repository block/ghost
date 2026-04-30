import type { DriftSeverity, Expression, Rule } from "@ghost/core";
import {
  computeRuleSeverity,
  resolveMatchShape,
  resolveTolerance,
  tierForCanonical,
} from "@ghost/core";

export interface EmitReviewInput {
  expression: Expression;
}

/**
 * Emit a project-fitted drift-review slash command from an expression.
 *
 * Produces a single Markdown file styled after Rams' `/rams` slash command
 * — role prompt, per-dimension rule tables, output template, guidelines —
 * populated with this expression's actual palette, radii, spacing, and
 * typography values. Default output path: `.claude/commands/design-review.md`.
 *
 * Scope is drift-only: off-palette hex, off-ramp spacing, non-canonical
 * radii and weights. Universal accessibility rules are out of scope —
 * those belong in Rams or a sibling a11y skill.
 *
 * Two emission paths:
 *   - **Rules-driven** (preferred, v0+): when `expression.rules[]` is
 *     non-empty, group rules by computed perceptual severity and render
 *     a Critical / Serious / Nit layout. Severity is computed from the
 *     perceptual prior in `@ghost/core` plus per-rule overrides and
 *     presence-floor escalation against bucket-proxy counts.
 *   - **Structured-fallback** (legacy): when no rules[] are present,
 *     emit the original palette/radius/spacing/typography sections
 *     derived from frontmatter alone. Preserved verbatim so existing
 *     expressions keep working through the v0 transition.
 *
 * Pure: deterministic over the same expression. The expression is
 * expected to be the unioned result of `loadExpression` — body prose
 * (Character summary, per-decision rationale) is already folded into
 * `observation.summary` and `decisions[].decision`.
 */
export function emitReviewCommand(input: EmitReviewInput): string {
  const { expression: fp } = input;

  if (fp.rules && fp.rules.length > 0) {
    return emitRulesDriven(fp);
  }

  return emitStructuredFallback(fp);
}

// --- Rules-driven path (v0+) -------------------------------------------

/**
 * Render a rules[]-driven slash command. Groups rules by computed
 * severity, renders one block per rule with rationale + pattern + match
 * shape, then closes with a calibration footer that explains *why*
 * severities landed where they did. The calibration footer is what makes
 * Ghost's reviewer legibly different from a generic linter — the prior
 * is visible, not opaque.
 */
function emitRulesDriven(fp: Expression): string {
  const id = fp.id;
  const personality = (fp.observation?.personality ?? []).join(", ");
  const cousins = (fp.observation?.resembles ?? []).join(", ");
  const character = fp.observation?.summary?.trim() ?? "";

  const resolved = (fp.rules ?? []).map((rule) => ({
    rule,
    severity: computeRuleSeverity(rule, bucketCountProxy(rule, fp)),
    match: resolveMatchShape(rule),
    tolerance: resolveTolerance(rule),
  }));

  const grouped: Record<DriftSeverity, typeof resolved> = {
    critical: [],
    serious: [],
    nit: [],
  };
  for (const r of resolved) grouped[r.severity].push(r);

  const sections: string[] = [];
  if (grouped.critical.length) {
    sections.push(renderSeverityBlock("Critical", grouped.critical));
  }
  if (grouped.serious.length) {
    sections.push(renderSeverityBlock("Serious", grouped.serious));
  }
  if (grouped.nit.length) {
    sections.push(renderSeverityBlock("Nit", grouped.nit));
  }

  const parts = [
    frontmatter(id),
    header(id, personality, cousins, character),
    modeSection(),
    ...sections,
    outputTemplate(id),
    guidelines(),
    calibrationFooter(fp, resolved),
  ];
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

interface ResolvedRule {
  rule: Rule;
  severity: DriftSeverity;
  match: string;
  tolerance: number | undefined;
}

function renderSeverityBlock(label: string, items: ResolvedRule[]): string {
  const lines: string[] = [`## ${label} (${items.length})`];
  for (const item of items) {
    lines.push("", renderRule(item));
  }
  return lines.join("\n");
}

function renderRule(item: ResolvedRule): string {
  const { rule, match, tolerance } = item;
  const heading = rule.canonical
    ? `### \`${rule.id}\` — ${rule.canonical}`
    : `### \`${rule.id}\``;
  const lines: string[] = [heading];
  if (rule.summary) lines.push("", rule.summary);
  if (rule.rationale) lines.push("", `> ${rule.rationale}`);
  lines.push("", `**Pattern:** \`${rule.pattern}\``);

  const matchLine =
    tolerance !== undefined
      ? `**Match:** \`${match}\` (tolerance: \`${tolerance}\`)`
      : `**Match:** \`${match}\``;
  lines.push(matchLine);

  if (rule.enforce_at?.length) {
    const where = rule.enforce_at.map((e) => `\`${e}\``).join(", ");
    lines.push(`**Enforce at:** ${where}`);
  }
  if (rule.based_on?.length) {
    const cite =
      rule.based_on.length <= 4
        ? rule.based_on.map((id) => `\`${id}\``).join(", ")
        : `${rule.based_on
            .slice(0, 4)
            .map((id) => `\`${id}\``)
            .join(", ")}, … (${rule.based_on.length - 4} more)`;
    lines.push(`**Based on:** ${cite}`);
  }
  if (typeof rule.support === "number") {
    lines.push(`**Support:** ${(rule.support * 100).toFixed(0)}%`);
  }
  return lines.join("\n");
}

function calibrationFooter(fp: Expression, resolved: ResolvedRule[]): string {
  const tierCounts = { loud: 0, structural: 0, rhythmic: 0 };
  const escalated: string[] = [];

  for (const r of resolved) {
    const baseTier = tierForCanonical(r.rule.canonical);
    tierCounts[baseTier]++;
    const finalTierFromSeverity =
      r.severity === "critical"
        ? "loud"
        : r.severity === "serious"
          ? "structural"
          : "rhythmic";
    if (
      finalTierFromSeverity !== baseTier &&
      r.rule.severity === undefined // not a manual override
    ) {
      escalated.push(`\`${r.rule.id}\``);
    }
  }

  const lines: string[] = [
    "## How this reviewer was calibrated",
    "",
    `Severity grouping reflects perceptual weight, not arithmetic. \`${fp.id}\` has ${tierCounts.loud} loud-tier, ${tierCounts.structural} structural-tier, and ${tierCounts.rhythmic} rhythmic-tier rules under the canonical perceptual prior.`,
  ];
  if (escalated.length) {
    lines.push(
      "",
      `**Presence-floor escalation triggered for:** ${escalated.join(", ")}. These dimensions are silent (or near-silent) in the bucket — adding to them crosses a presence boundary, which is the loudest possible change.`,
    );
  }
  lines.push(
    "",
    "Color and font-family rules are loud (critical) by default. Shape, elevation, surface, and interactive-pattern rules are structural (serious). Spacing, density, motion-detail, and theming rules are rhythmic (nit).",
    "",
    `Generated from \`expression.md\` (${(fp.rules ?? []).length} rules). Re-run \`ghost-expression emit review-command\` after expression updates.`,
  );
  return lines.join("\n");
}

/**
 * Coarse proxy for bucket-count per canonical dimension, derived from the
 * structured frontmatter fields. v0 expressions don't carry the bucket
 * directly; this proxy lets presence-floor escalation work against the
 * derived counts. v1 will replace this with the actual bucket count once
 * `loadExpression` returns the bucket alongside the expression.
 */
function bucketCountProxy(rule: Rule, fp: Expression): number {
  switch (rule.canonical) {
    case "color-strategy":
      return (
        fp.palette.dominant.length +
        fp.palette.neutrals.count +
        fp.palette.semantic.length
      );
    case "surface-hierarchy":
      return fp.palette.semantic.length + fp.palette.dominant.length;
    case "shape-language":
      return fp.surfaces.borderRadii.length;
    case "elevation":
      return fp.surfaces.shadowComplexity === "deliberate-none"
        ? 0
        : fp.surfaces.shadowComplexity === "subtle"
          ? 2
          : 5;
    case "spatial-system":
    case "density":
      return fp.spacing.scale.length;
    case "typography-voice":
      return fp.typography.sizeRamp.length;
    case "font-sourcing":
      return fp.typography.families.length;
    case "motion":
      // Motion isn't in structured fields; default to a count above
      // typical floors so escalation only happens via explicit author
      // hint (rule.presence_floor: 2+).
      return 100;
    default:
      // Unknown canonical → leave room above floor 0 so escalation
      // doesn't fire incorrectly, but author can override via floor.
      return 100;
  }
}

// --- Structured-fallback path (legacy) ---------------------------------

function emitStructuredFallback(fp: Expression): string {
  const id = fp.id;
  const personality = (fp.observation?.personality ?? []).join(", ");
  const cousins = (fp.observation?.resembles ?? []).join(", ");
  const character = fp.observation?.summary?.trim() ?? "";

  const parts = [
    frontmatter(id),
    header(id, personality, cousins, character),
    modeSection(),
    paletteSection(fp),
    radiusSection(fp),
    spacingSection(fp),
    typographySection(fp),
    otherDimensions(fp),
    outputTemplate(id),
    guidelines(),
    footer(fp),
  ];
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

function frontmatter(id: string): string {
  return `---
description: Drift review for ${id} — fitted to this expression's design language
---`;
}

function header(
  id: string,
  personality: string,
  cousins: string,
  character: string,
): string {
  const taste = personality
    ? `This system reads as *${personality}*${cousins ? ` — closest cousins: ${cousins}` : ""}.`
    : "";
  const lines = [`# ${id} drift review`, ""];
  lines.push(
    `You are a drift reviewer for the **${id}** design language. ${taste}`.trim(),
  );
  if (character) lines.push("", character);
  lines.push(
    "",
    "Your job: check code for **drift** from the values below — hardcoded hexes, off-ramp spacing, typography outside the scale, radii outside the set. You are **not** checking accessibility or universal design rules; use `/rams` or a dedicated a11y skill for that.",
  );
  return lines.join("\n");
}

function modeSection(): string {
  return `## Mode

If \`$ARGUMENTS\` is provided, analyze that specific file.
If \`$ARGUMENTS\` is empty, ask the user which file(s) to review, or offer to scan recently changed components.`;
}

// --- Palette ------------------------------------------------------------

const TRUE_SEMANTIC_ROLES = new Set([
  "danger",
  "success",
  "info",
  "warning",
  "error",
]);

function paletteSection(fp: Expression): string {
  const allowed = allowedPalette(fp);
  const allowedList = allowed.map((h) => `\`${h}\``).join(", ");
  const dominant = fp.palette.dominant
    .map((c) => `\`${c.value}\` (${c.role})`)
    .join(", ");
  const neutrals = fp.palette.neutrals.steps.map((h) => `\`${h}\``).join(", ");
  const semantic = fp.palette.semantic.filter((c) =>
    TRUE_SEMANTIC_ROLES.has(c.role),
  );
  const rationale = findRationale(fp, ["color-strategy", "palette", "color"]);

  const lines: string[] = [];
  lines.push("## 1. Palette drift");
  if (rationale) lines.push("", `> ${rationale}`);
  lines.push(
    "",
    `**Allowed colors** (${allowed.length} total — prefer semantic tokens over raw hex):`,
    "",
    `- Dominant: ${dominant}`,
    `- Neutrals (ramp): ${neutrals}`,
  );
  if (semantic.length) {
    const sem = semantic.map((c) => `\`${c.value}\` (${c.role})`).join(", ");
    lines.push(`- Semantic hues: ${sem}`);
  }
  lines.push(
    "",
    "### Critical",
    "",
    "| Check | Allowed | What to look for |",
    "|-------|---------|------------------|",
    `| Off-palette hex in JSX/CSS | ${truncateList(allowedList, 120)} | Any \`#[0-9a-fA-F]{3,8}\` literal not in the allowed list |`,
    "| Tailwind arbitrary color | use semantic tokens | `bg-[#...]`, `text-[#...]`, `border-[#...]` with arbitrary hex |",
  );
  if (semantic.length) {
    lines.push(
      "| Named Tailwind color for semantic role | use semantic token | `text-red-500`, `bg-green-600`, etc. when a matching semantic token exists |",
      "",
      "### Serious",
      "",
      "| Check | Allowed | What to look for |",
      "|-------|---------|------------------|",
    );
    for (const c of semantic) {
      lines.push(
        `| ${c.role} must use the semantic token | \`${c.value}\` | Raw \`${c.value}\` or near-equivalent hardcoded; prefer the \`${c.role}\` token |`,
      );
    }
  }
  return lines.join("\n");
}

function allowedPalette(fp: Expression): string[] {
  const all = [
    ...fp.palette.dominant.map((c) => c.value),
    ...fp.palette.neutrals.steps,
    ...fp.palette.semantic.map((c) => c.value),
  ];
  return [...new Set(all.map((h) => h.toLowerCase()))];
}

// --- Radius -------------------------------------------------------------

function radiusSection(fp: Expression): string {
  const radii = fp.surfaces.borderRadii;
  if (!radii?.length) return "";
  const labeled = radii.map((r) => (r >= 999 ? "999px (pill)" : `${r}px`));
  const allowedList = labeled.map((r) => `\`${r}\``).join(", ");
  const rationale = findRationale(fp, ["shape-language", "shape", "radius"]);
  const hasPill = radii.some((r) => r >= 999);

  const lines: string[] = ["## 2. Shape language (radius)"];
  if (rationale) lines.push("", `> ${rationale}`);
  lines.push(
    "",
    `**Allowed radii**: ${allowedList}`,
    "",
    "### Critical",
    "",
    "| Check | Allowed | What to look for |",
    "|-------|---------|------------------|",
    `| Custom radius value | ${allowedList} | \`rounded-[Npx]\`, \`border-radius: Npx\`, or \`--radius: Npx\` outside the set |`,
  );
  if (hasPill) {
    lines.push(
      "| Interactive element not pill | `rounded-full` / `rounded-pill` | `<Button>` / `<Input>` / `<Badge>` with `rounded-md`, `rounded-lg`, or custom radius |",
    );
  }
  return lines.join("\n");
}

// --- Spacing ------------------------------------------------------------

function spacingSection(fp: Expression): string {
  const scale = fp.spacing.scale;
  if (!scale?.length) return "";
  const allowedList = scale.map((s) => `\`${s}px\``).join(", ");
  const baseUnit = fp.spacing.baseUnit;
  const rationale = findRationale(fp, ["spatial-system", "spacing", "density"]);

  const lines: string[] = ["## 3. Spacing drift"];
  if (rationale) lines.push("", `> ${rationale}`);
  lines.push(
    "",
    `**Scale**: ${allowedList}${baseUnit ? ` — base unit \`${baseUnit}px\`` : ""}`,
    "",
    "### Critical",
    "",
    "| Check | Allowed | What to look for |",
    "|-------|---------|------------------|",
    "| Off-scale padding/margin/gap | scale above | `p-[Npx]`, `m-[Npx]`, `gap-[Npx]` with N not in the scale |",
    "| Arbitrary width/height on primitives | tokens on the scale | `w-[Npx]` / `h-[Npx]` / `size-[Npx]` with N not in the scale |",
  );
  return lines.join("\n");
}

// --- Typography ---------------------------------------------------------

function typographySection(fp: Expression): string {
  const t = fp.typography;
  if (!t) return "";
  const families = t.families
    .map((f) => `\`${f.split(",")[0].trim()}\``)
    .join(", ");
  const sizeRamp = t.sizeRamp.map((s) => `\`${s}px\``).join(", ");
  const weights = Object.keys(t.weightDistribution)
    .map((w) => `\`${w}\``)
    .join(", ");
  const rationale = findRationale(fp, ["typography-voice", "typography"]);

  const lines: string[] = ["## 4. Typography drift"];
  if (rationale) lines.push("", `> ${rationale}`);
  lines.push(
    "",
    `**Families**: ${families}`,
    `**Size ramp**: ${sizeRamp}`,
    `**Weights**: ${weights}`,
    "",
    "### Critical",
    "",
    "| Check | Allowed | What to look for |",
    "|-------|---------|------------------|",
    "| Off-ramp font-size | ramp above | `text-[Npx]` or `font-size: Npx` outside the ramp |",
    "| Foreign font family | families above | `font-family: ...` or `font-[...]` introducing a new family |",
    `| Non-canonical weight | ${weights} | \`font-weight: N\` or \`font-[weight]\` outside the distribution |`,
  );
  return lines.join("\n");
}

// --- Other dimensions (prose-only; no raw evidence dump) ---------------

const COVERED_DIMENSIONS = new Set([
  "color-strategy",
  "palette",
  "color",
  "shape-language",
  "shape",
  "radius",
  "spatial-system",
  "spacing",
  "density",
  "typography-voice",
  "typography",
]);

function otherDimensions(fp: Expression): string {
  const blocks: string[] = [];
  for (const d of fp.decisions ?? []) {
    if (COVERED_DIMENSIONS.has(d.dimension)) continue;
    const prose = d.decision?.trim();
    if (!prose) continue;
    blocks.push(`### ${d.dimension}\n\n${prose}`);
  }
  if (!blocks.length) return "";
  return `## 5. Other dimensions\n\n${blocks.join("\n\n")}`;
}

// --- Output template & guidelines --------------------------------------

function outputTemplate(id: string): string {
  const slug = id.toUpperCase();
  return `## Output format

\`\`\`
═══════════════════════════════════════════════════
${slug} DRIFT REVIEW: [filename]
═══════════════════════════════════════════════════

CRITICAL (X issues)
───────────────────
[PALETTE] Line 24: Off-palette color
  className="bg-[#3b82f6]"
  Fix: use the info semantic token

SERIOUS (X issues)
──────────────────
...

═══════════════════════════════════════════════════
SUMMARY: X critical, X serious
Drift score: XX/100
═══════════════════════════════════════════════════
\`\`\``;
}

function guidelines(): string {
  return `## Guidelines

1. Read the file(s) first before making assessments
2. Be specific with line numbers and code snippets
3. Suggest the canonical token, not just "use a different color"
4. Do not flag accessibility or universal-design issues here — this is drift-only
5. If asked, offer to fix directly`;
}

function footer(fp: Expression): string {
  const count = fp.decisions?.length ?? 0;
  return `---

Generated from \`expression.md\` (${count} decisions). Re-run \`ghost-drift emit review-command\` after expression updates.`;
}

// --- helpers ------------------------------------------------------------

function findRationale(
  fp: Expression,
  candidates: string[],
): string | undefined {
  for (const dim of candidates) {
    const match = (fp.decisions ?? []).find((d) => d.dimension === dim);
    if (match?.decision?.trim()) return match.decision.trim();
  }
  return undefined;
}

function truncateList(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  const head = s.slice(0, maxLen);
  const lastComma = head.lastIndexOf(",");
  const truncated = lastComma > 0 ? head.slice(0, lastComma) : head;
  return `${truncated}, … (see list above)`;
}
