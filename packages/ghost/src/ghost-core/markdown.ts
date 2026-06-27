import { parse as parseYaml } from "yaml";

export interface ParsedMarkdown {
  /** Raw parsed frontmatter object (unvalidated), or null when absent. */
  frontmatter: Record<string, unknown> | null;
  body: string;
}

/**
 * Split a markdown artifact into its YAML frontmatter and body. The artifact is
 * `---\n<yaml>\n---\n<body>`. Returns `frontmatter: null` when there is no
 * leading frontmatter block (callers report it as an error).
 *
 * Shared by every Ghost markdown+frontmatter artifact (checks, nodes): one
 * envelope, one splitter.
 */
export function splitMarkdownFrontmatter(raw: string): ParsedMarkdown {
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    return { frontmatter: null, body: text };
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      const yaml = lines.slice(1, i).join("\n");
      const body = lines.slice(i + 1).join("\n");
      const parsed = parseYaml(yaml);
      const frontmatter =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      return { frontmatter, body: body.replace(/^\n+/, "") };
    }
  }
  // Opening fence with no close: treat the whole thing as body, no frontmatter.
  return { frontmatter: null, body: text };
}
