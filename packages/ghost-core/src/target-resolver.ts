import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Target } from "./types.js";

/**
 * Resolve a target string into a typed Target.
 *
 * Explicit prefixes (recommended):
 *   github:owner/repo    → GitHub clone
 *   npm:package-name     → npm pack
 *   figma:file-url       → Figma API
 *
 * Unambiguous patterns (no prefix needed):
 *   /absolute/path       → local path
 *   ./relative/path      → local path
 *   ../tracked/path      → local path
 *   https://...          → URL
 *
 * Ambiguous inputs without a prefix will throw an error
 * with a suggestion to use a prefix.
 */
export function resolveTarget(input: string): Target {
  // Explicit prefixes — unambiguous, preferred
  const prefixMatch = input.match(/^(github|npm|figma|path|url):(.+)$/);
  if (prefixMatch) {
    const [, prefix, value] = prefixMatch;
    return { type: prefix as Target["type"], value };
  }

  // Unambiguous: absolute or relative paths
  if (
    input.startsWith("/") ||
    input.startsWith("./") ||
    input.startsWith("../")
  ) {
    return { type: "path", value: input };
  }

  // Unambiguous: exists as local path
  if (existsSync(resolve(process.cwd(), input))) {
    return { type: "path", value: input };
  }

  // Unambiguous: URLs
  if (input.startsWith("http://") || input.startsWith("https://")) {
    if (input.includes("figma.com")) {
      return { type: "figma", value: input };
    }
    return { type: "url", value: input };
  }

  // Unambiguous: npm scoped packages (@scope/name)
  if (input.startsWith("@") && input.includes("/")) {
    return { type: "npm", value: input };
  }

  // Ambiguous — require a prefix
  const suggestions: string[] = [];
  if (input.includes("/")) {
    suggestions.push(`  github:${input}    (GitHub repo)`);
    suggestions.push(`  path:${input}      (local path)`);
  } else {
    suggestions.push(`  npm:${input}       (npm package)`);
    suggestions.push(`  github:owner/${input}  (GitHub repo)`);
  }

  throw new Error(
    `Ambiguous target "${input}". Use an explicit prefix:\n${suggestions.join("\n")}`,
  );
}
