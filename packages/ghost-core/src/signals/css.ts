import { parseCSS } from "../resolvers/css.js";
import type { CSSToken, SampledMaterial } from "../types.js";

/**
 * Extract CSS tokens from all CSS/SCSS files in sampled material.
 * Wraps the existing postcss-based parser.
 */
export function extractCSSSignals(material: SampledMaterial): CSSToken[] {
  const tokens: CSSToken[] = [];

  for (const file of material.files) {
    if (file.path.endsWith(".css") || file.path.endsWith(".scss")) {
      try {
        // Strip SCSS-specific syntax before parsing
        const cleaned = file.content.endsWith(".scss")
          ? stripSCSSSyntax(file.content)
          : file.content;
        tokens.push(...parseCSS(cleaned));
      } catch {
        // Skip files that fail to parse
      }
    }
  }

  return tokens;
}

/**
 * Strip SCSS-specific syntax that postcss can't handle,
 * preserving CSS custom property declarations.
 */
function stripSCSSSyntax(scss: string): string {
  return scss
    // Remove $variable declarations (but not references in custom prop values)
    .replace(/^\$[\w-]+\s*:.*?;$/gm, "")
    // Remove @mixin and @include blocks (simplified)
    .replace(/@mixin\s+[\w-]+\s*\{[^}]*\}/g, "")
    .replace(/@include\s+[\w-]+[^;]*;/g, "")
    // Remove #{...} interpolation, leave inner content
    .replace(/#\{([^}]+)\}/g, "$1");
}
