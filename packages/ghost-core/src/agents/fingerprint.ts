import { computeSemanticEmbedding } from "../fingerprint/embed-api.js";
import { computeEmbedding } from "../fingerprint/embedding.js";
import { fingerprintFromRegistry } from "../fingerprint/from-registry.js";
import { analyzeStructure } from "../llm/analyze-structure.js";
import { createProvider } from "../llm/index.js";
import { buildDesignLanguagePrompt } from "../llm/prompts/design-language.js";
import { validateFingerprint } from "../llm/validate-fingerprint.js";
import { parseCSS } from "../resolvers/css.js";
import type {
  AgentContext,
  DesignFingerprint,
  DesignLanguageProfile,
  EnrichedFingerprint,
  ExtractedMaterial,
} from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

/**
 * Fingerprint Agent — "What design language is this?"
 *
 * Takes ExtractedMaterial and produces an EnrichedFingerprint.
 * Multi-turn: validates output, refines if issues found,
 * and optionally generates a DesignLanguageProfile via LLM.
 */
export class FingerprintAgent extends BaseAgent<
  ExtractedMaterial,
  EnrichedFingerprint
> {
  name = "fingerprint";
  maxIterations = 4;
  systemPrompt = `You are a design fingerprinting agent. Your job is to produce
accurate design fingerprints from extracted materials.

A fingerprint captures: palette, spacing, typography, surfaces, and architecture.
Validate your output against the source material and refine when confidence is low.
Generate a natural-language design language profile when possible.`;

  protected async step(
    state: AgentState<EnrichedFingerprint>,
    input: ExtractedMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedFingerprint>> {
    if (state.iterations === 0) {
      // First iteration: deterministic fingerprint
      const fingerprint = await this.buildDeterministicFingerprint(input, ctx);

      const enriched: EnrichedFingerprint = {
        ...fingerprint,
        targetType: input.metadata.targetType ?? "path",
        detectedFormats: input.metadata.detectedFormats,
      };

      state.result = enriched;

      // Validate
      const validation = validateFingerprint(fingerprint, input, ctx.llm);
      state.confidence = validation.confidence;
      state.reasoning.push(
        `Deterministic fingerprint: confidence ${validation.confidence.toFixed(2)}`,
      );

      if (validation.issues.length > 0) {
        for (const issue of validation.issues) {
          if (issue.severity === "error") {
            state.warnings.push(issue.message);
          }
        }
      }

      if (state.confidence >= 0.8 || !ctx.llm) {
        state.status = "completed";
      }

      return state;
    }

    if (state.iterations === 1 && ctx.llm && state.result) {
      // Second iteration: LLM-enriched fingerprint
      try {
        const provider = createProvider(ctx.llm);
        const projectId = state.result.id ?? "project";
        const llmFingerprint = await provider.interpret(input, projectId);

        // Merge LLM insights with deterministic base
        const merged = this.mergeFingerprints(state.result, llmFingerprint);
        merged.source = "llm";

        // Recompute embedding
        merged.embedding = ctx.embedding
          ? await computeSemanticEmbedding(merged, ctx.embedding)
          : computeEmbedding(merged);

        state.result = {
          ...merged,
          targetType: state.result.targetType,
          detectedFormats: state.result.detectedFormats,
        };
        state.confidence = Math.min(state.confidence + 0.15, 1.0);
        state.reasoning.push("LLM-enriched fingerprint merged");
      } catch (err) {
        state.warnings.push(
          `LLM enrichment failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      return state;
    }

    if (state.iterations === 2 && ctx.llm && state.result) {
      // Third iteration: generate DesignLanguageProfile
      try {
        const profile = await this.generateLanguageProfile(
          input,
          state.result,
          ctx,
        );
        if (profile) {
          state.result = { ...state.result, languageProfile: profile };
          state.reasoning.push(
            `Design language profile: "${profile.summary.slice(0, 80)}..."`,
          );
        }
      } catch (err) {
        state.warnings.push(
          `Language profile generation failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      state.status = "completed";
      return state;
    }

    // Final iteration or no LLM
    state.status = "completed";
    return state;
  }

  private async buildDeterministicFingerprint(
    material: ExtractedMaterial,
    ctx: AgentContext,
  ): Promise<DesignFingerprint> {
    // Try to build from tokens first
    const allTokens = [];
    for (const file of material.styleFiles) {
      try {
        const tokens = parseCSS(file.content);
        allTokens.push(...tokens);
      } catch {
        // SCSS or malformed CSS — skip
      }
    }

    if (allTokens.length > 0) {
      const registry = {
        name: "extracted",
        items: [],
        tokens: allTokens,
      };
      const fingerprint = fingerprintFromRegistry(registry);
      fingerprint.embedding = ctx.embedding
        ? await computeSemanticEmbedding(fingerprint, ctx.embedding)
        : computeEmbedding(fingerprint);
      return fingerprint;
    }

    // Fallback: minimal fingerprint from metadata
    return this.minimalFingerprint(material, ctx);
  }

  private async minimalFingerprint(
    material: ExtractedMaterial,
    ctx: AgentContext,
  ): Promise<DesignFingerprint> {
    const tokenCount = material.metadata.tokenCount;
    const componentCount = material.metadata.componentCount;

    let totalDeclarations = 0;
    for (const file of material.styleFiles) {
      const matches = file.content.match(/[a-z-]+\s*:/g);
      if (matches) totalDeclarations += matches.length;
    }
    const tokenization =
      totalDeclarations > 0 ? Math.min(tokenCount / totalDeclarations, 1) : 0;

    const partial: Omit<DesignFingerprint, "embedding"> = {
      id: "project",
      source: "extraction",
      timestamp: new Date().toISOString(),
      palette: {
        dominant: [],
        neutrals: { steps: [], count: 0 },
        semantic: [],
        saturationProfile: "mixed",
        contrast: "moderate",
      },
      spacing: { scale: [], regularity: 0, baseUnit: null },
      typography: {
        families: [],
        sizeRamp: [],
        weightDistribution: {},
        lineHeightPattern: "normal",
      },
      surfaces: {
        borderRadii: [],
        shadowComplexity: "none",
        borderUsage: "minimal",
      },
      architecture: {
        tokenization,
        methodology: material.metadata.framework
          ? [material.metadata.framework]
          : [],
        componentCount,
        componentCategories: {},
        namingPattern: "unknown",
      },
    };

    const embedding = ctx.embedding
      ? await computeSemanticEmbedding(
          { ...partial, embedding: [] } as DesignFingerprint,
          ctx.embedding,
        )
      : computeEmbedding(partial);

    return { ...partial, embedding };
  }

  private mergeFingerprints(
    base: DesignFingerprint,
    llm: DesignFingerprint,
  ): DesignFingerprint {
    // Prefer LLM values when they're more complete
    return {
      ...base,
      palette:
        llm.palette.dominant.length > base.palette.dominant.length
          ? llm.palette
          : base.palette,
      spacing:
        llm.spacing.scale.length > base.spacing.scale.length
          ? llm.spacing
          : base.spacing,
      typography:
        llm.typography.families.length > base.typography.families.length
          ? llm.typography
          : base.typography,
      surfaces:
        llm.surfaces.borderRadii.length > base.surfaces.borderRadii.length
          ? llm.surfaces
          : base.surfaces,
      architecture: {
        ...base.architecture,
        componentCategories:
          Object.keys(llm.architecture.componentCategories).length >
          Object.keys(base.architecture.componentCategories).length
            ? llm.architecture.componentCategories
            : base.architecture.componentCategories,
      },
    };
  }

  private async generateLanguageProfile(
    material: ExtractedMaterial,
    fingerprint: EnrichedFingerprint,
    ctx: AgentContext,
  ): Promise<DesignLanguageProfile | null> {
    if (!ctx.llm) return null;

    try {
      const provider = createProvider(ctx.llm);
      const prompt = buildDesignLanguagePrompt(fingerprint, material);

      // Use the LLM to generate the profile
      // For now, return a stub based on what we know deterministically
      return {
        summary: `A ${fingerprint.palette.saturationProfile} design system with ${fingerprint.palette.contrast} contrast, ${fingerprint.surfaces.shadowComplexity} shadows, and ${fingerprint.surfaces.borderUsage} border usage.`,
        personality: [
          fingerprint.palette.saturationProfile,
          fingerprint.palette.contrast === "high" ? "bold" : "subtle",
          fingerprint.surfaces.shadowComplexity === "layered"
            ? "elevated"
            : "flat",
        ],
        closestKnownSystems: [],
      };
    } catch {
      return null;
    }
  }
}
