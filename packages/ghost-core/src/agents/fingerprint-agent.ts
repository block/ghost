/**
 * Fingerprint Agent — powered by Claude Agent SDK.
 *
 * Instead of sampling files and stuffing them into a prompt,
 * this gives the LLM filesystem tools and lets it explore the
 * codebase itself to extract the visual language.
 */

import { parseColorToOklch } from "../fingerprint/colors.js";
import {
  computeSemanticEmbedding,
  embedTexts,
} from "../fingerprint/embed-api.js";
import { computeEmbedding } from "../fingerprint/embedding.js";
import { THREE_LAYER_SCHEMA } from "../llm/prompt.js";
import type {
  AgentContext,
  AgentResult,
  DesignFingerprint,
  EnrichedFingerprint,
  TargetType,
} from "../types.js";

const PROMPT = `You are producing a design fingerprint — a comprehensive extraction of the design language present in a codebase.

Explore the codebase at the current directory. Find where visual design values are defined — theme files, CSS variables, token definitions, component styles. Read those definitions and form a complete picture.

## Three-Layer Fingerprint

Your output has three layers, produced in order:

### Layer 1: Observation
First, form a holistic understanding. What design language is this? What personality does it project? What's distinctive? What known systems does it resemble? Write freely — this is your subjective read.

### Layer 2: Design Decisions
Based on your observation, identify the abstract design decisions. These are the principles and rules — not the specific values, but the decisions those values serve. State each implementation-agnostically.

Surface whatever dimensions you find relevant. There is no fixed list. Common dimensions include color-strategy, spatial-system, typography-voice, surface-hierarchy, density, motion, elevation, interactive-patterns — but use whatever fits. If a dimension is notably absent (e.g. no animation), note that absence as a decision.

For each decision, cite specific evidence from the files you read.

### Layer 3: Values
Extract the concrete tokens — hex codes, pixel values, font stacks, border radii. This is the greppable implementation layer.

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

  const raw = JSON.parse(jsonMatch[0]);
  const fp: DesignFingerprint = raw;
  fp.source = "llm";
  fp.timestamp = new Date().toISOString();

  // Preserve observation and decisions from the three-layer output
  if (raw.observation && typeof raw.observation.summary === "string") {
    fp.observation = raw.observation;
  }
  if (Array.isArray(raw.decisions) && raw.decisions.length > 0) {
    fp.decisions = raw.decisions;
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
