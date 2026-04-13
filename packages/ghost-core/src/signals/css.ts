import { parseCSS } from "../resolvers/css.js";
import type { CSSToken, SampledMaterial } from "../types.js";

/**
 * Extract CSS tokens from all CSS/SCSS files in sampled material.
 * Also extracts embedded CSS from shadcn registry JSON files.
 * Wraps the existing postcss-based parser.
 */
export function extractCSSSignals(material: SampledMaterial): CSSToken[] {
  const tokens: CSSToken[] = [];

  for (const file of material.files) {
    // Direct CSS/SCSS files
    if (file.path.endsWith(".css") || file.path.endsWith(".scss")) {
      try {
        const cleaned = file.path.endsWith(".scss")
          ? stripSCSSSyntax(file.content)
          : file.content;
        tokens.push(...parseCSS(cleaned));
      } catch {
        // Skip files that fail to parse
      }
      continue;
    }

    // shadcn registry JSON files — extract embedded CSS from files[].content
    if (file.path.endsWith(".json")) {
      try {
        const json = JSON.parse(file.content);
        if (json.$schema?.includes("registry") || json.type?.startsWith("registry:")) {
          const embeddedFiles = json.files as { path?: string; content?: string }[] | undefined;
          if (Array.isArray(embeddedFiles)) {
            for (const embedded of embeddedFiles) {
              if (embedded.content && typeof embedded.path === "string" &&
                  (embedded.path.endsWith(".css") || embedded.path.endsWith(".scss"))) {
                try {
                  tokens.push(...parseCSS(embedded.content));
                } catch {
                  // Skip unparseable embedded CSS
                }
              }
            }
          }
        }
      } catch {
        // Not valid JSON or not a registry file
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
