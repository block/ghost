import { parse as parseYaml } from "yaml";

/**
 * A single addressable region of an expression.md file. `start`/`end` are
 * 1-indexed line numbers (inclusive), chosen so they plug directly into
 * the Read tool's `offset`/`limit` pair (`limit = end - start + 1`).
 *
 * `tokens` is a char/4 approximation — cheap, stable, and sufficient for
 * an agent to budget context before loading a section.
 */
export interface ExpressionLayoutSection {
  kind: "frontmatter" | "body" | "decision";
  /** For body sections, the H1 heading text. For decisions, the H3 text. */
  heading?: string;
  /** For decisions, the slugged dimension name (matches frontmatter `decisions[].dimension`). */
  dimension?: string;
  /** Frontmatter partitions present in this section (only set for `kind: "frontmatter"`). */
  partitions?: string[];
  start: number;
  end: number;
  tokens: number;
}

export interface ExpressionLayout {
  lines: number;
  tokens: number;
  sections: ExpressionLayoutSection[];
}

/**
 * Produce a section map of a raw expression.md string. The map is the
 * structural index an agent can use to selectively read only the parts
 * it needs — frontmatter alone, a single `### dimension` decision block,
 * etc. — without loading the whole file.
 *
 * The scan is line-oriented and deliberately tolerant: a malformed or
 * partial expression still produces a usable layout. Validation belongs
 * to `lint`, not here.
 */
export function layoutExpression(raw: string): ExpressionLayout {
  const lines = raw.split(/\r?\n/);
  const sections: ExpressionLayoutSection[] = [];

  const frontmatter = scanFrontmatter(lines);
  const bodyStart = frontmatter ? frontmatter.end + 1 : 1;

  if (frontmatter) {
    sections.push({
      kind: "frontmatter",
      start: frontmatter.start,
      end: frontmatter.end,
      tokens: approxTokens(
        sliceLines(lines, frontmatter.start, frontmatter.end),
      ),
      partitions: frontmatter.partitions,
    });
  }

  // H1 body sections: # Character, # Signature, # Decisions, # Fragments, …
  const h1s = scanHeadings(lines, 1, bodyStart);
  for (let i = 0; i < h1s.length; i++) {
    const h = h1s[i];
    const end = (h1s[i + 1]?.lineNumber ?? lines.length + 1) - 1;
    sections.push({
      kind: "body",
      heading: h.text,
      start: h.lineNumber,
      end,
      tokens: approxTokens(sliceLines(lines, h.lineNumber, end)),
    });

    // If this is the Decisions section, split by H3.
    if (h.text.trim().toLowerCase().startsWith("decisions")) {
      const h3s = scanHeadings(lines, 3, h.lineNumber + 1, end);
      for (let j = 0; j < h3s.length; j++) {
        const d = h3s[j];
        const dEnd = (h3s[j + 1]?.lineNumber ?? end + 1) - 1;
        sections.push({
          kind: "decision",
          heading: d.text,
          dimension: slug(d.text),
          start: d.lineNumber,
          end: dEnd,
          tokens: approxTokens(sliceLines(lines, d.lineNumber, dEnd)),
        });
      }
    }
  }

  return {
    lines: lines.length,
    tokens: approxTokens(raw),
    sections,
  };
}

// --- helpers ---

function scanFrontmatter(
  lines: string[],
): { start: number; end: number; partitions: string[] } | null {
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || !isDelimiter(lines[i])) return null;
  const start = i + 1; // 1-indexed, line of opening `---`
  const openIdx = i;
  let closeIdx = -1;
  for (let j = openIdx + 1; j < lines.length; j++) {
    if (isDelimiter(lines[j])) {
      closeIdx = j;
      break;
    }
  }
  if (closeIdx === -1) return null;
  const end = closeIdx + 1; // 1-indexed, line of closing `---`

  const yamlText = lines.slice(openIdx + 1, closeIdx).join("\n");
  const partitions = detectPartitions(yamlText);
  return { start, end, partitions };
}

