import type { Expression } from "../types.js";

/**
 * Build the review prompt.
 *
 * The expression IS the rule set. Claude IS the reviewer.
 * No regex pre-filtering — the LLM sees the full design language spec
 * and the full source code, and produces the review.
 */
export function buildReviewPrompt(
  expression: Expression,
  files: { path: string; content: string }[],
): string {
  const fpSpec = formatExpression(expression);
  const fileContents = files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const intentSpec = formatDesignIntent(expression);

  return `You are a design system reviewer. You compare source code against a design expression and identify every place the code deviates from the design language.

## The Design Language

This is the complete visual language specification for this project. Every value in the code should trace back to one of these:

${intentSpec}${fpSpec}

## What Constitutes Drift

A value drifts when it doesn't match the expression. Specifically:

### Palette
- Any hardcoded color (hex, rgb, hsl, oklch) that isn't in the palette above
- Colors used in the wrong semantic role (e.g. using the destructive color for a primary action)
- Skip: CSS custom property definitions (\`--name: value\`), \`@theme\` blocks, \`@keyframes\`, \`transparent\`, \`currentColor\`, \`inherit\`

### Spacing
- Any hardcoded pixel value for spacing (padding, margin, gap, inset) that isn't in the spacing scale
- Spacing values in JSX style props (e.g. \`padding: 13\`) or Tailwind arbitrary values (\`p-[13px]\`) that don't match the scale
- Skip: 0 is always valid

### Typography
- Font sizes not in the type ramp
- Font families not in the font list
- Font weights not in the weight distribution

### Surfaces
- Border radii not in the radii set
- Shadow usage that contradicts the shadow complexity level

## Important

- Only flag values that are **actually hardcoded** in the source. Tailwind utility classes like \`bg-primary\`, \`p-4\`, \`text-sm\`, \`rounded-lg\` reference the design system's token layer — do NOT flag these.
- CSS variable references (\`var(--...)\`) are token usage — do NOT flag these.
- For each issue, provide the **nearest correct value** from the expression and a **concrete fix** (the full corrected line of code).
- Be precise about line numbers. Every line number must correspond to actual content in the file.
- If a file has no drift, do not invent issues. Return an empty array.

## Source Files

${fileContents}

## Output

Return ONLY a valid JSON array. No markdown, no explanation, no preamble. Each element:

\`\`\`
{
  "rule": "palette-drift | palette-role-misuse | spacing-drift | typography-drift | typography-family | typography-weight | surfaces-drift | surfaces-shadow",
  "dimension": "palette | spacing | typography | surfaces",
  "severity": "error | warning",
  "message": "Clear, specific description",
  "file": "exact file path from above",
  "line": 1-based line number,
  "found": "the literal value found",
  "nearest": "the correct value from the expression",
  "nearestRole": "semantic role if applicable (e.g. primary, destructive, neutral)",
  "fix": {
    "replacement": "the full corrected line of code",
    "description": "what the fix does"
  }
}
\`\`\`

If no issues are found, return: []`;
}

function formatDesignIntent(fp: Expression): string {
  const sections: string[] = [];

  if (fp.observation?.summary) {
    sections.push("### Design Intent\n");
    sections.push(fp.observation.summary);
    sections.push("");
  }

  const traits = fp.observation?.distinctiveTraits ?? [];
  if (traits.length > 0) {
    sections.push("**Signature moves** — what makes this system distinctive:");
    for (const t of traits) {
      sections.push(`- ${t}`);
    }
    sections.push("");
    sections.push(
      "Code that contradicts a signature move is more serious than a value mismatch — flag it as a signature violation.\n",
    );
  }

  if (fp.decisions && fp.decisions.length > 0) {
    if (!fp.observation?.summary && traits.length === 0) {
      sections.push("### Design Decisions\n");
    } else {
      sections.push("**Design Decisions:**");
    }
    for (const d of fp.decisions) {
      sections.push(`- **${d.dimension}**: ${d.decision}`);
    }
    sections.push("");
    sections.push(
      "When reviewing, consider whether code violates these design decisions — not just whether individual values are missing from the palette.\n",
    );
  }

  return sections.length > 0 ? `${sections.join("\n")}\n` : "";
}

function formatExpression(fp: Expression): string {
  const sections: string[] = [];

  // Palette
  sections.push("### Palette");
  sections.push("");
  sections.push("**Dominant:**");
  for (const c of fp.palette.dominant) {
    sections.push(`- ${c.role}: \`${c.value}\``);
  }
  sections.push("");
  sections.push("**Semantic:**");
  for (const c of fp.palette.semantic) {
    sections.push(`- ${c.role}: \`${c.value}\``);
  }
  sections.push("");
  sections.push("**Neutral scale:**");
  sections.push(fp.palette.neutrals.steps.map((s) => `\`${s}\``).join(", "));
  sections.push("");
  sections.push(
    `Saturation: ${fp.palette.saturationProfile} · Contrast: ${fp.palette.contrast}`,
  );

  // Spacing
  sections.push("");
  sections.push("### Spacing");
  sections.push("");
  sections.push(`Scale: ${fp.spacing.scale.map((v) => `${v}px`).join(", ")}`);
  sections.push(
    `Base unit: ${fp.spacing.baseUnit ?? "none"}px · Regularity: ${fp.spacing.regularity}`,
  );

  // Typography
  sections.push("");
  sections.push("### Typography");
  sections.push("");
  sections.push(`Families: ${fp.typography.families.join(", ")}`);
  sections.push(
    `Size ramp: ${fp.typography.sizeRamp.map((v) => `${v}px`).join(", ")}`,
  );
  sections.push(
    `Weights: ${Object.entries(fp.typography.weightDistribution)
      .map(([w, n]) => `${w} (×${n})`)
      .join(", ")}`,
  );
  sections.push(`Line height: ${fp.typography.lineHeightPattern}`);

  // Surfaces
  sections.push("");
  sections.push("### Surfaces");
  sections.push("");
  sections.push(
    `Border radii: ${fp.surfaces.borderRadii.map((v) => `${v}px`).join(", ")}`,
  );
  sections.push(`Shadow complexity: ${fp.surfaces.shadowComplexity}`);
  sections.push(`Border usage: ${fp.surfaces.borderUsage}`);

  return sections.join("\n");
}
