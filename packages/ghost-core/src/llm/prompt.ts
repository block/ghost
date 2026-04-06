/**
 * Prompt templates for LLM-based fingerprint generation.
 */

export const FINGERPRINT_SCHEMA = `{
  "id": "string — project/repo identifier",
  "source": "llm",
  "timestamp": "string — ISO 8601",

  "palette": {
    "dominant": [{ "role": "string (primary, secondary, accent, etc.)", "value": "string (resolved color)", "oklch": [L, C, H] }],
    "neutrals": { "steps": ["string — color values lightest to darkest"], "count": "number" },
    "semantic": [{ "role": "string (surface, danger, warning, success, info, text, border, etc.)", "value": "string", "oklch": [L, C, H] }],
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
  },

  "architecture": {
    "tokenization": "number 0-1 — how much of the styling uses design tokens vs hardcoded values",
    "methodology": ["string — e.g. tailwind, css-custom-properties, scss, css-modules"],
    "componentCount": "number",
    "componentCategories": { "input": 3, "layout": 2, "feedback": 1 },
    "namingPattern": "kebab-case | camelCase | PascalCase | mixed"
  }
}`;

export function buildFingerprintPrompt(
  projectId: string,
  summarizedMaterial: string,
): string {
  return `You are a design system analyst. Analyze the following extracted design material from a software project and produce a structured design fingerprint.

## Task

Examine the CSS tokens, Tailwind classes, component code, and configuration to determine the project's visual language. Output a JSON object matching the schema below.

## Guidelines

- **Palette**: Identify the dominant brand colors, neutral ramp (grays), and semantic colors (success, danger, warning, info, surface, text, border). Convert all colors to OKLCH for the oklch field. If a color is expressed as a CSS variable reference that cannot be resolved, note the variable name in the value field and omit oklch.
- **Spacing**: Extract the spacing scale from tokens, Tailwind config, or class usage patterns. Detect the base unit (commonly 4px or 8px). Rate regularity from 0 (chaotic) to 1 (perfectly consistent scale).
- **Typography**: List font families, the size ramp, weight distribution (how many usages of each weight), and whether line heights are tight (<1.3), normal (1.3-1.6), or loose (>1.6).
- **Surfaces**: Extract border radii values, classify shadow complexity (none/subtle/layered based on number of shadow layers), and border usage frequency.
- **Architecture**: Estimate tokenization (0 = all hardcoded, 1 = all tokenized), identify the CSS methodology, count components, categorize them, and detect the naming convention.

When Tailwind classes are present, interpret them as design decisions:
- \`bg-slate-900\` → dark surface color
- \`rounded-lg\` → border radius ~8px
- \`text-sm\` → font size ~14px
- \`p-4\` → padding 16px (4 × 4px base)
- \`font-semibold\` → weight 600

## Output Format

Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

${FINGERPRINT_SCHEMA}

Set "id" to "${projectId}".

## Extracted Material

${summarizedMaterial}`;
}
