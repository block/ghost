import { parse as parseYaml } from "yaml";
import type { Expression } from "../types.js";
import type { BodyData } from "./body.js";
import { parseExpression, splitRaw } from "./parser.js";
import {
  formatReferenceError,
  isTokenReference,
  resolveTokenReference,
} from "./references.js";
import { FrontmatterSchema } from "./schema.js";

export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  severity: LintSeverity;
  rule: string;
  message: string;
  /** Dotted path in the file (e.g. "decisions[0].evidence"). */
  path?: string;
}

export interface LintReport {
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface LintOptions {
  /** Treat this set of rules as errors instead of their default severity. */
  strict?: string[];
  /** Silence these rules entirely. */
  off?: string[];
}

/**
 * Lint an expression.md string for schema correctness and partition
 * violations. Unlike parseExpression, this never throws — every problem
 * surfaces as a structured issue.
 *
 * Under schema 3 the body/frontmatter partition is enforced by zod-strict.
 * Lint adds softer rules: orphan prose (body block with no frontmatter
 * entry), missing rationale (frontmatter entry with no body block),
 * legacy `**Evidence:**` bullets in the body, and broken palette citations.
 */
export function lintExpression(
  raw: string,
  options: LintOptions = {},
): LintReport {
  const rawIssues: LintIssue[] = [];
  const strict = new Set(options.strict ?? []);
  const off = new Set(options.off ?? []);

  let parsed: ReturnType<typeof parseExpression> | null = null;
  try {
    parsed = parseExpression(raw, { skipValidation: true });
  } catch (err) {
    rawIssues.push({
      severity: "error",
      rule: "parse",
      message: err instanceof Error ? err.message : String(err),
    });
    return finalize(rawIssues, strict, off);
  }

  const { expression, body } = parsed;
  const rawYaml = toRawFrontmatter(raw);
  const { body: bodyText } = splitRawSafe(raw);

  checkSchemaValidity(rawYaml, rawIssues);
  checkDecisionPartition(expression, body, rawIssues);
  checkStrayEvidenceInBody(bodyText, rawIssues);
  checkEvidenceHexes(expression, rawIssues);
  checkUnusedPalette(expression, rawIssues);
  checkRoleReferences(expression, rawIssues);

  return finalize(rawIssues, strict, off);
}

function finalize(
  issues: LintIssue[],
  strict: Set<string>,
  off: Set<string>,
): LintReport {
  const filtered = issues
    .filter((i) => !off.has(i.rule))
    .map((i) =>
      strict.has(i.rule) ? { ...i, severity: "error" as const } : i,
    );
  return {
    issues: filtered,
    errors: filtered.filter((i) => i.severity === "error").length,
    warnings: filtered.filter((i) => i.severity === "warning").length,
    info: filtered.filter((i) => i.severity === "info").length,
  };
}

function toRawFrontmatter(raw: string): Record<string, unknown> {
  try {
    const { frontmatter } = splitRaw(raw);
    return (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function splitRawSafe(raw: string): { frontmatter: string; body: string } {
  try {
    return splitRaw(raw);
  } catch {
    return { frontmatter: "", body: "" };
  }
}

function checkSchemaValidity(
  raw: Record<string, unknown>,
  issues: LintIssue[],
): void {
  const result = FrontmatterSchema.safeParse(raw);
  if (result.success) return;
  for (const issue of result.error.issues) {
    issues.push({
      severity: "error",
      rule: "schema-invalid",
      message: issue.message,
      path: issue.path.length ? issue.path.join(".") : undefined,
    });
  }
}

/**
 * Schema 5: each dimension lives in exactly one place — a `### Dimension`
 * body block carrying prose + optional `**Evidence:**` bullets. Frontmatter
 * `decisions[]` only carries the dimension slug + optional embedding. Warn
 * when a dimension appears in frontmatter but not the body (orphan slug) or
 * when a body block has no rationale at all.
 */
function checkDecisionPartition(
  fp: Expression,
  body: BodyData,
  issues: LintIssue[],
): void {
  const merged = fp.decisions ?? [];
  const bodyDims = new Set((body.decisions ?? []).map((d) => d.dimension));
  merged.forEach((d, idx) => {
    const hasProse = Boolean(d.decision?.trim());
    const fromBody = bodyDims.has(d.dimension);
    if (!fromBody) {
      issues.push({
        severity: "warning",
        rule: "orphan-dimension",
        message: `Decision \`${d.dimension}\` is declared in frontmatter but has no \`### ${d.dimension}\` block in the body.`,
        path: `decisions[${idx}]`,
      });
    } else if (!hasProse) {
      issues.push({
        severity: "warning",
        rule: "missing-rationale",
        message: `Body has \`### ${d.dimension}\` but no rationale prose.`,
        path: `decisions[${idx}]`,
      });
    }
  });
}

// Schema 5 allows `**Evidence:**` in the body — it's where evidence now lives.
// The lint check that used to flag it as legacy is retired.
function checkStrayEvidenceInBody(
  _bodyText: string,
  _issues: LintIssue[],
): void {
  // no-op; body evidence is canonical as of schema 5.
}

const HEX_RE = /#[0-9a-f]{3,8}\b/gi;

function checkEvidenceHexes(fp: Expression, issues: LintIssue[]): void {
  const paletteHexes = collectPaletteHexes(fp);
  if (paletteHexes.size === 0) return;

  const decisions = fp.decisions ?? [];
  decisions.forEach((d, di) => {
    d.evidence?.forEach((ev, ei) => {
      const hexes = ev.match(HEX_RE) ?? [];
      for (const hex of hexes) {
        const norm = hex.toLowerCase();
        if (!paletteHexes.has(norm)) {
          issues.push({
            severity: "warning",
            rule: "broken-evidence",
            message: `Evidence cites ${hex} but no matching palette entry exists.`,
            path: `decisions[${di}].evidence[${ei}]`,
          });
        }
      }
    });
  });
}

function checkUnusedPalette(fp: Expression, issues: LintIssue[]): void {
  const paletteHexes = collectPaletteHexes(fp);
  if (paletteHexes.size === 0) return;

  const evidenceText = (fp.decisions ?? [])
    .flatMap((d) => d.evidence ?? [])
    .join("\n")
    .toLowerCase();
  const decisionText = (fp.decisions ?? [])
    .map((d) => d.decision)
    .join("\n")
    .toLowerCase();
  const haystack = `${evidenceText}\n${decisionText}`;

  for (const hex of paletteHexes) {
    if (!haystack.includes(hex)) {
      issues.push({
        severity: "info",
        rule: "unused-palette",
        message: `Palette color ${hex} is not cited in any decision.`,
      });
    }
  }
}

function collectPaletteHexes(fp: Expression): Set<string> {
  const out = new Set<string>();
  for (const c of fp.palette?.dominant ?? []) out.add(c.value.toLowerCase());
  for (const c of fp.palette?.semantic ?? []) out.add(c.value.toLowerCase());
  for (const step of fp.palette?.neutrals?.steps ?? [])
    out.add(step.toLowerCase());
  return out;
}

/**
 * Role palette fields may reference named palette slots via `{palette.dominant.<role>}`
 * or `{palette.semantic.<role>}`. Flag references that don't resolve — the linter
 * catches renames in the palette that left a role pointing at nothing.
 */
const ROLE_PALETTE_FIELDS = ["background", "foreground", "border"] as const;

function checkRoleReferences(fp: Expression, issues: LintIssue[]): void {
  const roles = fp.roles ?? [];
  roles.forEach((role, ri) => {
    const palette = role.tokens?.palette;
    if (!palette) return;
    for (const field of ROLE_PALETTE_FIELDS) {
      const value = palette[field];
      if (!isTokenReference(value)) continue;
      const result = resolveTokenReference(fp, value);
      if (result.error) {
        issues.push({
          severity: "error",
          rule: "broken-role-reference",
          message: formatReferenceError(result.error),
          path: `roles[${ri}].tokens.palette.${field}`,
        });
      }
    }
  });
}
