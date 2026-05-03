import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DesignDecision, Expression } from "@ghost/core";
import { serializeExpression } from "../writer.js";
import {
  bySeverityThenId,
  type ResolvedCheck,
  resolveExpressionChecks,
} from "./checks.js";
import { buildTokensCss } from "./tokens-css.js";

/**
 * @deprecated Legacy union retained for API compatibility with existing
 * CLI flags. Prefer the boolean flag options (`tokens`, `readme`,
 * `promptOnly`) on WriteContextOptions.
 */
export type ContextFormat = "skill" | "prompt" | "bundle";

export interface WriteContextOptions {
  outDir: string;
  /** Emit tokens.css. Default: true. */
  tokens?: boolean;
  /** Emit README.md. Default: false. */
  readme?: boolean;
  /** Emit only prompt.md (skips SKILL.md / expression.md / tokens.css). Default: false. */
  promptOnly?: boolean;
  /** Override the skill name. Default: derived from expression.id. */
  name?: string;
  /**
   * @deprecated Pass `tokens`, `readme`, `promptOnly` instead.
   * Still honored for one release to avoid breaking callers:
   *   "skill"  → tokens:true, readme:false
   *   "bundle" → tokens:true, readme:true
   *   "prompt" → promptOnly:true
   */
  format?: ContextFormat;
  /** Source path (e.g. "./expression.md") — surfaced in generated file headers. */
  sourcePath?: string;
  /** Generator version string — surfaced in generated file headers. */
  generator?: string;
}

export interface WriteContextResult {
  outDir: string;
  files: string[];
}

export async function writeContextBundle(
  expression: Expression,
  options: WriteContextOptions,
): Promise<WriteContextResult> {
  const resolved = resolveFlags(options, expression);
  await mkdir(options.outDir, { recursive: true });
  const files: string[] = [];

  if (resolved.promptOnly) {
    const p = join(options.outDir, "prompt.md");
    await writeFile(p, buildPromptMd(expression, resolved.name));
    files.push(p);
    return { outDir: options.outDir, files };
  }

  const skillPath = join(options.outDir, "SKILL.md");
  await writeFile(
    skillPath,
    buildSkillMd(expression, resolved.name, resolved.tokens),
  );
  files.push(skillPath);

  const exprPath = join(options.outDir, "expression.md");
  await writeFile(exprPath, serializeExpression(expression));
  files.push(exprPath);

  const promptPath = join(options.outDir, "prompt.md");
  await writeFile(promptPath, buildPromptMd(expression, resolved.name));
  files.push(promptPath);

  if (resolved.tokens) {
    const cssPath = join(options.outDir, "tokens.css");
    await writeFile(
      cssPath,
      buildTokensCss(expression, {
        sourcePath: options.sourcePath,
        generator: options.generator,
      }),
    );
    files.push(cssPath);
  }

  if (resolved.readme) {
    const readmePath = join(options.outDir, "README.md");
    await writeFile(readmePath, buildReadmeMd(expression, resolved.name));
    files.push(readmePath);
  }

  return { outDir: options.outDir, files };
}

interface ResolvedFlags {
  name: string;
  tokens: boolean;
  readme: boolean;
  promptOnly: boolean;
}

function resolveFlags(
  options: WriteContextOptions,
  fp?: Expression,
): ResolvedFlags {
  // Legacy format flag takes precedence if explicitly set by an old caller.
  let tokens = options.tokens ?? true;
  let readme = options.readme ?? false;
  let promptOnly = options.promptOnly ?? false;
  if (options.format) {
    if (options.format === "prompt") {
      promptOnly = true;
    } else if (options.format === "skill") {
      tokens = false;
      readme = false;
    } else if (options.format === "bundle") {
      tokens = true;
      readme = true;
    }
  }
  return {
    name: options.name ?? defaultSkillName(fp),
    tokens,
    readme,
    promptOnly,
  };
}

