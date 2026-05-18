import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DesignDecision, Fingerprint } from "@ghost/core";
import { serializeFingerprint } from "../writer.js";
import {
  bySeverityThenId,
  type ResolvedCheck,
  resolveFingerprintChecks,
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
  /** Emit only prompt.md (skips SKILL.md / fingerprint.md / tokens.css). Default: false. */
  promptOnly?: boolean;
  /** Override the skill name. Default: derived from fingerprint.id. */
  name?: string;
  /**
   * @deprecated Pass `tokens`, `readme`, `promptOnly` instead.
   * Still honored for one release to avoid breaking callers:
   *   "skill"  → tokens:true, readme:false
   *   "bundle" → tokens:true, readme:true
   *   "prompt" → promptOnly:true
   */
  format?: ContextFormat;
  /** Source path (e.g. ".ghost/fingerprint.md") surfaced in generated file headers. */
  sourcePath?: string;
  /** Generator version string — surfaced in generated file headers. */
  generator?: string;
}

export interface WriteContextResult {
  outDir: string;
  files: string[];
}

export async function writeContextBundle(
  fingerprint: Fingerprint,
  options: WriteContextOptions,
): Promise<WriteContextResult> {
  const resolved = resolveFlags(options, fingerprint);
  await mkdir(options.outDir, { recursive: true });
  const files: string[] = [];

  if (resolved.promptOnly) {
    const p = join(options.outDir, "prompt.md");
    await writeFile(p, buildPromptMd(fingerprint, resolved.name));
    files.push(p);
    return { outDir: options.outDir, files };
  }

  const skillPath = join(options.outDir, "SKILL.md");
  await writeFile(
    skillPath,
    buildSkillMd(fingerprint, resolved.name, resolved.tokens),
  );
  files.push(skillPath);

  const exprPath = join(options.outDir, "fingerprint.md");
  await writeFile(exprPath, serializeFingerprint(fingerprint));
  files.push(exprPath);

  const promptPath = join(options.outDir, "prompt.md");
  await writeFile(promptPath, buildPromptMd(fingerprint, resolved.name));
  files.push(promptPath);

  if (resolved.tokens) {
    const cssPath = join(options.outDir, "tokens.css");
    await writeFile(
      cssPath,
      buildTokensCss(fingerprint, {
        sourcePath: options.sourcePath,
        generator: options.generator,
      }),
    );
    files.push(cssPath);
  }

  if (resolved.readme) {
    const readmePath = join(options.outDir, "README.md");
    await writeFile(readmePath, buildReadmeMd(fingerprint, resolved.name));
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
  fp?: Fingerprint,
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
  fingerprint: Fingerprint,
  name: string,
  includesCss: boolean,
): string {
  const description = buildSkillDescription(fingerprint, name);
  const fileList = [
    "- `fingerprint.md` — non-enforcing design-language fingerprint (YAML digest + Character/Signature/References/Decisions)",
    "- `prompt.md` — generation prompt distilled from fingerprint.md",
    ...(includesCss
      ? [
          "- `tokens.css` — CSS custom properties derived from fingerprint tokens",
        ]
      : []),
  ].join("\n");

  const body = `This skill grounds UI generation in the **${name}** design language.

Read \`fingerprint.md\` first — it is the design-language fingerprint. It has these layered sections:

1. **Character** — what this fingerprint is (one-paragraph summary in the body)
2. **Signature** — dominant moves and the recognizable output posture
3. **References** — local provenance and optional source material (frontmatter \`references\`)
4. **Decisions** — abstract design choices with evidence from the source (body \`### dimension\` blocks)
5. **Checks** — active gates from \`.ghost/checks.yml\` when available

When generating UI in this language:

- Treat **Checks** as curated gates when they are provided by the host package.
- Use **Decisions** as the lookup for specific choices (spacing scale, type ramp, radii).
- When working inside the source repo, open **References** before inventing new components or values. When applying this language elsewhere, treat references as provenance; do not assume those paths exist.
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

function buildPromptMd(fingerprint: Fingerprint, name: string): string {
  const parts: string[] = [];
  parts.push(
    `You are generating UI in the **${name}** design language. Produce the requested UI artifact; do not explain design decisions unless the user asks.`,
  );

  const summary = fingerprint.observation?.summary?.trim();
  if (summary) parts.push(`# Character\n\n${summary}`);

  const signature = fingerprint.signature?.trim();
  parts.push(
    `# Signature\n\n${signature || "No signature prose has been authored yet. Use Character, Local References when accessible, Decisions, and Tokens conservatively."}`,
  );

  parts.push(`# Local References\n\n${formatReferences(fingerprint)}`);

  const decisions = fingerprint.decisions ?? [];
  if (decisions.length)
    parts.push(`# Decisions\n\n${decisions.map(formatDecision).join("\n\n")}`);
  else parts.push("# Decisions\n\nNo decision prose has been authored yet.");

  const checks = resolveFingerprintChecks(fingerprint).sort(bySeverityThenId);
  if (checks.length) {
    parts.push(`# Checks\n\n${formatChecks(checks)}`);
  } else {
    parts.push(
      "# Checks\n\nNo package checks were embedded in this context bundle. Treat this as generation guidance; run `ghost-drift check` in the source repo for active gates.",
    );
  }

  parts.push(`# Shape Selection\n\n${formatShapeSelection(fingerprint)}`);

  parts.push(`# Tokens\n\n${formatTokens(fingerprint)}`);

  const usageLead = checks.length
    ? "use embedded legacy checks as gates, local references when accessible, decisions as style direction, and tokens as the value digest"
    : "use local references when accessible, decisions as style direction, and tokens as the value digest; run package checks separately when available";
  parts.push(
    `# How to use this prompt\n\nWhen asked to build a component or screen, ${usageLead}. Prefer existing local components and token names when they are available in the current project. If this fingerprint is being used outside its source repo, ignore inaccessible paths and follow Character, Signature, Decisions, Checks, and Tokens. Do not introduce arbitrary hex, spacing, font, radius, shadow, or motion values unless the fingerprint explicitly allows them.`,
  );

  return `${parts.join("\n\n")}\n`;
}

function buildReadmeMd(fingerprint: Fingerprint, name: string): string {
  const personality = fingerprint.observation?.personality ?? [];
  const personalityLine = personality.length
    ? ` Personality: ${personality.slice(0, 3).join(", ")}.`
    : "";
  return `# ${name} — design context bundle

Generated by \`ghost-scan emit context-bundle\`. Grounding material for AI UI generation in the **${name}** design language.${personalityLine}

## Files

- \`SKILL.md\` — Agent Skill manifest (user-invocable)
- \`fingerprint.md\` — non-enforcing design-language fingerprint (YAML frontmatter + Character/Signature/Decisions)
- \`prompt.md\` — portable prompt distilled from the fingerprint
- \`tokens.css\` — CSS custom properties derived from fingerprint tokens
- \`README.md\` — this file

## Using this bundle

**As a Claude Code / MCP skill:** point the client at this directory. The agent will read \`SKILL.md\` and follow its instructions.

**As context for any LLM:** load \`fingerprint.md\` into the system prompt. For more explicit grounding, concatenate with \`tokens.css\`.

**Feedback loop:** ask your host agent to review the generated output against this fingerprint and run \`ghost-drift check\` in the source repo when a full package is available.
`;
}

function buildSkillDescription(fingerprint: Fingerprint, name: string): string {
  const personality = fingerprint.observation?.personality ?? [];
  const traitPhrase = personality.length
    ? ` (${personality.slice(0, 3).join(", ")})`
    : "";
  return `Use this skill to generate UI in the ${name} design language${traitPhrase}. Contains the fingerprint and token reference.`;
}

function defaultSkillName(fingerprint?: Fingerprint): string {
  const candidate = fingerprint?.id || "design-language";
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDecision(d: DesignDecision): string {
  return `## ${d.dimension}\n${d.decision.trim()}`;
}

function formatShapeSelection(fingerprint: Fingerprint): string {
  const lines: string[] = [];
  const composition = findCompositionDecision(fingerprint);
  if (composition?.decision.trim()) {
    lines.push(`Fingerprint guidance: ${composition.decision.trim()}`, "");
  }

  lines.push(
    "- Before layout, infer a narrow intent/shape slice from the user's task and select examples or patterns that match that slice.",
    "- Use `article` for plans, timelines, worksheets, narrative/canvas outputs, and long-form synthesized answers.",
    "- Use `tracker` for metrics, progress, runway, review queues, audit status, and recurring operational views.",
    "- Use `comparison` for tradeoffs, allocation, option sets, before/after states, and side-by-side decisions.",
    "- Use `card` for compact focused recommendations or repeated peer items. Do not turn every answer into a stack of cards.",
    "- Use local controls for explicit editing, filtering, configuration, or approval tasks.",
    "- A restrained fingerprint is not permission to make everything plain. Create variety through allowed scale contrast, shaped composition, semantic/data color, role-based elevation, functional motion, and themeable tokens.",
  );

  return lines.join("\n");
}

function findCompositionDecision(
  fingerprint: Fingerprint,
): DesignDecision | undefined {
  return (fingerprint.decisions ?? []).find((decision) => {
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
  parts.push(`  Avoid: matches to \`${check.pattern}\`.`);
  parts.push(
    tolerance !== undefined
      ? `  Match: \`${match}\` with tolerance \`${tolerance}\`.`
      : `  Match: \`${match}\`.`,
  );
  if (check.paths?.length) {
    parts.push(`  Paths: ${check.paths.map((e) => `\`${e}\``).join(", ")}.`);
  }
  if (check.contexts?.length) {
    parts.push(
      `  Contexts: ${check.contexts.map((e) => `\`${e}\``).join(", ")}.`,
    );
  }
  return parts.join("\n");
}

function formatReferences(fingerprint: Fingerprint): string {
  const refs = fingerprint.references ?? {};
  const groups: Array<[string, string[] | undefined]> = [
    ["Specs", refs.specs],
    ["Components", refs.components],
    ["Examples", refs.examples],
  ];
  const lines: string[] = [
    "These paths are local provenance and optional source material. Use them when they exist in the current workspace; otherwise treat the fingerprint body and token digest as the portable contract.",
    "",
  ];
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

function formatTokens(fingerprint: Fingerprint): string {
  const lines: string[] = [];
  const dominant = fingerprint.palette?.dominant ?? [];
  if (dominant.length) {
    lines.push("**Dominant colors**");
    for (const c of dominant) lines.push(`- \`${c.role}\`: ${c.value}`);
  }
  const neutrals = fingerprint.palette?.neutrals?.steps ?? [];
  if (neutrals.length) lines.push(`\n**Neutral ramp:** ${neutrals.join(", ")}`);
  const semantic = fingerprint.palette?.semantic ?? [];
  if (semantic.length) {
    if (lines.length) lines.push("");
    lines.push("**Semantic colors**");
    for (const c of semantic) lines.push(`- \`${c.role}\`: ${c.value}`);
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
  lines.push(`\n**Shadow posture:** ${fingerprint.surfaces.shadowComplexity}`);
  lines.push(`**Border usage:** ${fingerprint.surfaces.borderUsage}`);
  return lines.join("\n");
}
