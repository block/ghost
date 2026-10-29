import { z } from "zod";
import { splitMarkdownFrontmatter } from "./markdown.js";

export const BUILTIN_KIND_PURPOSES: Readonly<Record<string, string>> = {
  framing:
    "Brand framing is included automatically on every pull. Do not select it; apply its framing alongside applicable rules.",
  fundamentals:
    "Select applicable cross-brand subject guidance. Automatic core fundamentals already arrive on every pull and are not selectable.",
  identity:
    "Select brand decisions that apply across formats whenever their stated situation applies to the task.",
  interface:
    "Select guidance for the artifact or interaction being made. Interface guidance adds format-specific decisions to its declared prerequisites.",
};

export const GhostGlossaryFrontmatterSchema = z
  .object({
    kinds: z.array(
      z
        .object({
          name: z.string().min(1),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export interface GhostGlossaryKind {
  name: string;
  /** Prose purpose/normative weight for this kind, parsed from its section. */
  purpose: string;
}

export interface GhostGlossaryDocument {
  frontmatter: z.infer<typeof GhostGlossaryFrontmatterSchema>;
  body: string;
  kinds: GhostGlossaryKind[];
}

export type GhostGlossaryParseResult =
  | { glossary: GhostGlossaryDocument; errors: [] }
  | { glossary: null; errors: string[] };

export function parseGlossary(raw: string): GhostGlossaryParseResult {
  const { frontmatter, body } = splitMarkdownFrontmatter(raw);
  if (frontmatter === null) {
    return {
      glossary: null,
      errors: ["glossary must begin with YAML frontmatter"],
    };
  }

  const result = GhostGlossaryFrontmatterSchema.safeParse(frontmatter);
  if (!result.success) {
    return {
      glossary: null,
      errors: result.error.issues.map((issue) => issue.message),
    };
  }

  const normalizedBody = body.replace(/^\n+/, "").replace(/\s+$/, "");
  const sections = parseMarkdownSections(normalizedBody);
  const kinds = result.data.kinds.map((kind) => ({
    name: kind.name,
    purpose: sections.get(normalizeHeading(kind.name)) ?? "",
  }));

  return {
    glossary: {
      frontmatter: result.data,
      body: normalizedBody,
      kinds,
    },
    errors: [],
  };
}

function parseMarkdownSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split(/\r?\n/);
  let current: string | undefined;
  let buffer: string[] = [];

  const flush = () => {
    if (current !== undefined) {
      sections.set(current, buffer.join("\n").trim());
    }
  };

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (match) {
      flush();
      current = normalizeHeading(match[2] ?? "");
      buffer = [];
      continue;
    }
    if (current !== undefined) buffer.push(line);
  }
  flush();

  return sections;
}

function normalizeHeading(value: string): string {
  return value.trim().toLowerCase();
}
