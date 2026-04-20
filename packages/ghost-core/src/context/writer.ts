import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { serializeFingerprint } from "../fingerprint/writer.js";
import type { DesignDecision, Fingerprint } from "../types.js";
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
  /** Source path (e.g. "./fingerprint.md") — surfaced in generated file headers. */
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
    "- `fingerprint.md` — canonical design language (YAML tokens + Character/Signature/Decisions/Values)",
    ...(includesCss
      ? [
          "- `tokens.css` — CSS custom properties derived from fingerprint tokens",
        ]
      : []),
  ].join("\n");

  const body = `This skill grounds UI generation in the **${name}** design language.

Read \`fingerprint.md\` first — it is the source of truth. It has four layered sections:

1. **Character** — who this system is (one-paragraph summary)
2. **Signature** — what makes it distinctive (bullet list of traits)
3. **Decisions** — specific design choices with evidence from the source
4. **Values** — hard Do / Don't rules

When generating UI in this language:

- Treat **Values** as non-negotiable gates — never violate a Don't.
- Use **Decisions** as the lookup for specific choices (spacing scale, type ramp, radii).
- Let **Character** and **Signature** shape overall feel, density, and voice.
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
    `You are generating UI in the **${name}** design language. Honor the rules below.`,
  );

  const summary = fingerprint.observation?.summary?.trim();
  if (summary) parts.push(`# Character\n\n${summary}`);

  const traits = fingerprint.observation?.distinctiveTraits ?? [];
  if (traits.length)
    parts.push(`# Signature\n\n${traits.map((t) => `- ${t}`).join("\n")}`);

  const decisions = fingerprint.decisions ?? [];
  if (decisions.length)
    parts.push(`# Decisions\n\n${decisions.map(formatDecision).join("\n\n")}`);

  parts.push(`# Tokens\n\n${formatTokens(fingerprint)}`);

  parts.push(
    "# How to use this prompt\n\nWhen asked to build a component or screen, produce HTML that uses the tokens above. Cite the Decision that drove each non-trivial choice.",
  );

  return `${parts.join("\n\n")}\n`;
}

function buildReadmeMd(fingerprint: Fingerprint, name: string): string {
  const traits = fingerprint.observation?.distinctiveTraits ?? [];
  const traitsLine = traits.length
    ? ` Signature traits: ${traits.slice(0, 3).join(", ")}.`
    : "";
  return `# ${name} — design context bundle

Generated by \`ghost emit context-bundle\`. Grounding material for AI UI generation in the **${name}** design language.${traitsLine}

## Files

- \`SKILL.md\` — Agent Skill manifest (user-invocable)
- \`fingerprint.md\` — canonical design language (YAML frontmatter + Character/Signature/Decisions)
- \`tokens.css\` — CSS custom properties derived from fingerprint tokens
- \`README.md\` — this file

## Using this bundle

**As a Claude Code / MCP skill:** point the client at this directory. The agent will read \`SKILL.md\` and follow its instructions.

**As context for any LLM:** load \`fingerprint.md\` into the system prompt. For more explicit grounding, concatenate with \`tokens.css\`.

**Feedback loop:** run \`ghost review\` against generated output with this \`fingerprint.md\` as the fingerprint. Drift signals whether the generator honored the system.
`;
}

function buildSkillDescription(fingerprint: Fingerprint, name: string): string {
  const traits = fingerprint.observation?.distinctiveTraits ?? [];
  const traitPhrase = traits.length
    ? ` (${traits.slice(0, 3).join(", ")})`
    : "";
  return `Use this skill to generate UI in the ${name} design language${traitPhrase}. Contains the canonical fingerprint and token reference.`;
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

function formatTokens(fingerprint: Fingerprint): string {
  const lines: string[] = [];
  const semantic = fingerprint.palette?.semantic ?? [];
  if (semantic.length) {
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
  return lines.join("\n");
}
