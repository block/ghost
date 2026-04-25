import type { Expression } from "../types.js";

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
 * Pure: deterministic over the same expression. The expression is
 * expected to be the unioned result of `loadExpression` — body prose
 * (Character summary, per-decision rationale) is already folded into
 * `observation.summary` and `decisions[].decision`.
 */
export function emitReviewCommand(input: EmitReviewInput): string {
  const { expression: fp } = input;
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
