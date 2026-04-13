/**
 * Prompt templates for LLM-based fingerprint generation.
 */

export const FINGERPRINT_SCHEMA = `{
  "id": "string — project/repo identifier",
  "source": "llm",
  "timestamp": "string — ISO 8601",

  "palette": {
    "dominant": [{ "role": "string (primary, secondary, accent, etc.)", "value": "string (resolved hex/rgb color — e.g. #1a1a1a, rgb(255,0,0))" }],
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
  },

  "architecture": {
    "tokenization": "number 0-1 — how much of the styling uses design tokens vs hardcoded values",
    "methodology": ["string — e.g. tailwind, css-custom-properties, scss, css-modules, css-in-js, styled-components, swiftui-inline, view-modifiers, swift-enums, asset-catalog, environment-theming"],
    "componentCount": "number",
    "componentCategories": { "input": 3, "layout": 2, "feedback": 1 },
    "namingPattern": "kebab-case | camelCase | PascalCase | mixed"
  }
}`;

export function buildFingerprintPrompt(
  projectId: string,
  fileContents: string,
  platform?: string,
): string {
  const platformNote = platform === "ios"
    ? `\n**NOTE: This is a SwiftUI/iOS project.** Look for Swift Color definitions, asset catalogs (.xcassets), ViewModifiers, @Environment keys, and enum-based tokens. Use the iOS methodology vocabulary (swiftui-inline, view-modifiers, swift-enums, asset-catalog, environment-theming).\n`
    : platform === "multiplatform"
      ? `\n**NOTE: This is a multi-platform project.** It contains both web and native (iOS/Swift) code. Analyze both and combine into a single fingerprint. Use methodology strings from both platforms as appropriate.\n`
      : "";

  return `You are a design system analyst. Analyze the following source files from a software project and produce a structured design fingerprint.

## Task

Examine ALL the files below and extract the project's complete visual language. Output a JSON object matching the schema below.
${platformNote}
## How to read different formats

### Web formats

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

### SwiftUI / iOS formats

**Swift Color definitions:**
\`Color(red: 0.5, green: 0.2, blue: 0.1)\` → sRGB components (0-1 range), convert to OKLCH
\`Color(.systemRed)\` or \`.red\` → Apple system red (#FF3B30)
\`UIColor(named: "primary")\` → references asset catalog color
\`Color("PrimaryBlue")\` → references asset catalog color by name

**Asset catalog JSON** (Contents.json inside .colorset directories):
\`{"color-space": "srgb", "components": {"red": "0.502", "green": "0.200", "blue": "0.100", "alpha": "1.000"}}\` → sRGB floats, convert to OKLCH

**SwiftUI environment / modifiers** (methodology signals):
\`@Environment(\\.colorScheme)\` → runtime theming → methodology: "environment-theming"
\`ViewModifier\` structs → scoped style encapsulation → methodology: "view-modifiers"
Inline \`.foregroundColor()\`, \`.font()\`, \`.padding()\` → methodology: "swiftui-inline"

**Swift theme patterns** (token definitions):
\`enum DesignTokens { static let spacing4: CGFloat = 4 }\` → design tokens → methodology: "swift-enums"
\`extension Color { static let primary = Color(red: 0.2, green: 0.5, blue: 0.9) }\` → methodology: "swift-enums"
\`.xcassets\` with named color sets → methodology: "asset-catalog"

**SwiftUI font definitions:**
\`.font(.system(size: 16, weight: .semibold))\` → 16pt, weight 600
\`.font(.custom("Inter", size: 14))\` → custom font "Inter" at 14pt
\`Font.system(.body)\` → SF Pro at 17pt (system default)
System font size mapping: largeTitle=34, title=28, title2=22, title3=20, headline=17, body=17, callout=16, subheadline=15, footnote=13, caption=12, caption2=11

**Apple system colors** (sRGB values):
systemRed=#FF3B30, systemOrange=#FF9500, systemYellow=#FFCC00, systemGreen=#34C759, systemMint=#00C7BE, systemTeal=#30B0C7, systemCyan=#32ADE6, systemBlue=#007AFF, systemIndigo=#5856D6, systemPurple=#AF52DE, systemPink=#FF2D55, systemBrown=#A2845E

## Guidelines

- **Populate ALL fields.** Every design system has colors, spacing, typography, and surfaces — find them even if they're in unexpected places.
- **Convert units to logical units** where possible. For web: \`1rem\` = 16px, \`0.5rem\` = 8px. For iOS: use pt values directly (px and pt are numerically equivalent for fingerprinting).
- **Resolve colors to hex or rgb.** Output color values as resolved hex (#1a1a1a) or rgb(r,g,b). Do NOT output oklch — color space conversion is handled post-processing.
- **Count real components** in the source. Look at file names, exports, and directory structure (Views, Screens, Components).
- **Rate tokenization honestly.** If most styles are hardcoded in components rather than referencing tokens, tokenization should be low.
- Spacing values should be **numbers** (not strings).
- Border radii should be **numbers**.
- Typography size ramp should be **numbers**.

## Output Format

Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

${FINGERPRINT_SCHEMA}

Set "id" to "${projectId}".

## Source Files

${fileContents}`;
}

