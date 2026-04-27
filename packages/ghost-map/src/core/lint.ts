import { parse as parseYaml } from "yaml";
import type { z } from "zod";
import {
  MapFrontmatterSchema,
  REQUIRED_BODY_SECTIONS,
  type RequiredBodySection,
} from "./schema.js";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  severity: LintSeverity;
  rule: string;
  message: string;
  /** Dotted path within frontmatter (e.g. "languages[0].share"), or section name. */
  path?: string;
}

export interface LintReport {
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

/**
 * Lint a `map.md` source string against `ghost.map/v1`.
 *
 * Errors include malformed YAML, missing required frontmatter fields, schema
 * violations, missing body sections, out-of-order body sections, and empty
 * body sections.
 */
export function lintMap(raw: string): LintReport {
  const issues: LintIssue[] = [];

  const split = splitFrontmatter(raw);
  if (!split) {
    issues.push({
      severity: "error",
      rule: "frontmatter-missing",
      message:
        "map.md must begin with a YAML frontmatter block delimited by `---` lines",
    });
    return finalize(issues);
  }

  // Parse YAML
  let parsedYaml: unknown;
  try {
    parsedYaml = parseYaml(split.frontmatter);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "frontmatter-yaml",
      message: `frontmatter is not valid YAML: ${err instanceof Error ? err.message : String(err)}`,
    });
    return finalize(issues);
  }

  if (parsedYaml === null || typeof parsedYaml !== "object") {
    issues.push({
      severity: "error",
      rule: "frontmatter-shape",
      message: "frontmatter must be a YAML mapping",
    });
    return finalize(issues);
  }

  const result = MapFrontmatterSchema.safeParse(parsedYaml);
  if (!result.success) {
    for (const issue of zodIssues(result.error)) {
      issues.push(issue);
    }
    // Even if frontmatter is invalid, still check the body — diagnostics
    // are more useful in one pass.
  }

  // Body section checks
  const sectionIssues = checkBodySections(split.body);
  issues.push(...sectionIssues);

  return finalize(issues);
}

interface FrontmatterSplit {
  frontmatter: string;
  body: string;
}

function splitFrontmatter(raw: string): FrontmatterSplit | null {
  // Tolerate a leading BOM but require the opening fence on the first line.
  const stripped = raw.replace(/^﻿/, "");
  if (!stripped.startsWith("---")) return null;
  const lines = stripped.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return null;

  const frontmatter = lines.slice(1, endIndex).join("\n");
  const body = lines.slice(endIndex + 1).join("\n");
  return { frontmatter, body };
}

function zodIssues(error: z.ZodError): LintIssue[] {
  return error.issues.map((issue) => {
    const path = issue.path.filter(
      (segment): segment is string | number => typeof segment !== "symbol",
    );
    return {
      severity: "error",
      rule: `frontmatter:${issue.code}`,
      message: issue.message,
      path: path.length > 0 ? formatPath(path) : undefined,
    } satisfies LintIssue;
  });
}

function formatPath(path: ReadonlyArray<string | number>): string {
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else if (out.length === 0) {
      out += segment;
    } else {
      out += `.${segment}`;
    }
  }
  return out;
}

interface FoundSection {
  name: string;
  start: number; // line index in body where the heading sits
  bodyText: string; // content between this heading and the next
}

function checkBodySections(body: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const sections = scanH2Sections(body);

  // Build a lookup of which required sections appear, in what order.
  const required = new Set<string>(REQUIRED_BODY_SECTIONS);
  const sectionsByName = new Map<string, FoundSection>();
  for (const s of sections) {
    if (required.has(s.name) && !sectionsByName.has(s.name)) {
      sectionsByName.set(s.name, s);
    }
  }

  // Missing sections
  for (const name of REQUIRED_BODY_SECTIONS) {
    if (!sectionsByName.has(name)) {
      issues.push({
        severity: "error",
        rule: "body-section-missing",
        message: `body is missing required section "## ${name}"`,
        path: name,
      });
    }
  }

  // Order check (only if all three appear)
  const presentInOrder = REQUIRED_BODY_SECTIONS.filter((n) =>
    sectionsByName.has(n),
  );
  if (presentInOrder.length === REQUIRED_BODY_SECTIONS.length) {
    let lastStart = -1;
    let outOfOrder = false;
    for (const name of REQUIRED_BODY_SECTIONS) {
      const section = sectionsByName.get(name);
      if (!section) continue;
      if (section.start <= lastStart) {
        outOfOrder = true;
        break;
      }
      lastStart = section.start;
    }
    if (outOfOrder) {
      issues.push({
        severity: "error",
        rule: "body-section-order",
        message: `body sections must appear in order: ${REQUIRED_BODY_SECTIONS.map((n) => `## ${n}`).join(", ")}`,
      });
    }
  }

  // Empty section check
  for (const name of REQUIRED_BODY_SECTIONS) {
    const section = sectionsByName.get(name);
    if (!section) continue;
    if (section.bodyText.trim().length === 0) {
      issues.push({
        severity: "error",
        rule: "body-section-empty",
        message: `section "## ${name}" must not be empty`,
        path: name,
      });
    }
  }

  return issues;
}

/**
 * Walk the body and pull out top-level H2 sections (`## Title`).
 *
 * H1s, H3+ headings, and headings inside fenced code blocks are ignored.
 */
function scanH2Sections(body: string): FoundSection[] {
  const lines = body.split(/\r?\n/);
  const out: FoundSection[] = [];
  let inFence = false;
  let current: { name: string; start: number; bodyLines: string[] } | null =
    null;

  const flush = () => {
    if (!current) return;
    out.push({
      name: current.name,
      start: current.start,
      bodyText: current.bodyLines.join("\n"),
    });
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      if (current) current.bodyLines.push(line);
      continue;
    }
    if (!inFence) {
      const match = /^##\s+(.+?)\s*$/.exec(line);
      if (match) {
        flush();
        current = { name: match[1] ?? "", start: i, bodyLines: [] };
        continue;
      }
    }
    if (current) current.bodyLines.push(line);
  }

  flush();
  return out;
}

function finalize(issues: LintIssue[]): LintReport {
  let errors = 0;
  let warnings = 0;
  let info = 0;
  for (const issue of issues) {
    if (issue.severity === "error") errors++;
    else if (issue.severity === "warning") warnings++;
    else info++;
  }
  return { issues, errors, warnings, info };
}

export const MAP_FILENAME = "map.md";

// Type re-exports for callers
export type { RequiredBodySection };
