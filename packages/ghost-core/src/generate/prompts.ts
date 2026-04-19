import type {
  DesignDecision,
  DesignValues,
  Expression,
  ReviewReport,
} from "../types.js";

export type GenerateFormat = "html";

export interface BuildGenerationPromptOptions {
  fingerprint: Expression;
  userPrompt: string;
  format: GenerateFormat;
  /** Feedback from a previous review round, when retrying. */
  retryFeedback?: ReviewReport;
}

/**
 * Build the prompt sent to the LLM for UI generation.
 *
 * Mirrors the three-layer expression model:
 *   - Character + Signature shape feel
 *   - Decisions drive specific choices
 *   - Values are hard Do/Don't gates
 *   - Tokens are the lookup table
 */
export function buildGenerationPrompt(
  options: BuildGenerationPromptOptions,
): string {
  const { fingerprint, userPrompt, format, retryFeedback } = options;

  const parts: string[] = [];

  parts.push(
    `You are generating a ${format.toUpperCase()} artifact in the design language described below. Return a single fenced \`\`\`${format} code block containing a complete, standalone document. No prose, no commentary.`,
  );

  const summary = fingerprint.observation?.summary?.trim();
  if (summary) parts.push(`## Character\n\n${summary}`);

  const traits = fingerprint.observation?.distinctiveTraits ?? [];
  if (traits.length)
    parts.push(`## Signature\n\n${traits.map((t) => `- ${t}`).join("\n")}`);

  const decisions = fingerprint.decisions ?? [];
  if (decisions.length)
    parts.push(`## Decisions\n\n${decisions.map(formatDecision).join("\n\n")}`);

  const values = fingerprint.values;
  if (values && (values.do.length || values.dont.length))
    parts.push(`## Values\n\n${formatValues(values)}`);

  parts.push(`## Tokens\n\n${formatTokens(fingerprint)}`);

  parts.push(`## Task\n\n${userPrompt}`);

  if (retryFeedback && retryFeedback.summary.totalIssues > 0) {
    parts.push(buildRetryBlock(retryFeedback));
  }

  parts.push(
    `## Output requirements\n\n- Single fenced \`\`\`${format} block.\n- Use tokens from the YAML frontmatter wherever values apply. Hard-coded off-token values will fail review.\n- Never violate a Don't.\n- The artifact must be self-contained: include any required CSS inline.`,
  );

  return parts.join("\n\n");
}

function buildRetryBlock(report: ReviewReport): string {
  const { summary, files } = report;
  const topIssues = files
    .flatMap((f) =>
      f.issues.map(
        (i) =>
          `- [${i.dimension}/${i.severity}] ${i.message} (found: ${i.found})`,
      ),
    )
    .slice(0, 5);

  const perDim = Object.entries(summary.byDimension)
    .map(([dim, n]) => `${dim}: ${n}`)
    .join(", ");

  return `## Previous attempt failed review

Drift counts — ${perDim}. Fix the issues below and regenerate the entire artifact. Do not leave any issue unresolved.

${topIssues.join("\n")}`;
}

function formatDecision(d: DesignDecision): string {
  return `### ${d.dimension}\n${d.decision.trim()}`;
}

function formatValues(values: DesignValues): string {
  const doBlock = values.do.length
    ? `### Do\n${values.do.map((v) => `- ${v}`).join("\n")}`
    : "";
  const dontBlock = values.dont.length
    ? `### Don't\n${values.dont.map((v) => `- ${v}`).join("\n")}`
    : "";
  return [doBlock, dontBlock].filter(Boolean).join("\n\n");
}

function formatTokens(fingerprint: Expression): string {
  const lines: string[] = [];
  const semantic = fingerprint.palette?.semantic ?? [];
  if (semantic.length) {
    lines.push("**Semantic colors**");
    for (const c of semantic) lines.push(`- \`${c.role}\`: ${c.value}`);
  }
  const dominant = fingerprint.palette?.dominant ?? [];
  if (dominant.length) {
    lines.push("\n**Dominant brand**");
    for (const c of dominant) lines.push(`- \`${c.role}\`: ${c.value}`);
  }
  const spacing = fingerprint.spacing?.scale ?? [];
  if (spacing.length)
    lines.push(`\n**Spacing scale:** ${spacing.join(", ")}px`);
  const sizeRamp = fingerprint.typography?.sizeRamp ?? [];
  if (sizeRamp.length) lines.push(`\n**Type scale:** ${sizeRamp.join(", ")}px`);
  const families = fingerprint.typography?.families ?? [];
  if (families.length)
    lines.push(`\n**Font families:** ${families.join(", ")}`);
  const radii = fingerprint.surfaces?.borderRadii ?? [];
  if (radii.length) lines.push(`\n**Border radii:** ${radii.join(", ")}px`);
  return lines.join("\n");
}
