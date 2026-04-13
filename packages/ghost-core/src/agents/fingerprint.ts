import { parseColorToOklch } from "../fingerprint/colors.js";
import { computeSemanticEmbedding } from "../fingerprint/embed-api.js";
import { computeEmbedding } from "../fingerprint/embedding.js";
import { createProvider } from "../llm/index.js";
import { buildSignalAwarePrompt } from "../llm/prompt.js";
import { extractSignals } from "../signals/index.js";
import type {
  AgentContext,
  DesignFingerprint,
  DesignLanguageProfile,
  EnrichedFingerprint,
  SampledMaterial,
} from "../types.js";
import { BaseAgent } from "./base.js";
import {
  executeTool,
  getToolDefinitions,
  MAX_TOOL_CALLS,
} from "./tools/index.js";
import type { ChatMessage, ToolContext } from "./tools/types.js";
import type { AgentState } from "./types.js";

/**
 * Fingerprint Agent — "What design language is this?"
 *
 * Extracts deterministic signals, then uses LLM with tool access
 * for interpretation, validation, and gap-filling.
 *
 * Iteration model:
 *   0: Extract signals → LLM interpret (with tools available)
 *   1..N: Tool call/response cycles if LLM requests more data
 *   N+1: Validate + compute embedding
 *   N+2: Generate language profile
 */
export class FingerprintAgent extends BaseAgent<
  SampledMaterial,
  EnrichedFingerprint
