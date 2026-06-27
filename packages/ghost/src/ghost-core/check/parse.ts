import { type ParsedMarkdown, splitMarkdownFrontmatter } from "../markdown.js";

export type ParsedCheckMarkdown = ParsedMarkdown;

/**
 * Split a markdown check into its YAML frontmatter and body. A check file is
 * `---\n<yaml>\n---\n<body>`. Returns `frontmatter: null` when there is no
 * leading frontmatter block (the caller's lint reports it as an error).
 *
 * Thin alias over the shared {@link splitMarkdownFrontmatter}; checks and nodes
 * share one envelope splitter.
 */
export function parseCheckMarkdown(raw: string): ParsedCheckMarkdown {
  return splitMarkdownFrontmatter(raw);
}
