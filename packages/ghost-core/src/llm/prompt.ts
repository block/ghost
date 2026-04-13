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
    "methodology": ["string — e.g. tailwind, css-custom-properties, scss, css-modules, css-in-js, styled-components"],
    "componentCount": "number",
    "componentCategories": { "input": 3, "layout": 2, "feedback": 1 },
    "namingPattern": "kebab-case | camelCase | PascalCase | mixed"
  }
}`;

export function buildFingerprintPrompt(
  projectId: string,
  fileContents: string,
): string {
  return `You are a design system analyst. Analyze the following source files from a software project and produce a structured design fingerprint.

## Task

Examine ALL the files below — CSS, SCSS, JavaScript, TypeScript, JSON, config files — and extract the project's complete visual language. Output a JSON object matching the schema below.

## How to read different formats

**CSS custom properties:**
\`--color-primary: oklch(0.55 0.2 250)\` → primary color
\`--spacing-4: 1rem\` → spacing scale step (16px)
\`--radius-lg: 0.5rem\` → border radius (8px)

**SCSS variables:**
\`$color-primary: #0066cc\` → primary color
\`$spacing-base: 8px\` → base spacing unit
\`$font-family-sans: 'Inter', sans-serif\` → font family

**Tailwind config / @theme blocks:**
\`theme.extend.colors.primary: '#0066cc'\` → primary color
\`theme.spacing: { 1: '4px', 2: '8px' }\` → spacing scale
\`@theme { --color-primary: oklch(0.55 0.2 250) }\` → themed token

**Tailwind class usage in components:**
\`bg-slate-900\` → dark surface, color ~#0f172a
\`rounded-lg\` → border radius ~8px
\`text-sm\` → font size ~14px
\`p-4\` → padding 16px (4 × 4px)
\`font-semibold\` → weight 600
\`shadow-lg\` → layered shadow

**JavaScript/TypeScript theme objects:**
\`const colors = { primary: { 500: '#3b82f6' } }\` → primary color
\`export const spacing = [0, 4, 8, 16, 24, 32]\` → spacing scale
\`const fontSizes = { sm: '0.875rem', base: '1rem' }\` → size ramp

**JSON token files (Style Dictionary / W3C):**
\`{ "color": { "primary": { "$value": "#0066cc", "$type": "color" } } }\` → primary color
\`{ "spacing": { "sm": { "value": "8px" } } }\` → spacing

**package.json dependencies** tell you the CSS methodology:
- \`tailwindcss\` → Tailwind
- \`@emotion/react\` or \`styled-components\` → CSS-in-JS
- \`sass\` → SCSS
- \`@vanilla-extract/css\` → Vanilla Extract

## Guidelines

- **Populate ALL fields.** Every design system has colors, spacing, typography, and surfaces — find them even if they're in unexpected places.
- **Convert units to px** where possible. \`1rem\` = 16px, \`0.5rem\` = 8px, etc.
- **Convert colors to OKLCH** for the oklch field. If you can't determine the exact OKLCH values, provide your best approximation.
- **Count real components** in the source. Look at file names, exports, and directory structure.
- **Rate tokenization honestly.** If most styles are hardcoded in components rather than referencing tokens, tokenization should be low.
- Spacing values should be in **px** (numbers), not strings.
- Border radii should be in **px** (numbers).
- Typography size ramp should be in **px** (numbers).

## Output Format

Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

${FINGERPRINT_SCHEMA}

Set "id" to "${projectId}".

## Source Files

${fileContents}`;
}
