import { z } from "zod";
import { splitMarkdownFrontmatter } from "./markdown.js";

export const GhostGlossaryKindPostureSchema = z.enum(["steady", "wild"]);

export type GhostGlossaryKindPosture = z.infer<
  typeof GhostGlossaryKindPostureSchema
>;

export const GhostGlossaryFrontmatterSchema = z
  .object({
    kinds: z.array(
      z
        .object({
          name: z.string().min(1),
          posture: GhostGlossaryKindPostureSchema.default("steady"),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export interface GhostGlossaryKind {
  name: string;
  /** Consumption posture for nodes of this kind. */
  posture: GhostGlossaryKindPosture;
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
    posture: kind.posture,
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
