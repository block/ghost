import { parseColorToOklch } from "../embedding/colors.js";
import {
  computeSemanticEmbedding,
  embedTexts,
} from "../embedding/embed-api.js";
import { computeEmbedding } from "../embedding/embedding.js";
import { createProvider } from "../llm/index.js";
import { THREE_LAYER_SCHEMA } from "../llm/prompt.js";
import type {
  AgentContext,
  EnrichedExpression,
  Expression,
  SampledMaterial,
} from "../types.js";
import { BaseAgent } from "./base.js";
import {
  DEFAULT_MAX_TOOL_CALLS,
  executeTool,
  getToolDefinitions,
} from "./tools/index.js";
import type { ChatMessage, ToolContext } from "./tools/types.js";
import type { AgentState } from "./types.js";

/**
 * Fingerprint Agent — "What design language is this?"
 *
 * Agentic-first approach: the agent explores source directories using tools
 * (list_files, search_files, read_file, run_extractor) to discover and
 * extract the visual language. The initial sample provides a starting map,
 * not the complete input.
 *
 * Iteration model:
 *   0: Build overview from sampled material → send to LLM with tools
 *   1..N: Tool call/response cycles as the LLM explores
 *   N+1: LLM produces fingerprint JSON → validate + compute embedding
 */
export class ExpressionAgent extends BaseAgent<
  SampledMaterial,
  EnrichedExpression
