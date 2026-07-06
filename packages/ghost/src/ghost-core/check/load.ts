import { parseCheckMarkdown } from "./parse.js";
import type {
  GhostCheckDetector,
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
  const references = Array.isArray(frontmatter.references)
    ? frontmatter.references.filter(
        (reference): reference is string => typeof reference === "string",
      )
    : undefined;
  const source =
    typeof frontmatter.source === "string" ? frontmatter.source : undefined;
  const id = typeof frontmatter.id === "string" ? frontmatter.id : undefined;
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : undefined;
  const message =
    typeof frontmatter.message === "string" ? frontmatter.message : undefined;
  const repair =
    typeof frontmatter.repair === "string" ? frontmatter.repair : undefined;
  const detector = loadDetector(frontmatter.detector);

  return {
    frontmatter: {
      name,
      description,
      severity: severity as GhostCheckMarkdownSeverity,
      ...(tools ? { tools } : {}),
      ...(turnLimit !== undefined ? { turn_limit: turnLimit } : {}),
      ...(references ? { references } : {}),
      ...(source ? { source } : {}),
      ...(id ? { id } : {}),
      ...(title ? { title } : {}),
      ...(message ? { message } : {}),
      ...(repair ? { repair } : {}),
      ...(detector ? { detector } : {}),
    },
    body,
  };
}

function loadDetector(value: unknown): GhostCheckDetector | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const raw = value as Record<string, unknown>;
  if (raw.type !== "forbidden-regex" && raw.type !== "required-regex") return;
  if (typeof raw.pattern !== "string" || raw.pattern.length === 0) return;
  const flags = typeof raw.flags === "string" ? raw.flags : undefined;
  const paths = Array.isArray(raw.paths)
    ? raw.paths.filter((path): path is string => typeof path === "string")
    : undefined;
  return {
    type: raw.type,
    pattern: raw.pattern,
    ...(flags ? { flags } : {}),
    ...(paths && paths.length > 0 ? { paths } : {}),
  };
}