> {
  name = "fingerprint";
  maxIterations = 8;
  systemPrompt = `You are a design fingerprinting agent. You analyze source files
from design systems and produce structured fingerprints capturing their visual
language: palette, spacing, typography, surfaces, and architecture.`;

  // State preserved across iterations for tool-use loop
  private chatMessages: ChatMessage[] = [];
  private toolCallCount = 0;
  private toolCtx: ToolContext | null = null;
  private pendingFingerprint: DesignFingerprint | null = null;

  protected async step(
    state: AgentState<EnrichedFingerprint>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedFingerprint>> {
    if (state.iterations === 0) {
      // Step 0: Extract signals and send to LLM
      return this.initialInterpretation(state, input, ctx);
    }

    // If we have a pending fingerprint, proceed to validation
    if (this.pendingFingerprint) {
      return this.validateAndFinalize(state, input, ctx);
    }

    // Safety: if we've used too many iterations without a result, fall back to interpret()
    if (state.iterations >= 5 && !this.pendingFingerprint && ctx.llm) {
      state.reasoning.push("Tool use loop exhausted — falling back to single-shot interpret()");
      try {
        const provider = createProvider(ctx.llm);
        const signals = extractSignals(input);
        const projectId = input.metadata.packageJson?.name ?? "project";
        const fingerprint = await provider.interpret(input, projectId, signals);
        this.pendingFingerprint = fingerprint;
        state.confidence = 0.7;
        return state; // Next iteration will hit validateAndFinalize
      } catch (err) {
        state.warnings.push(`Fallback interpret failed: ${err instanceof Error ? err.message : String(err)}`);
        state.status = "failed";
        return state;
      }
    }

    // Tool call/response cycle — only if LLM requested tool use
    if (this.chatMessages.length > 0 && this.hasPendingToolCalls(state) && ctx.llm?.provider) {
      return this.toolUseLoop(state, input, ctx);
    }

    // Fallback: complete
    state.status = "completed";
    return state;
  }

  private async initialInterpretation(
    state: AgentState<EnrichedFingerprint>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedFingerprint>> {
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
      const projectId = input.metadata.packageJson?.name ?? "project";

      // Extract deterministic signals
      const signals = extractSignals(input);
      state.reasoning.push(
        `Extracted ${signals.tokens.length} tokens deterministically (coverage: ${Object.entries(signals.coverage).map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`).join(", ")})`,
      );

      // Use interpret() with pre-extracted signals
      // The signal-aware prompt gives the LLM structured data to validate
      // rather than parsing raw files from scratch.
      const fingerprint = await provider.interpret(input, projectId, signals);
      this.pendingFingerprint = fingerprint;
      state.confidence = 0.75;

      if (this.pendingFingerprint) {
        state.reasoning.push(
          `LLM produced fingerprint: ${this.pendingFingerprint.palette.dominant.length} dominant colors, ` +
            `${this.pendingFingerprint.spacing.scale.length} spacing steps, ` +
            `${this.pendingFingerprint.typography.families.length} font families`,
        );
      }
    } catch (err) {
      state.warnings.push(
        `LLM interpretation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      state.status = "failed";
    }

    return state;
  }

  private async toolUseLoop(
    state: AgentState<EnrichedFingerprint>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedFingerprint>> {
    if (!ctx.llm || !this.toolCtx) {
      state.status = "completed";
      return state;
    }

    try {
      const provider = createProvider(ctx.llm);
      if (!provider.chat) {
        state.status = "completed";
        return state;
      }

      // Execute pending tool calls from last assistant message
      const lastMessage = this.chatMessages[this.chatMessages.length - 1];
      if (lastMessage?.tool_calls) {
        for (const call of lastMessage.tool_calls) {
          if (this.toolCallCount >= MAX_TOOL_CALLS) {
            this.chatMessages.push({
              role: "tool",
              content: "Tool call budget exhausted. Please produce the fingerprint with available data.",
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
          state.reasoning.push(`Tool ${call.name}: ${result.content.slice(0, 100)}...`);
        }
      }

      // Send tool results back to LLM
      const response = await provider.chat(
        this.chatMessages,
        getToolDefinitions(),
      );

      if (response.tool_calls?.length && this.toolCallCount < MAX_TOOL_CALLS) {
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
        this.pendingFingerprint = this.parseFingerprint(response.content);
        state.confidence = 0.8;
        state.reasoning.push("LLM produced fingerprint after tool use");
      }
    } catch (err) {
      state.warnings.push(
        `Tool use loop error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return state;
  }

  private async validateAndFinalize(
    state: AgentState<EnrichedFingerprint>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedFingerprint>> {
    if (!this.pendingFingerprint) {
      state.status = "failed";
      state.warnings.push("No fingerprint to validate");
      return state;
    }

    const fp = this.pendingFingerprint;

    // Recompute all oklch tuples from value strings using deterministic math.
    // Don't trust the LLM's mental color space conversion.
    recomputeOklch(fp);

    // Compute embedding
    fp.embedding = ctx.embedding
      ? await computeSemanticEmbedding(fp, ctx.embedding)
      : computeEmbedding(fp);

    // Set platform from detection
    if (input.metadata.detectedPlatform) {
      fp.platform = input.metadata.detectedPlatform;
    }

    // Validate
    const issues = this.validateOutput(fp);
    if (issues.length > 0) {
      state.reasoning.push(
        `Validation: ${issues.length} issue(s): ${issues.join("; ")}`,
      );
      // Self-healing could go here in the future
    } else {
      state.confidence = Math.min(state.confidence + 0.1, 0.95);
      state.reasoning.push("Validation passed");
    }

    const enriched: EnrichedFingerprint = {
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

  private hasPendingToolCalls(state: AgentState<EnrichedFingerprint>): boolean {
    const last = this.chatMessages[this.chatMessages.length - 1];
    return !!(last?.tool_calls?.length);
  }

  private parseFingerprint(text: string): DesignFingerprint {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from LLM response");
    }
    const fingerprint: DesignFingerprint = JSON.parse(jsonMatch[0]);
    fingerprint.source = "llm";
    fingerprint.timestamp = new Date().toISOString();
    return fingerprint;
  }

  private validateOutput(fp: DesignFingerprint): string[] {
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

    // Check for unreasonable values (widened bounds for iOS pt values)
    const spacingMax = fp.platform === "ios" ? 1000 : 500;
    const radiusMax = fp.platform === "ios" ? 500 : 200;

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

    if (
      fp.architecture.tokenization < 0 ||
      fp.architecture.tokenization > 1
    ) {
      issues.push(
        `Tokenization out of range: ${fp.architecture.tokenization}`,
      );
    }

    return issues;
  }
}

/**
 * Recompute all oklch tuples from color value strings using deterministic math.
 * The LLM is asked to provide color values but not to do color space conversion —
 * we handle that precisely here.
 */
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
