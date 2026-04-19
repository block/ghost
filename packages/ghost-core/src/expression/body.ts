import type { DesignDecision } from "../types.js";

/**
 * Structured read of an expression.md body. Contract (schema 3): the body
 * is authoritative for prose — # Character, # Signature, decision rationale,
 * and # Values. Machine-facts (dimensions slugs, evidence, tokens) live in
 * the frontmatter and are joined in by `applyBody` during parse.
 */
export interface BodyData {
  /** From `# Character` — authoritative source for DesignObservation.summary */
  character?: string;
  /** From `# Signature` bullets — authoritative for DesignObservation.distinctiveTraits */
  signature?: string[];
  /** From `# Decisions` `### slug` blocks — dimension + prose rationale (no evidence) */
  decisions?: DesignDecision[];
  /** From `# Values` `## Do` / `## Don't` — authoritative for Expression.values */
  values?: { do: string[]; dont: string[] };
}

type Section = { heading: string; level: number; body: string };

/**
 * Split a markdown string into sections at exactly the requested heading level.
 * Deeper headings (e.g. `##`, `###` when level=1) stay inside the section body;
 * shallower headings end the section. Content before the first matching heading
 * is discarded.
 */
function sectionsAt(md: string, level: number): Section[] {
  const lines = md.split("\n");
  const out: Section[] = [];
  let current: Section | null = null;
  const buf: string[] = [];
  const flush = () => {
    if (current) {
      current.body = buf.join("\n").trim();
      out.push(current);
      buf.length = 0;
    }
  };
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (m && m[1].length === level) {
      flush();
      current = { heading: m[2], level, body: "" };
    } else if (m && m[1].length < level) {
      flush();
      current = null;
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return out;
}

/** Pull bullet items (`- foo`, `* foo`) from a block of markdown. */
function parseBullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.match(/^\s*[-*]\s+(.*)$/)?.[1])
    .filter((x): x is string => !!x && x.length > 0)
    .map((s) => s.replace(/\s+$/, ""));
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse a `### Dimension\nprose…\n**Evidence:**\n- …` block.
 *
 * Schema 5: evidence lives in the body as a `**Evidence:**` bullet list
 * following the rationale prose. Backtick fencing used for citation
 * formatting is stripped so the serialized value matches the in-memory
 * one (round-trip safe).
 */
function parseDecision(sec: Section): DesignDecision {
  const evidenceRe = /\*\*Evidence:\*\*\s*([\s\S]*)$/i;
  const match = sec.body.match(evidenceRe);
  const prose = sec.body.replace(evidenceRe, "").trim();
  const evidence = match ? parseBullets(match[1]).map(unfence) : [];
  return {
    dimension: slug(sec.heading),
    decision: prose,
    evidence,
  };
}

/** Remove surrounding backticks (citation fencing) added by the writer. */
function unfence(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("`") && trimmed.endsWith("`")) {
    return trimmed.slice(1, -1).replace(/\\`/g, "`");
  }
  return trimmed;
}

/** Parse a markdown body into structured BodyData. */
export function parseBody(md: string): BodyData {
  const out: BodyData = {};

  for (const sec of sectionsAt(md, 1)) {
    const h = sec.heading.toLowerCase();
    if (h.startsWith("character")) {
      out.character = sec.body;
    } else if (h.startsWith("signature")) {
      out.signature = parseBullets(sec.body);
    } else if (h.startsWith("decisions")) {
      const blocks = sectionsAt(sec.body, 3);
      if (blocks.length) out.decisions = blocks.map(parseDecision);
    } else if (h.startsWith("values")) {
      const subs = sectionsAt(sec.body, 2);
      const doSec = subs.find((s) => /^do$/i.test(s.heading.trim()));
      const dontSec = subs.find((s) =>
        /^(don['’]t|dont)$/i.test(s.heading.trim()),
      );
      out.values = {
        do: doSec ? parseBullets(doSec.body) : [],
        dont: dontSec ? parseBullets(dontSec.body) : [],
      };
    }
  }
  return out;
}
