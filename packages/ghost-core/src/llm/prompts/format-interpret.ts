/**
 * Build a prompt for AI-assisted format interpretation.
 * Used when the deterministic format detector has low confidence.
 */
export function buildFormatInterpretationPrompt(
  fileContents: Array<{ path: string; content: string }>,
): string {
  const fileSummaries = fileContents
    .map(
      (f) =>
        `--- ${f.path} ---\n${f.content.slice(0, 3000)}${f.content.length > 3000 ? "\n[truncated]" : ""}`,
    )
    .join("\n\n");

  return `Analyze these files and identify any design tokens, color definitions,
spacing scales, typography settings, or other design system artifacts.

${fileSummaries}

## Task

Respond with a JSON object:
{
  "tokens": [
    {
      "name": "token-name (use CSS custom property format: --name)",
      "value": "the resolved value",
      "category": "color | spacing | typography | radius | shadow | border | animation | other"
    }
  ],
  "framework": "detected framework name or null",
  "confidence": 0.0-1.0,
  "notes": "any observations about the design system structure"
}

Look for:
- Color values in JS/TS theme objects (e.g., colors: { primary: '#000' })
- Spacing scales in arrays or objects
- Typography definitions (font families, sizes, weights)
- Border radius values
- Shadow definitions
- Token naming patterns

Convert all values to CSS-compatible formats.`;
}
