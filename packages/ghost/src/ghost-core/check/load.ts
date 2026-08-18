import { parseCheckMarkdown } from "./parse.js";
import type {
  GhostCheckDocument,
  GhostCheckMarkdownSeverity,
} from "./types.js";

/**
 * Parse a well-formed ghost check into a typed document. Assumes the input has
 * already passed `lintGhostCheck` (throws on missing required frontmatter).
 */
export function loadGhostCheck(raw: string): GhostCheckDocument {
  const { frontmatter, body } = parseCheckMarkdown(raw);
  if (frontmatter === null) {
    throw new Error("ghost check is missing a YAML frontmatter block.");
  }

  const context = frontmatter.context;
  const severity = frontmatter.severity;
  const references = frontmatter.references;
  if (
    typeof context !== "string" ||
    typeof severity !== "string" ||
    !Array.isArray(references)
  ) {
    throw new Error(
      "ghost check frontmatter is missing context, severity, or references.",
    );
  }

  return {
    frontmatter: {
      context,
      severity: severity as GhostCheckMarkdownSeverity,
      references: references.filter(
        (reference): reference is string => typeof reference === "string",
      ),
    },
    body,
  };
}