function detectPartitions(yamlText: string): string[] {
  // Cheap top-level-key scan. Trying to parse + fall back on scan keeps the
  // layout resilient when the frontmatter is a work-in-progress.
  const candidates = [
    "palette",
    "spacing",
    "typography",
    "surfaces",
    "observation",
    "decisions",
    "embedding",
  ];
  let keys: string[] = [];
  try {
    const obj = parseYaml(yamlText) as Record<string, unknown> | null;
    if (obj && typeof obj === "object") keys = Object.keys(obj);
  } catch {
    // fall through to regex scan
  }
  if (keys.length === 0) {
    const topLevel = new Set<string>();
    for (const line of yamlText.split("\n")) {
      const m = /^([a-zA-Z_][\w-]*)\s*:/.exec(line);
      if (m) topLevel.add(m[1]);
    }
    keys = Array.from(topLevel);
  }
  return candidates.filter((c) => keys.includes(c));
}

interface Heading {
  lineNumber: number; // 1-indexed
  level: number;
  text: string;
}

function scanHeadings(
  lines: string[],
  level: number,
  startLine = 1,
  endLine = lines.length,
): Heading[] {
  const out: Heading[] = [];
  for (let i = startLine - 1; i < endLine; i++) {
    // `\s` rather than `\s+` avoids an ambiguous split with the following
    // `.*` (both match spaces) that CodeQL flags as polynomial. `.trim()`
    // on the captured group folds extra whitespace either side.
    const m = /^(#{1,6})\s(.*)$/.exec(lines[i]);
    if (!m) continue;
    if (m[1].length === level) {
      out.push({ lineNumber: i + 1, level, text: m[2].trim() });
    } else if (m[1].length < level) {
      // A shallower heading ends the region when scanning nested headings
      // inside a bounded section.
      if (endLine !== lines.length) break;
    }
  }
  return out;
}

function sliceLines(lines: string[], start: number, end: number): string {
  return lines.slice(start - 1, end).join("\n");
}

function approxTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

function isDelimiter(line: string): boolean {
  return /^---\s*$/.test(line);
}

function slug(s: string): string {
  // Imperative rather than regex-chained because CodeQL flagged the
  // three-stage /[^a-z0-9]+/g → /^-+/ → /-+$/ pipeline as polynomial on
  // inputs with many '-' repetitions. Single O(n) pass, same semantics.
  let out = "";
  let lastDash = true;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const lower = c >= 65 && c <= 90 ? c + 32 : c;
    const isAlnum =
      (lower >= 97 && lower <= 122) || (lower >= 48 && lower <= 57);
    if (isAlnum) {
      out += String.fromCharCode(lower);
      lastDash = false;
    } else if (!lastDash) {
      out += "-";
      lastDash = true;
    }
  }
  if (out.length > 0 && out.charCodeAt(out.length - 1) === 45) {
    out = out.slice(0, -1);
  }
  return out;
}

/**
 * Render a layout as a short, human-readable table. Designed to be the
 * default output an agent streams into its context when it wants to
 * decide which sections to load.
 */
export function formatLayout(layout: ExpressionLayout, path?: string): string {
  const header = `${path ? `${path} — ` : ""}${layout.lines} lines, ~${layout.tokens.toLocaleString()} tokens`;
  const rows: string[] = [header, ""];
  for (const s of layout.sections) {
    rows.push(formatRow(s));
  }
  return rows.join("\n");
}

function formatRow(s: ExpressionLayoutSection): string {
  const range = `${s.start}–${s.end}`;
  const tok = `~${s.tokens.toLocaleString()} tok`;
  if (s.kind === "frontmatter") {
    const parts = s.partitions?.length ? `  [${s.partitions.join(", ")}]` : "";
    return `FRONTMATTER    ${pad(range, 10)} ${pad(tok, 14)}${parts}`;
  }
  if (s.kind === "body") {
    return `# ${pad(s.heading ?? "", 14)} ${pad(range, 10)} ${tok}`;
  }
  // decision
  return `  ### ${pad(s.dimension ?? s.heading ?? "", 24)} ${pad(range, 10)} ${tok}`;
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}
