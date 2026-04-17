/**
 * Three-layer fingerprint prompt: observation → decisions → values.
 * The LLM observes the design language holistically, extracts abstract
 * design decisions, then extracts concrete values.
 */

export const THREE_LAYER_SCHEMA = `{
  "observation": {
    "summary": "string — 2-4 sentence holistic description of this design language. What is its personality? How does it feel?",
    "personality": ["string — 3-6 adjectives (e.g. 'utilitarian', 'restrained', 'playful', 'dense')"],
    "distinctiveTraits": ["string — what makes this system visually distinctive. Include notable absences."],
    "closestSystems": ["string — 1-3 well-known design systems this most resembles (e.g. 'Linear', 'Vercel Geist', 'Material Design 3')"]
  },

  "decisions": [
    {
      "dimension": "string — freeform name for the design dimension (e.g. 'color-strategy', 'spatial-system', 'typography-voice', 'motion', 'density', 'elevation', 'interactive-patterns')",
      "decision": "string — the abstract design decision, stated implementation-agnostically",
      "evidence": ["string — specific evidence from the source code"]
    }
  ],

  "palette": {
    "dominant": [{ "role": "string (primary, secondary, accent, etc.)", "value": "string (resolved hex/rgb color — e.g. #1a1a1a)" }],
    "neutrals": { "steps": ["string — color values lightest to darkest"], "count": "number" },
    "semantic": [{ "role": "string (surface, danger, warning, success, info, text, border, etc.)", "value": "string (resolved hex/rgb color)" }],
    "saturationProfile": "muted | vibrant | mixed",
    "contrast": "high | moderate | low"
  },

  "spacing": {
    "scale": [4, 8, 12, 16, 24, 32],
    "regularity": "number 0-1 — how consistent is the spacing scale",
    "baseUnit": "number | null — detected base unit in px (e.g. 4, 8)"
  },

  "typography": {
    "families": ["string — font family names"],
    "sizeRamp": [12, 14, 16, 18, 24, 32],
    "weightDistribution": { "400": 5, "700": 3 },
    "lineHeightPattern": "tight | normal | loose"
  },

  "surfaces": {
    "borderRadii": [4, 8, 12],
    "shadowComplexity": "none | subtle | layered",
    "borderUsage": "minimal | moderate | heavy"
  }
}`;

export function buildThreeLayerPrompt(
  projectId: string,
  fileContents: string,
): string {
  return `You are a design system analyst producing a three-layer design fingerprint.

## Your Task

Examine ALL the source files below and produce a structured fingerprint that captures this project's design language at three levels of abstraction.

### Layer 1: Observation

First, form a holistic understanding of the design language. What personality does it project? What's distinctive about it? What known design systems does it most resemble? Write freely — this is your subjective read of the visual language.

### Layer 2: Design Decisions

Based on your observation, identify the abstract design decisions encoded in this codebase. These are the principles and rules — not the specific values, but the decisions those values serve.

State each decision implementation-agnostically. "Achromatic UI chrome with chromatic accents reserved for data visualization" is a design decision. The specific hex codes are not.

**Surface whatever dimensions you find relevant.** There is no fixed list. Common dimensions include color-strategy, spatial-system, typography-voice, surface-hierarchy, density, motion, elevation, interactive-patterns — but use whatever fits. If a dimension is notably absent (e.g. no animation at all), that absence is itself a decision worth capturing.

For each decision, cite specific evidence from the source files.

### Layer 3: Values

Finally, extract the concrete tokens — the specific hex codes, pixel values, font stacks, border radii. This is the greppable implementation layer.

## How to Read Different Formats

**CSS custom properties:**
\`--color-primary: oklch(0.55 0.2 250)\` → primary color
\`--spacing-4: 1rem\` → spacing scale step (16px)

**SCSS variables:**
\`$color-primary: #0066cc\` → primary color

**Tailwind config / @theme blocks:**
\`theme.extend.colors.primary: '#0066cc'\` → primary color
\`@theme { --color-primary: oklch(0.55 0.2 250) }\` → themed token

**Tailwind class usage in components:**
\`bg-slate-900\` → dark surface, color ~#0f172a
\`rounded-lg\` → border radius ~8px
\`text-sm\` → font size ~14px
\`p-4\` → padding 16px
\`font-semibold\` → weight 600

**JavaScript/TypeScript theme objects:**
\`const colors = { primary: { 500: '#3b82f6' } }\` → primary color

**JSON token files (Style Dictionary / W3C):**
\`{ "color": { "primary": { "$value": "#0066cc", "$type": "color" } } }\` → primary color

## Guidelines

- **Populate ALL value fields.** Every design system has colors, spacing, typography, and surfaces.
- **Convert units**: 1rem = 16px. Output spacing and radii as numbers.
- **Resolve colors to hex or rgb.** Do NOT output oklch — color space conversion is handled post-processing.
- **Only report values you found in the source.** Do not guess or fill in defaults.

## Output Format

Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

${THREE_LAYER_SCHEMA}

Set "id" to "${projectId}".
Set "source" to "llm".

## Source Files

${fileContents}`;
}
