import type {
  DesignFingerprint,
  ExtractedMaterial,
} from "../../types.js";

/**
 * Build a prompt for generating a DesignLanguageProfile.
 *
 * Given a fingerprint and extracted material, asks the LLM to describe
 * the design language in natural terms: personality, influences, and summary.
 */
export function buildDesignLanguagePrompt(
  fingerprint: DesignFingerprint,
  material: ExtractedMaterial,
): string {
  const palette = fingerprint.palette;
  const spacing = fingerprint.spacing;
  const typography = fingerprint.typography;
  const surfaces = fingerprint.surfaces;
  return `Analyze this design system fingerprint and describe its design language.

## Fingerprint Summary

**Palette:**
- Dominant colors: ${palette.dominant.map((c) => `${c.role}: ${c.value}`).join(", ") || "none detected"}
- Saturation: ${palette.saturationProfile}
- Contrast: ${palette.contrast}
- Semantic colors: ${palette.semantic.length} defined

**Spacing:**
- Scale: ${spacing.scale.length > 0 ? spacing.scale.join(", ") : "none"}
- Base unit: ${spacing.baseUnit ?? "unknown"}
- Regularity: ${spacing.regularity.toFixed(2)}

**Typography:**
- Families: ${typography.families.join(", ") || "none detected"}
- Size ramp: ${typography.sizeRamp.length > 0 ? typography.sizeRamp.join(", ") : "none"}
- Line height: ${typography.lineHeightPattern}

**Surfaces:**
- Border radii: ${surfaces.borderRadii.length > 0 ? surfaces.borderRadii.join(", ") : "none"}
- Shadow complexity: ${surfaces.shadowComplexity}
- Border usage: ${surfaces.borderUsage}

## Material Context
- Framework: ${material.metadata.framework ?? "unknown"}
- Component library: ${material.metadata.componentLibrary ?? "unknown"}
- Style files: ${material.styleFiles.length}
- Component files: ${material.componentFiles.length}

## Task

Respond with a JSON object:
{
  "summary": "A 2-3 sentence description of this design language",
  "personality": ["3-5 adjectives describing the visual personality"],
  "closestKnownSystems": ["1-3 well-known design systems this most resembles"]
}

Be specific. "A muted, geometric system with tight spacing and heavy use of
border-radius, resembling Material Design 3" is better than "A modern design system."`;
}