> {
  name = "fingerprint";
  maxIterations = 99;
  systemPrompt = `You are a design fingerprinting agent. You analyze source files
from design systems and produce three-layer fingerprints: an observation of the
design language, abstract design decisions, and concrete token values.

You have tools to explore the source directories: list_files, search_files,
read_file, and run_extractor. Use them to find design tokens, theme files,
color definitions, spacing scales, typography configs, and surface treatments.

First form a holistic understanding of the design language. Then identify the
abstract design decisions (implementation-agnostic principles). Finally extract
the concrete values. When you have gathered enough signal, produce a JSON
fingerprint matching the schema.`;

  // State preserved across iterations for tool-use loop
  private chatMessages: ChatMessage[] = [];
  private toolCallCount = 0;
  private maxToolCalls = DEFAULT_MAX_TOOL_CALLS;
  private toolCtx: ToolContext | null = null;
  private pendingFingerprint: Expression | null = null;

  protected async step(
    state: AgentState<EnrichedExpression>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedExpression>> {
    if (state.iterations === 0) {
      return this.initialExploration(state, input, ctx);
    }

    // If we have a pending fingerprint, proceed to validation
    if (this.pendingFingerprint) {
      return this.validateAndFinalize(state, input, ctx);
    }

    // Tool call/response cycle — the primary path
    if (
      this.chatMessages.length > 0 &&
      this.hasPendingToolCalls() &&
      ctx.llm?.provider
    ) {
      return this.toolUseLoop(state, input, ctx);
    }

    // No pending tool calls and no fingerprint — the exploration is done.
    // If the last assistant message had content but didn't parse as JSON,
    // we've already surfaced that in a warning; just complete.
    state.status = "completed";
    return state;
  }

  private async initialExploration(
    state: AgentState<EnrichedExpression>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedExpression>> {
    if (!ctx.llm) {
      state.warnings.push(
        "No LLM configured. Ghost v2 requires an LLM API key for fingerprinting.",
      );
      state.status = "failed";
      return state;
    }

    // Reset per-run state
    this.chatMessages = [];
    this.toolCallCount = 0;
    this.pendingFingerprint = null;

    try {
      const provider = createProvider(ctx.llm);

      // Build the overview prompt with file map and top files pre-read
      const overview = this.buildOverview(input);
      const projectId = input.metadata.packageJson?.name ?? "project";

      const userMessage = `Analyze this project and produce a three-layer design fingerprint.

## Project: ${projectId}

${overview}

## Your Task

Use the available tools to explore these source${input.metadata.sources && input.metadata.sources.length > 1 ? "s" : ""} and build a complete picture of the visual language. Work in three layers:

### Layer 1: Observation
Form a holistic understanding. What design language is this? What personality does it project? What's distinctive? What known systems does it resemble?

### Layer 2: Design Decisions
Identify the abstract design decisions — the principles and rules, not the specific values. Surface whatever dimensions are relevant (color-strategy, spatial-system, typography-voice, motion, density, elevation, etc.). If a dimension is notably absent, note it. Cite evidence.

### Layer 3: Values
Extract the concrete tokens:
1. **Palette** — color definitions (tokens, variables, constants)
2. **Spacing** — spacing scales and base units
3. **Typography** — font families, size ramps, weight distributions
4. **Surfaces** — border radii, shadow styles, border usage patterns

When you have enough signal, output a JSON fingerprint matching this schema:

${THREE_LAYER_SCHEMA}

Set "id" to "${projectId}".

**Important:** Resolve colors to hex or rgb. Convert rem/em to px (1rem = 16px). Output spacing and radii as numbers.`;

      this.chatMessages = [{ role: "user", content: userMessage }];

      state.reasoning.push(
        `Starting exploration with ${input.files.length} overview files across ${input.metadata.sources?.length ?? 1} source(s)`,
      );

      // Send to LLM with tools
      const response = await provider.chat(
        this.chatMessages,
        getToolDefinitions(),
      );

      if (response.tool_calls?.length) {
        this.chatMessages.push({
          role: "assistant",
          content: response.content ?? "",
          tool_calls: response.tool_calls,
        });
        state.reasoning.push(
          `LLM requested ${response.tool_calls.length} tool(s): ${response.tool_calls.map((tc) => tc.name).join(", ")}`,
        );
      } else if (response.content) {
        // LLM produced a fingerprint directly from the overview
        this.chatMessages.push({
          role: "assistant",
          content: response.content,
        });
        try {
          this.pendingFingerprint = this.parseFingerprint(response.content);
          state.confidence = 0.8;
          state.reasoning.push(
            "LLM produced fingerprint from overview (no tool use needed)",
          );
        } catch {
          state.reasoning.push(
            "LLM responded but didn't produce valid JSON yet",
          );
        }
      }
    } catch (err) {
      state.warnings.push(
        `Initial exploration failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      state.status = "failed";
    }

    return state;
  }

  private async toolUseLoop(
    state: AgentState<EnrichedExpression>,
    _input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedExpression>> {
    if (!ctx.llm || !this.toolCtx) {
      state.status = "completed";
      return state;
    }

    try {
      const provider = createProvider(ctx.llm);

      // Execute pending tool calls from last assistant message
      const lastMessage = this.chatMessages[this.chatMessages.length - 1];
      if (lastMessage?.tool_calls) {
        for (const call of lastMessage.tool_calls) {
          if (this.toolCallCount >= this.maxToolCalls) {
            this.chatMessages.push({
              role: "tool",
              content:
                "Tool call budget exhausted. Please produce the fingerprint with available data.",
              tool_call_id: call.id,
            });
            continue;
          }

          const result = await executeTool(call, this.toolCtx);
          this.chatMessages.push({
            role: "tool",
            content: result.content,
            tool_call_id: call.id,
          });
          this.toolCallCount++;
          state.reasoning.push(
            `Tool ${call.name}: ${result.content.slice(0, 100)}...`,
          );
        }
      }

      // Send tool results back to LLM
      const response = await provider.chat(
        this.chatMessages,
        getToolDefinitions(),
      );

      if (
        response.tool_calls?.length &&
        this.toolCallCount < this.maxToolCalls
      ) {
        // More tool calls requested
        this.chatMessages.push({
          role: "assistant",
          content: response.content ?? "",
          tool_calls: response.tool_calls,
        });
        state.reasoning.push(
          `LLM requested ${response.tool_calls.length} more tool(s): ${response.tool_calls.map((tc) => tc.name).join(", ")}`,
        );
        return state;
      }

      // LLM returned content — parse as fingerprint
      if (response.content) {
        this.chatMessages.push({
          role: "assistant",
          content: response.content,
        });
        try {
          this.pendingFingerprint = this.parseFingerprint(response.content);
          state.confidence = 0.85;
          state.reasoning.push(
            "LLM produced fingerprint after tool exploration",
          );
        } catch {
          // If tool budget exhausted but no valid JSON, ask one more time
          if (this.toolCallCount >= this.maxToolCalls) {
            this.chatMessages.push({
              role: "user",
              content:
                "Please produce the fingerprint JSON now with all the data you have gathered.",
            });
            const finalResponse = await provider.chat(this.chatMessages, []);
            if (finalResponse.content) {
              this.pendingFingerprint = this.parseFingerprint(
                finalResponse.content,
              );
              state.confidence = 0.8;
              state.reasoning.push(
                "LLM produced fingerprint after final prompt",
              );
            }
          }
        }
      }
    } catch (err) {
      state.warnings.push(
        `Tool use loop error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return state;
  }

  private async validateAndFinalize(
    state: AgentState<EnrichedExpression>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedExpression>> {
    if (!this.pendingFingerprint) {
      state.status = "failed";
      state.warnings.push("No fingerprint to validate");
      return state;
    }

    const fp = this.pendingFingerprint;

    // Recompute all oklch tuples from value strings using deterministic math.
    // Don't trust the LLM's mental color space conversion.
    recomputeOklch(fp);

    // Embed design decisions so compare can match them by cosine similarity.
    // Batched into one API call. No-op when no embedding provider configured.
    if (ctx.embedding && fp.decisions && fp.decisions.length > 0) {
      try {
        const texts = fp.decisions.map((d) => `${d.dimension}: ${d.decision}`);
        const vectors = await embedTexts(texts, ctx.embedding);
        for (let i = 0; i < fp.decisions.length; i++) {
          fp.decisions[i].embedding = vectors[i];
        }
      } catch (err) {
        state.warnings.push(
          `Decision embedding failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Compute fingerprint-level embedding
    fp.embedding = ctx.embedding
      ? await computeSemanticEmbedding(fp, ctx.embedding)
      : computeEmbedding(fp);

    // Validate
    const issues = this.validateOutput(fp);
    if (issues.length > 0) {
      state.reasoning.push(
        `Validation: ${issues.length} issue(s): ${issues.join("; ")}`,
      );
    } else {
      state.confidence = Math.min(state.confidence + 0.1, 0.95);
      state.reasoning.push("Validation passed");
    }

    const enriched: EnrichedExpression = {
      ...fp,
      targetType: input.metadata.targetType,
    };

    state.result = enriched;
    state.status = "completed";

    // Clean up
    this.pendingFingerprint = null;
    this.chatMessages = [];
    this.toolCtx = null;

    return state;
  }

  /**
   * Set the tool context for this agent run.
   * Must be called before execute() when tools should be available.
   */
  setToolContext(toolCtx: ToolContext): void {
    this.toolCtx = toolCtx;
  }

  private hasPendingToolCalls(): boolean {
    const last = this.chatMessages[this.chatMessages.length - 1];
    return !!last?.tool_calls?.length;
  }

  /**
   * Build an overview of the sampled material for the LLM's first message.
   * Includes source labels, a file map, and the top files pre-read.
   */
  private buildOverview(input: SampledMaterial): string {
    const parts: string[] = [];

    // Source summary
    if (input.metadata.sources && input.metadata.sources.length > 1) {
      parts.push("## Sources\n");
      parts.push("This design system spans multiple sources:\n");
      for (const src of input.metadata.sources) {
        parts.push(
          `- **${src.label}** (${src.targetType}) — ${src.fileCount} files, ${src.sampledCount} sampled`,
        );
      }
      parts.push("");
    }

    // Top files pre-read (the sampled material).
    // Note: path column is the clean relative path — the `source:` suffix is
    // metadata. When calling tools, pass the path unchanged and pass `source`
    // separately for multi-source lookups.
    if (input.files.length > 0) {
      parts.push("## Pre-sampled Files (highest design-signal density)\n");
      const multi = (input.metadata.sources?.length ?? 1) > 1;
      for (const f of input.files) {
        const srcSuffix =
          multi && f.sourceLabel ? `  [source: ${f.sourceLabel}]` : "";
        parts.push(`--- ${f.path}${srcSuffix}  (${f.reason}) ---`);
        parts.push(f.content);
        parts.push("");
      }
    }

    // Package manifest hints
    if (input.metadata.packageJson?.name) {
      parts.push(`Package: ${input.metadata.packageJson.name}`);
      const deps = {
        ...input.metadata.packageJson.dependencies,
        ...input.metadata.packageJson.devDependencies,
      };
      const designDeps = Object.keys(deps).filter((d) =>
        /tailwind|styled|emotion|chakra|mui|radix|shadcn|vanilla-extract|sass|postcss/i.test(
          d,
        ),
      );
      if (designDeps.length > 0) {
        parts.push(`Design-related dependencies: ${designDeps.join(", ")}`);
      }
    }

    if (input.metadata.packageSwift?.name) {
      parts.push(`Swift Package: ${input.metadata.packageSwift.name}`);
    }

    return parts.join("\n");
  }

  private parseFingerprint(text: string): Expression {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from LLM response");
    }
    const raw = JSON.parse(jsonMatch[0]);
    const fingerprint: Expression = raw;
    fingerprint.source = "llm";
    fingerprint.timestamp = new Date().toISOString();

    // Preserve three-layer fields
    if (raw.observation && typeof raw.observation.summary === "string") {
      fingerprint.observation = raw.observation;
    }
    if (Array.isArray(raw.decisions) && raw.decisions.length > 0) {
      fingerprint.decisions = raw.decisions;
    }
    if (Array.isArray(raw.roles) && raw.roles.length > 0) {
      fingerprint.roles = raw.roles;
    }

    return fingerprint;
  }

  private validateOutput(fp: Expression): string[] {
    const issues: string[] = [];

    if (fp.palette.dominant.length === 0 && fp.palette.semantic.length === 0) {
      issues.push("No colors detected — palette is empty");
    }

    if (fp.spacing.scale.length === 0) {
      issues.push("No spacing scale detected");
    }

    if (fp.typography.families.length === 0) {
      issues.push("No font families detected");
    }

    // Check for unreasonable values
    const spacingMax = 500;
    const radiusMax = 200;

    for (const s of fp.spacing.scale) {
      if (s < 0 || s > spacingMax) {
        issues.push(`Unreasonable spacing value: ${s}`);
        break;
      }
    }

    for (const r of fp.surfaces.borderRadii) {
      // 9999/999 are common "pill" values — allow them
      if (r < 0 || (r > radiusMax && r !== 999 && r !== 9999)) {
        issues.push(`Unreasonable border radius: ${r}`);
        break;
      }
    }

    return issues;
  }
}

/**
 * Recompute all oklch tuples from color value strings using deterministic math.
 * The LLM is asked to provide color values but not to do color space conversion —
 * we handle that precisely here.
 */
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
