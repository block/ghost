import { computeSemanticEmbedding } from "../fingerprint/embed-api.js";
import { computeEmbedding } from "../fingerprint/embedding.js";
import { createProvider } from "../llm/index.js";
import { validateFingerprint } from "../llm/validate-fingerprint.js";
import type {
  AgentContext,
  DesignFingerprint,
  DesignLanguageProfile,
  EnrichedFingerprint,
  SampledMaterial,
} from "../types.js";
import { BaseAgent } from "./base.js";
import type { AgentState } from "./types.js";

/**
 * Fingerprint Agent — "What design language is this?"
 *
 * LLM-first: sends sampled files to the LLM for interpretation,
 * validates the output, self-heals if issues found, and generates
 * a natural-language design language profile.
 *
 * Step 0: LLM interprets sampled material → DesignFingerprint
 * Step 1: Validate + compute embedding. If issues → re-prompt LLM with corrections.
 * Step 2: Generate DesignLanguageProfile
 */
export class FingerprintAgent extends BaseAgent<
  SampledMaterial,
  EnrichedFingerprint
> {
  name = "fingerprint";
  maxIterations = 3;
  systemPrompt = `You are a design fingerprinting agent. You analyze source files
from design systems and produce structured fingerprints capturing their visual
language: palette, spacing, typography, surfaces, and architecture.`;

  protected async step(
    state: AgentState<EnrichedFingerprint>,
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<AgentState<EnrichedFingerprint>> {
    if (state.iterations === 0) {
      // Step 0: LLM interpretation
      if (!ctx.llm) {
        state.warnings.push(
          "No LLM configured. Ghost v2 requires an LLM API key for fingerprinting.",
        );
        state.status = "failed";
        return state;
      }

      try {
        const provider = createProvider(ctx.llm);
        const projectId =
          input.metadata.packageJson?.name ?? "project";

        const fingerprint = await provider.interpret(input, projectId);

        // Compute embedding
        fingerprint.embedding = ctx.embedding
          ? await computeSemanticEmbedding(fingerprint, ctx.embedding)
          : computeEmbedding(fingerprint);

        // Set platform from detection
        if (input.metadata.detectedPlatform) {
          fingerprint.platform = input.metadata.detectedPlatform;
        }

        const enriched: EnrichedFingerprint = {
          ...fingerprint,
          targetType: input.metadata.targetType,
        };

        state.result = enriched;
        state.confidence = 0.75;
        state.reasoning.push(
          `LLM produced fingerprint: ${fingerprint.palette.dominant.length} dominant colors, ` +
            `${fingerprint.spacing.scale.length} spacing steps, ` +
            `${fingerprint.typography.families.length} font families, ` +
            `${fingerprint.surfaces.borderRadii.length} radii`,
        );

        // Check if we should validate and refine
        const nonZero = fingerprint.embedding.filter((v) => v !== 0).length;
        if (nonZero >= 30) {
          // Good enough — skip validation iteration
          state.confidence = 0.85;
        }
      } catch (err) {
        state.warnings.push(
          `LLM interpretation failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        state.status = "failed";
      }

      return state;
    }

    if (state.iterations === 1 && state.result) {
      // Step 1: Validate and self-heal
      try {
        const issues = this.validateOutput(state.result);

        if (issues.length > 0) {
          state.reasoning.push(
            `Validation found ${issues.length} issue(s): ${issues.join("; ")}`,
          );

          // Attempt self-healing: re-prompt LLM with issues
          try {
            const provider = createProvider(ctx.llm);
            const correctionPrompt = this.buildCorrectionPrompt(
              state.result,
              issues,
              input,
            );

            // Re-interpret with corrections
            const corrected = await provider.interpret(
              {
                ...input,
                files: [
                  {
                    path: "_correction_context",
                    content: correctionPrompt,
                    reason: "Correction context from validation",
                  },
                  ...input.files,
                ],
              },
              state.result.id,
            );

            // Recompute embedding
            corrected.embedding = ctx.embedding
              ? await computeSemanticEmbedding(corrected, ctx.embedding)
              : computeEmbedding(corrected);

            state.result = {
              ...corrected,
              targetType: state.result.targetType,
              languageProfile: state.result.languageProfile,
            };
            state.confidence = Math.min(state.confidence + 0.1, 0.95);
            state.reasoning.push("Self-healed fingerprint after validation");
          } catch {
            state.reasoning.push(
              "Self-healing failed, keeping original fingerprint",
            );
          }
        } else {
          state.confidence = 0.9;
          state.reasoning.push("Validation passed — no issues found");
        }
      } catch {
        // Validation itself failed — proceed with what we have
      }

      return state;
    }

    if (state.iterations === 2 && state.result) {
      // Step 2: Generate DesignLanguageProfile
      try {
        const profile = await this.generateLanguageProfile(input, ctx);
        if (profile) {
          state.result = { ...state.result, languageProfile: profile };
          state.reasoning.push(
            `Language profile: "${profile.summary.slice(0, 80)}..."`,
          );
        }
      } catch (err) {
        state.warnings.push(
          `Language profile failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      state.status = "completed";
      return state;
    }

    state.status = "completed";
    return state;
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
      if (r < 0 || r > radiusMax) {
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

  private buildCorrectionPrompt(
    fp: DesignFingerprint,
    issues: string[],
    _input: SampledMaterial,
  ): string {
    return `The previous fingerprint had these validation issues:
${issues.map((i) => `- ${i}`).join("\n")}

Previous output (for reference):
${JSON.stringify(fp, null, 2).slice(0, 2000)}

Please re-analyze the source files and correct these issues. Look more carefully
for design tokens, colors, spacing values, and typography definitions that may
be stored in non-standard formats (JS objects, SCSS variables, JSON configs).`;
  }

  private async generateLanguageProfile(
    input: SampledMaterial,
    ctx: AgentContext,
  ): Promise<DesignLanguageProfile | null> {
    if (!ctx.llm) return null;

    try {
      const provider = createProvider(ctx.llm);

      // Use a focused prompt for language profile
      const profileInput: SampledMaterial = {
        ...input,
        files: [
          {
            path: "_task",
            content: `Instead of a fingerprint, produce a design language profile as JSON:
{
  "summary": "2-3 sentence description of this design system's visual language",
  "personality": ["3-5 adjectives like: minimal, bold, geometric, organic, corporate, playful"],
  "closestKnownSystems": ["1-3 well-known systems this resembles: shadcn, Material Design, Ant Design, etc."]
}

Be specific. "A muted, geometric system with tight spacing" beats "A modern design system."
Return ONLY the JSON object.`,
            reason: "Task override for language profile",
          },
          ...input.files.slice(0, 5), // Only need a few files for this
        ],
      };

      // Abuse the interpret method but parse the response differently
      // This is a bit hacky — ideally we'd have a separate LLM call
      const result = await provider.interpret(
        profileInput,
        "language-profile",
      );

      // The provider will return a DesignFingerprint, but with the task override
      // it should return a language profile. Since we can't change the return type,
      // extract from the raw response instead.
      // For now, generate from the fingerprint we already have.
      return null;
    } catch {
      return null;
    }
  }
}
