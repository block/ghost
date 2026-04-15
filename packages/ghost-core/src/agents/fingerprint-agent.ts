/**
 * Fingerprint Agent — powered by Claude Agent SDK.
 *
 * Instead of sampling files and stuffing them into a prompt,
 * this gives the LLM filesystem tools and lets it explore the
 * codebase itself to extract the visual language.
 */

import { parseColorToOklch } from "../fingerprint/colors.js";
import { computeSemanticEmbedding } from "../fingerprint/embed-api.js";
import { computeEmbedding } from "../fingerprint/embedding.js";
import { FINGERPRINT_SCHEMA } from "../llm/prompt.js";
import type {
  AgentContext,
  AgentResult,
  DesignFingerprint,
  EnrichedFingerprint,
  TargetType,
} from "../types.js";

const PROMPT = `You are producing a design fingerprint — a structured snapshot of how a project looks visually.

Explore the codebase at the current directory to find where visual design values are defined. Read those definitions and report exactly what you find.

## What a fingerprint captures

1. **Palette** — the color values defined in this project. Find the actual hex values declared as variables, tokens, or constants. Report the neutral/gray scale, semantic roles (danger, success, surface, text, border), and which colors dominate.

2. **Spacing** — the spacing scale in px. Find where spacing is defined as a system (variables, token sets, scales).

3. **Typography** — font family declarations, the size scale in px, font weight usage, and line-height tendency (tight/normal/loose).

4. **Surfaces** — border radius values in px (include pill values like 999), shadow complexity (none/subtle/layered), and border usage level.

## Important

- Read the actual value definitions. If a variable references another variable, follow the chain.
- Only report values you found in the source. Do not guess or fill in defaults.

## Output

Respond with ONLY a JSON object matching this schema:

${FINGERPRINT_SCHEMA}

Set "id" to "PROJECT_ID".
Set "source" to "llm".
Colors must be hex (e.g. #1a1a1a).`;

export interface FingerprintAgentOptions {
  targetDir: string;
  targetType: TargetType;
  projectId: string;
  verbose?: boolean;
  embedding?: AgentContext["embedding"];
}

export async function runFingerprintAgent(
  options: FingerprintAgentOptions,
): Promise<AgentResult<EnrichedFingerprint>> {
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

  const fp: DesignFingerprint = JSON.parse(jsonMatch[0]);
  fp.source = "llm";
  fp.timestamp = new Date().toISOString();

  // Recompute oklch from hex values deterministically
  recomputeOklch(fp);

  // Compute embedding
  fp.embedding = options.embedding
    ? await computeSemanticEmbedding(fp, options.embedding)
    : computeEmbedding(fp);

  const enriched: EnrichedFingerprint = {
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

function recomputeOklch(fp: DesignFingerprint): void {
  for (const color of fp.palette.dominant) {
    const oklch = parseColorToOklch(color.value);
    if (oklch) color.oklch = oklch;
  }
  for (const color of fp.palette.semantic) {
    const oklch = parseColorToOklch(color.value);
    if (oklch) color.oklch = oklch;
  }
}
