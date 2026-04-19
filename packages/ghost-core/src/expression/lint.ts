import { parse as parseYaml } from "yaml";
import type { DesignFingerprint } from "../types.js";
import type { BodyData } from "./body.js";
import { parseExpression, splitRaw } from "./parser.js";
import { EXPRESSION_SCHEMA_VERSION, FrontmatterSchema } from "./schema.js";

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
 * Lint an expression.md string for schema correctness, body/frontmatter
 * drift, and soft-content quality issues. Unlike parseExpression, this
 * never throws — every problem surfaces as a structured issue.
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

  const { fingerprint, body } = parsed;
  const rawYaml = toRawFrontmatter(raw);

  checkSchemaVersion(rawYaml, rawIssues);
  checkSchemaValidity(rawYaml, rawIssues);
  checkBodyFrontmatterSync(fingerprint, body, rawIssues);
  checkEvidenceHexes(fingerprint, rawIssues);
  checkUnusedPalette(fingerprint, rawIssues);

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

function checkSchemaVersion(
  raw: Record<string, unknown>,
  issues: LintIssue[],
): void {
  const v = raw.schema;
  if (v === undefined) {
    issues.push({
      severity: "warning",
      rule: "schema-version-missing",
      message: `Missing \`schema:\` field. Add \`schema: ${EXPRESSION_SCHEMA_VERSION}\` to the frontmatter.`,
      path: "schema",
    });
    return;
  }
  if (v !== EXPRESSION_SCHEMA_VERSION) {
    issues.push({
      severity: "error",
      rule: "schema-version-mismatch",
      message: `Schema version ${String(v)} is no longer supported. Expected ${EXPRESSION_SCHEMA_VERSION}.`,
      path: "schema",
    });
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

function checkBodyFrontmatterSync(
  fp: DesignFingerprint,
  body: BodyData,
  issues: LintIssue[],
): void {
  const hasSummary = Boolean(fp.observation?.summary?.trim());
  if (hasSummary && !body.character?.trim()) {
    issues.push({
      severity: "warning",
      rule: "body-sync",
      message:
        "Frontmatter has observation.summary but body is missing `# Character`. The body is the human-readable mirror — regenerate or add it.",
      path: "observation.summary",
    });
  }

  const fpTraits = fp.observation?.distinctiveTraits ?? [];
  const bodyTraits = body.signature ?? [];
  if (fpTraits.length && bodyTraits.length === 0) {
    issues.push({
      severity: "warning",
      rule: "body-sync",
      message:
        "Frontmatter has distinctiveTraits but body is missing `# Signature` bullets.",
      path: "observation.distinctiveTraits",
    });
  }

  const fpDecisions = fp.decisions ?? [];
  const bodyDecisions = body.decisions ?? [];
  if (fpDecisions.length && bodyDecisions.length === 0) {
    issues.push({
      severity: "warning",
      rule: "body-sync",
      message:
        "Frontmatter has decisions but body is missing `# Decisions` blocks.",
      path: "decisions",
    });
  }

  const fpValues = fp.values;
  if (
    fpValues &&
    (fpValues.do.length > 0 || fpValues.dont.length > 0) &&
    !body.values
  ) {
    issues.push({
      severity: "warning",
      rule: "body-sync",
      message:
        "Frontmatter has values but body is missing `# Values` Do/Don't lists.",
      path: "values",
    });
  }
}

const HEX_RE = /#[0-9a-f]{3,8}\b/gi;

function checkEvidenceHexes(fp: DesignFingerprint, issues: LintIssue[]): void {
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

function checkUnusedPalette(fp: DesignFingerprint, issues: LintIssue[]): void {
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

function collectPaletteHexes(fp: DesignFingerprint): Set<string> {
  const out = new Set<string>();
  for (const c of fp.palette?.dominant ?? []) out.add(c.value.toLowerCase());
  for (const c of fp.palette?.semantic ?? []) out.add(c.value.toLowerCase());
  for (const step of fp.palette?.neutrals?.steps ?? [])
    out.add(step.toLowerCase());
  return out;
}
