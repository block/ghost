/**
 * Fingerprint Agent — powered by Claude Agent SDK.
 *
 * Instead of sampling files and stuffing them into a prompt,
 * this gives the LLM filesystem tools and lets it explore the
 * codebase itself to extract the visual language.
 */

import { parseColorToOklch } from "../embedding/colors.js";
import {
  computeSemanticEmbedding,
  embedTexts,
} from "../embedding/embed-api.js";
import { computeEmbedding } from "../embedding/embedding.js";
import { THREE_LAYER_SCHEMA } from "../llm/prompt.js";
import type {
  AgentContext,
  AgentResult,
  EnrichedExpression,
  Expression,
  TargetType,
} from "../types.js";

const PROMPT = `You are producing a design fingerprint — a comprehensive extraction of the design language present in a codebase.

Explore the codebase at the current directory. Find where visual design values are defined — theme files, CSS variables, token definitions, component styles. Read those definitions and form a complete picture.

## Three-Layer Fingerprint

Your output has three layers, produced in order:

### Layer 1: Observation
First, form a holistic understanding. What design language is this? What personality does it project? What's distinctive? What known systems does it resemble? Write freely — this is your subjective read.

### Layer 2: Design Decisions
Based on your observation, identify the abstract design decisions. These are the principles and patterns the system encodes — not the values themselves, but the patterns those values serve. State each implementation-agnostically.

**Abstract, don't restate.** A good decision names the *pattern*; a weak decision restates the *fact*.

  ✗ Weak:   "Spacing follows a 4px base grid with Tailwind's default scale." (restates a fact visible in the tokens)
  ✓ Strong: "Prefer explicit component-height tokens over padding arithmetic, so button/input sizing is decoupled from surrounding spacing." (names the pattern and its consequence)

Surface whatever dimensions you find relevant. There is no fixed list. Common dimensions include color-strategy, spatial-system, typography-voice, surface-hierarchy, density, motion, elevation, interactive-patterns — but use whatever fits. If a dimension is notably absent (e.g. no animation), note that absence as a decision.

For each decision, cite specific evidence from the files you read. Prefer evidence that's a concrete token definition with its variable name and value (e.g. "--radius-pill: 999px"); put behavioral observations in the decision prose, not in evidence.

### Layer 3: Tokens
Extract the concrete tokens — hex codes, pixel values, font stacks, border radii. This is the greppable implementation layer. Every palette entry (dominant, neutrals, semantic) should be cited in at least one decision's evidence, or dropped from the palette — uncited neutrals are noise.

### Layer 4: Roles (slot → token bindings)
Open a handful of component files and record which tokens bind to which semantic slot. A role names a slot ("h1", "body", "card", "button", "input", "list-row") and lists the specific tokens it uses — size, radius, padding, colors. This turns the token layer from ingredients into a recipe: "h1 = serif 52 / 500" rather than just "these sizes exist."

Only emit roles you directly observed. Omit subfields you can't infer. Prefer HTML-like or archetype names. Evidence should cite the component file (path or path:line). A codebase with no component files may produce an empty roles list — don't fabricate.

## Important

- Read the actual value definitions. If a variable references another variable, follow the chain.
- Only report values you found in the source. Do not guess or fill in defaults.
- Resolve colors to hex (e.g. #1a1a1a). Do NOT output oklch.
- Convert rem/em to px (1rem = 16px). Output spacing and radii as numbers.

## Output

Respond with ONLY a JSON object matching this schema:

${THREE_LAYER_SCHEMA}

Set "id" to "PROJECT_ID".
Set "source" to "llm".`;

export interface ExpressionAgentOptions {
  targetDir: string;
  targetType: TargetType;
  projectId: string;
  verbose?: boolean;
  embedding?: AgentContext["embedding"];
}

export async function runExpressionAgent(
  options: ExpressionAgentOptions,
): Promise<AgentResult<EnrichedExpression>> {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");

  const startTime = Date.now();
  const prompt = PROMPT.replace("PROJECT_ID", options.projectId);
  const reasoning: string[] = [];
  let resultText = "";

  for await (const message of query({
    prompt,
    options: {
      allowedTools: ["Read", "Glob", "Grep"],
      cwd: options.targetDir,
      maxTurns: 60,
    },
  })) {
    // Log tool usage for verbose output
    if (
      options.verbose &&
      message.type === "assistant" &&
      "message" in message
    ) {
      const msg = message.message as {
        content?: Array<{ type: string; name?: string; text?: string }>;
      };
      if (Array.isArray(msg?.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use" && block.name) {
            reasoning.push(`Tool: ${block.name}`);
          }
          if (block.type === "text" && block.text?.trim()) {
            reasoning.push(block.text.trim().slice(0, 200));
          }
        }
      }
    }

    if (message.type === "result" && message.subtype === "success") {
      resultText = message.result;
    }
  }

  if (!resultText) {
    throw new Error("Agent did not produce a result");
  }

  // Parse fingerprint from result
  const jsonMatch = resultText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from agent result");
  }

  const raw = JSON.parse(jsonMatch[0]);
  const fp: Expression = raw;
  fp.source = "llm";
  fp.timestamp = new Date().toISOString();

  // Preserve observation, decisions, and roles from the three-layer output
  if (raw.observation && typeof raw.observation.summary === "string") {
    fp.observation = raw.observation;
  }
  if (Array.isArray(raw.decisions) && raw.decisions.length > 0) {
    fp.decisions = raw.decisions;
  }
  if (Array.isArray(raw.roles) && raw.roles.length > 0) {
    fp.roles = raw.roles;
  }

  // Recompute oklch from hex values deterministically
  recomputeOklch(fp);

  // Embed design decisions for paraphrase-robust comparison downstream.
  if (options.embedding && fp.decisions && fp.decisions.length > 0) {
    try {
      const texts = fp.decisions.map((d) => `${d.dimension}: ${d.decision}`);
      const vectors = await embedTexts(texts, options.embedding);
      for (let i = 0; i < fp.decisions.length; i++) {
        fp.decisions[i].embedding = vectors[i];
      }
    } catch (err) {
      reasoning.push(
        `Decision embedding failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Compute fingerprint-level embedding
  fp.embedding = options.embedding
    ? await computeSemanticEmbedding(fp, options.embedding)
    : computeEmbedding(fp);

  const enriched: EnrichedExpression = {
    ...fp,
    targetType: options.targetType,
  };

  return {
    data: enriched,
    confidence: 0.85,
    warnings: [],
    reasoning,
    iterations: 1,
    duration: Date.now() - startTime,
  };
}

function recomputeOklch(fp: Expression): void {
  for (const color of fp.palette.dominant) {
    const oklch = parseColorToOklch(color.value);
    if (oklch) color.oklch = oklch;
  }
  for (const color of fp.palette.semantic) {
    const oklch = parseColorToOklch(color.value);
    if (oklch) color.oklch = oklch;
  }
}
