import type { DesignDecision, DesignObservation } from "../types.js";

/**
 * Structured read of an expression.md body. Anything the body holds that
 * isn't in the frontmatter lives here.
 */
export interface BodyData {
  /** From `# Character` — maps to DesignObservation.summary */
  character?: string;
  /** From `# Signature` bullets — maps to DesignObservation.distinctiveTraits */
  signature?: string[];
  /** From `# Observation` subsections (## Palette, ## Typography, etc.) */
  observationProse?: Record<string, string>;
  /** From `# Decisions` ### blocks — maps to DesignFingerprint.decisions */
  decisions?: DesignDecision[];
  /** From `# Values` Do/Don't — not yet stored on the fingerprint type */
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

/** Parse `### Dimension\n  prose\n  **Evidence:** …` into a DesignDecision. */
function parseDecision(sec: Section): DesignDecision {
  const evidenceRe = /\*\*Evidence:\*\*\s*([\s\S]*)$/i;
  const match = evidenceRe.exec(sec.body);
  const prose = match ? sec.body.replace(match[0], "").trim() : sec.body.trim();

  const evidence: string[] = [];
  if (match) {
    const raw = match[1].trim();
    if (/\n\s*-\s/.test(raw) || /^\s*-\s/.test(raw)) {
      evidence.push(...parseBullets(raw));
    } else {
      evidence.push(
        ...raw
          .split(/[,;]|\n/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  }

  return {
    dimension: slug(sec.heading),
    decision: prose,
    evidence,
  };
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
    } else if (h.startsWith("observation")) {
      const subs = sectionsAt(sec.body, 2);
      if (subs.length) {
        out.observationProse = Object.fromEntries(
          subs.map((s) => [slug(s.heading), s.body]),
        );
      }
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

/** Merge BodyData into a partial DesignObservation. */
export function applyObservation(
  body: BodyData,
  existing?: DesignObservation,
): DesignObservation | undefined {
  if (!body.character && !body.signature && !existing) return existing;
  return {
    summary: body.character ?? existing?.summary ?? "",
    personality: existing?.personality ?? [],
    distinctiveTraits: body.signature ?? existing?.distinctiveTraits ?? [],
    closestSystems: existing?.closestSystems ?? [],
  };
}
