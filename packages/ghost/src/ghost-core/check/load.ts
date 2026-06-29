import { parseCheckMarkdown } from "./parse.js";
import type {
  GhostCheckDocument,
  GhostCheckMarkdownSeverity,
} from "./types.js";

/**
 * Parse a well-formed Ghost check into a typed document. Assumes the input has
 * already passed `lintGhostCheck` (throws on missing required frontmatter).
 */
export function loadGhostCheck(raw: string): GhostCheckDocument {
  const { frontmatter, body } = parseCheckMarkdown(raw);
  if (frontmatter === null) {
    throw new Error("Ghost check is missing a YAML frontmatter block.");
  }

  const name = frontmatter.name;
  const description = frontmatter.description;
  const severity = frontmatter.severity;
  if (typeof name !== "string" || typeof description !== "string") {
    throw new Error("Ghost check frontmatter is missing name or description.");
  }

  const tools = Array.isArray(frontmatter.tools)
    ? frontmatter.tools.filter(
        (tool): tool is string => typeof tool === "string",
      )
    : undefined;
  const turnLimit =
    typeof frontmatter["turn-limit"] === "number"
      ? (frontmatter["turn-limit"] as number)
      : typeof frontmatter.turn_limit === "number"
        ? (frontmatter.turn_limit as number)
        : undefined;
  const surface =
    typeof frontmatter.surface === "string" ? frontmatter.surface : undefined;

  return {
    frontmatter: {
      name,
      description,
      severity: severity as GhostCheckMarkdownSeverity,
      ...(tools ? { tools } : {}),
      ...(turnLimit !== undefined ? { turn_limit: turnLimit } : {}),
      ...(surface ? { surface } : {}),
    },
    body,
  };
}