export function buildSkillMd(
  expression: Expression,
  name: string,
  includesCss: boolean,
): string {
  const description = buildSkillDescription(expression, name);
  const fileList = [
    "- `expression.md` — canonical design language (YAML digest + Character/Signature/References/Decisions/Checks)",
    "- `prompt.md` — generation prompt distilled from expression.md",
    ...(includesCss
      ? [
          "- `tokens.css` — CSS custom properties derived from expression tokens",
        ]
      : []),
  ].join("\n");

  const body = `This skill grounds UI generation in the **${name}** design language.

Read \`expression.md\` first — it is the source of truth. It has these layered sections:

1. **Character** — what this expression is (one-paragraph summary in the body)
2. **Signature** — dominant moves and the recognizable output posture
3. **References** — direct local sources for specs, components, and examples (frontmatter \`references\`)
4. **Decisions** — abstract design choices with evidence from the source (body \`### dimension\` blocks)
5. **Checks** — human-promoted review gates (frontmatter \`checks[]\`)

When generating UI in this language:

- Treat **Checks** as curated gates when they exist.
- Use **Decisions** as the lookup for specific choices (spacing scale, type ramp, radii).
- Open **References** before inventing new components or values.
- Let **Character** shape overall feel, density, and voice.
- Let **Signature** shape the final picture: layout posture, dominant moves, and recognizable habits.
- Before composing, infer the output shape the task calls for: article, tracker, comparison, card, or control surface. Card is one shape, not the default form of every answer.
- Prefer tokens from the YAML frontmatter (palette, spacing, typography, surfaces) over arbitrary values.

## Files

${fileList}
`;

  return `---
name: ${name}
description: ${description}
user-invocable: true
---

${body}`;
}

function buildPromptMd(expression: Expression, name: string): string {
  const parts: string[] = [];
  parts.push(
    `You are generating UI in the **${name}** design language. Produce the requested UI artifact; do not explain design decisions unless the user asks.`,
  );

  const summary = expression.observation?.summary?.trim();
  if (summary) parts.push(`# Character\n\n${summary}`);

  const signature = expression.signature?.trim();
  parts.push(
    `# Signature\n\n${signature || "No signature prose has been authored yet. Use Character, References, Decisions, and Tokens conservatively."}`,
  );

  parts.push(`# References\n\n${formatReferences(expression)}`);

  const decisions = expression.decisions ?? [];
  if (decisions.length)
    parts.push(`# Decisions\n\n${decisions.map(formatDecision).join("\n\n")}`);
  else parts.push("# Decisions\n\nNo decision prose has been authored yet.");

  const checks = resolveExpressionChecks(expression).sort(bySeverityThenId);
  if (checks.length) {
    parts.push(`# Checks\n\n${formatChecks(checks)}`);
  } else {
    parts.push(
      "# Checks\n\nNo promoted `checks[]` are present. Treat this as a generation context with guidance but no curated review gates.",
    );
  }

  parts.push(`# Shape Selection\n\n${formatShapeSelection(expression)}`);

  parts.push(`# Tokens\n\n${formatTokens(expression)}`);

  const usageLead = checks.length
    ? "use checks as gates, references as source files, decisions as style direction, and tokens as the value digest"
    : "use references as source files, decisions as style direction, and tokens as the value digest; no promoted checks have been curated yet";
  parts.push(
    `# How to use this prompt\n\nWhen asked to build a component or screen, ${usageLead}. Prefer existing local components and token names when available. Do not introduce arbitrary hex, spacing, font, radius, shadow, or motion values unless the expression explicitly allows them.`,
  );

  return `${parts.join("\n\n")}\n`;
}

function buildReadmeMd(expression: Expression, name: string): string {
  const personality = expression.observation?.personality ?? [];
  const personalityLine = personality.length
    ? ` Personality: ${personality.slice(0, 3).join(", ")}.`
    : "";
  return `# ${name} — design context bundle

Generated by \`ghost-expression emit context-bundle\`. Grounding material for AI UI generation in the **${name}** design language.${personalityLine}

## Files

- \`SKILL.md\` — Agent Skill manifest (user-invocable)
- \`expression.md\` — canonical design language (YAML frontmatter + Character/Signature/Decisions)
- \`prompt.md\` — portable prompt distilled from the expression
- \`tokens.css\` — CSS custom properties derived from expression tokens
- \`README.md\` — this file

## Using this bundle

**As a Claude Code / MCP skill:** point the client at this directory. The agent will read \`SKILL.md\` and follow its instructions.

**As context for any LLM:** load \`expression.md\` into the system prompt. For more explicit grounding, concatenate with \`tokens.css\`.

**Feedback loop:** ask your host agent to review the generated output against this \`expression.md\` (the \`review\` recipe, installed via \`ghost-drift emit skill\`). Drift signals whether the generator honored the system.
`;
}

function buildSkillDescription(expression: Expression, name: string): string {
  const personality = expression.observation?.personality ?? [];
  const traitPhrase = personality.length
    ? ` (${personality.slice(0, 3).join(", ")})`
    : "";
  return `Use this skill to generate UI in the ${name} design language${traitPhrase}. Contains the canonical expression and token reference.`;
}