/**
 * Build a signal-aware prompt that includes pre-extracted deterministic signals.
 * The LLM validates, corrects, and fills gaps rather than parsing from scratch.
 */
export function buildSignalAwarePrompt(
  projectId: string,
  fileContents: string,
  signals: import("../signals/types.js").DeterministicSignals,
  platform?: string,
): string {
  const platformNote = platform === "ios"
    ? "\n**Platform: iOS/SwiftUI.** Values are in pt. Use iOS methodology vocabulary.\n"
    : platform === "multiplatform"
      ? "\n**Platform: Multi-platform** (web + iOS). Combine signals from both.\n"
      : "";

  // Format pre-extracted signals
  const signalSections: string[] = [];

  if (signals.partial.palette) {
    const p = signals.partial.palette;
    signalSections.push(`### Pre-extracted Colors (${p.semantic.length} semantic, ${p.dominant.length} dominant)
${p.semantic.map((c) => `- ${c.role}: ${c.value}${c.oklch ? ` → oklch(${c.oklch.join(", ")})` : ""}`).join("\n")}
Saturation: ${p.saturationProfile}, Contrast: ${p.contrast}`);
  }

  if (signals.partial.spacing) {
    const s = signals.partial.spacing;
    signalSections.push(`### Pre-extracted Spacing
Scale: [${s.scale.join(", ")}], Base unit: ${s.baseUnit ?? "unknown"}, Regularity: ${(s.regularity * 100).toFixed(0)}%`);
  }

  if (signals.partial.typography) {
    const t = signals.partial.typography;
    signalSections.push(`### Pre-extracted Typography
Families: [${t.families.join(", ")}], Size ramp: [${t.sizeRamp.join(", ")}]
Weights: ${Object.entries(t.weightDistribution).map(([w, c]) => `${w}(×${c})`).join(", ") || "none detected"}`);
  }

  if (signals.partial.surfaces) {
    const s = signals.partial.surfaces;
    signalSections.push(`### Pre-extracted Surfaces
Border radii: [${s.borderRadii.join(", ")}], Shadows: ${s.shadowComplexity}`);
  }

  if (signals.methodologySignals.length > 0) {
    signalSections.push(`### Detected Methodologies
${signals.methodologySignals.join(", ")}`);
  }

  if (signals.componentNames.length > 0) {
    signalSections.push(`### Detected Components (${signals.componentNames.length})
${signals.componentNames.slice(0, 30).join(", ")}${signals.componentNames.length > 30 ? "..." : ""}`);
  }

  const focusNote = signals.llmFocusAreas.length > 0
    ? `\n**Focus areas:** The following dimensions need your analysis: ${signals.llmFocusAreas.join(", ")}. The pre-extracted signals above may be incomplete for these.\n`
    : "\n**All dimensions have pre-extracted data.** Validate, correct errors, and fill qualitative fields.\n";

  return `You are a design system analyst. Analyze the source files below and produce a structured design fingerprint.
${platformNote}
## Pre-extracted Signals (deterministic)

The following signals were extracted programmatically from the source files. They are generally accurate but may contain errors or miss patterns that require interpretation.

${signalSections.join("\n\n")}
${focusNote}
## Your Task

1. **Validate** the pre-extracted signals against the source files. Fix any errors.
2. **Complete** missing dimensions${signals.llmFocusAreas.length > 0 ? ` (especially: ${signals.llmFocusAreas.join(", ")})` : ""}.
3. **Fill qualitative fields**: saturationProfile, contrast, lineHeightPattern, borderUsage, tokenization score, naming pattern.
4. **Resolve colors to hex or rgb** — do NOT convert to oklch, that's handled in post-processing.
5. Output the complete fingerprint JSON.

## Output Format

Return ONLY a valid JSON object matching this schema (no markdown, no explanation):

${FINGERPRINT_SCHEMA}

Set "id" to "${projectId}".

## Source Files

${fileContents}`;
}