function defaultSkillName(expression?: Expression): string {
  const candidate = expression?.id || "design-language";
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDecision(d: DesignDecision): string {
  return `## ${d.dimension}\n${d.decision.trim()}`;
}

function formatShapeSelection(expression: Expression): string {
  const lines: string[] = [];
  const composition = findCompositionDecision(expression);
  if (composition?.decision.trim()) {
    lines.push(`Expression guidance: ${composition.decision.trim()}`, "");
  }

  lines.push(
    "- Before layout, infer a narrow intent/shape slice from the user's task and select references that match that slice.",
    "- Use `article` for plans, timelines, worksheets, narrative/canvas outputs, and long-form synthesized answers.",
    "- Use `tracker` for metrics, progress, runway, review queues, audit status, and recurring operational views.",
    "- Use `comparison` for tradeoffs, allocation, option sets, before/after states, and side-by-side decisions.",
    "- Use `card` for compact focused recommendations or repeated peer items. Do not turn every answer into a stack of cards.",
    "- Use local controls for explicit editing, filtering, configuration, or approval tasks.",
    "- A restrained expression is not permission to make everything plain. Create variety through allowed scale contrast, shaped composition, semantic/data color, role-based elevation, functional motion, and themeable tokens.",
  );

  return lines.join("\n");
}

function findCompositionDecision(
  expression: Expression,
): DesignDecision | undefined {
  return (expression.decisions ?? []).find((decision) => {
    const dimension = decision.dimension.toLowerCase();
    const kind = decision.dimension_kind?.toLowerCase();
    return (
      dimension === "composition-patterns" ||
      kind === "composition-patterns" ||
      dimension === "response-shapes" ||
      dimension === "output-shapes"
    );
  });
}

function formatChecks(checks: ResolvedCheck[]): string {
  return checks.map(formatCheck).join("\n");
}

function formatCheck(item: ResolvedCheck): string {
  const { check, severity, match, tolerance } = item;
  const parts = [
    `- **${severity.toUpperCase()}** \`${check.id}\`${check.canonical ? ` (${check.canonical})` : ""}: ${check.summary ?? check.pattern}`,
  ];
  if (check.rationale) parts.push(`  Rationale: ${check.rationale}`);
  parts.push(`  Avoid: matches to \`${check.pattern}\`.`);
  parts.push(
    tolerance !== undefined
      ? `  Match: \`${match}\` with tolerance \`${tolerance}\`.`
      : `  Match: \`${match}\`.`,
  );
  if (check.enforce_at?.length) {
    parts.push(
      `  Applies at: ${check.enforce_at.map((e) => `\`${e}\``).join(", ")}.`,
    );
  }
  return parts.join("\n");
}

function formatReferences(expression: Expression): string {
  const refs = expression.references ?? {};
  const groups: Array<[string, string[] | undefined]> = [
    ["Specs", refs.specs],
    ["Components", refs.components],
    ["Examples", refs.examples],
  ];
  const lines: string[] = [];
  for (const [label, values] of groups) {
    lines.push(`**${label}**`);
    if (values?.length) {
      for (const value of values) lines.push(`- \`${value}\``);
    } else {
      lines.push("- None promoted yet");
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function formatTokens(expression: Expression): string {
  const lines: string[] = [];
  const dominant = expression.palette?.dominant ?? [];
  if (dominant.length) {
    lines.push("**Dominant colors**");
    for (const c of dominant) lines.push(`- \`${c.role}\`: ${c.value}`);
  }
  const neutrals = expression.palette?.neutrals?.steps ?? [];
  if (neutrals.length) lines.push(`\n**Neutral ramp:** ${neutrals.join(", ")}`);
  const semantic = expression.palette?.semantic ?? [];
  if (semantic.length) {
    if (lines.length) lines.push("");
    lines.push("**Semantic colors**");
    for (const c of semantic) lines.push(`- \`${c.role}\`: ${c.value}`);
  }
  const spacing = expression.spacing?.scale ?? [];
  if (spacing.length)
    lines.push(`\n**Spacing scale:** ${spacing.join(", ")}px`);
  const sizeRamp = expression.typography?.sizeRamp ?? [];
  if (sizeRamp.length) lines.push(`\n**Type scale:** ${sizeRamp.join(", ")}px`);
  const families = expression.typography?.families ?? [];
  if (families.length)
    lines.push(`\n**Font families:** ${families.join(", ")}`);
  const radii = expression.surfaces?.borderRadii ?? [];
  if (radii.length) lines.push(`\n**Border radii:** ${radii.join(", ")}px`);
  lines.push(`\n**Shadow posture:** ${expression.surfaces.shadowComplexity}`);
  lines.push(`**Border usage:** ${expression.surfaces.borderUsage}`);
  return lines.join("\n");
}
