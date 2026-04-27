import type { Expression } from "@ghost/core";
import { parse as parseYaml } from "yaml";
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

/**
 * Flag palette colors that don't appear anywhere a reader could justify
 * them. The search covers three citation paths:
 *   1. Hex literal in a decision body's Evidence bullet text.
 *   2. Hex literal directly in a `roles[].tokens.palette.<slot>` field
 *      or in a `roles[].evidence` string.
 *   3. Slug-binding propagation: `roles[].tokens.palette.<slot>` carrying
 *      a `{palette.dominant.X}` / `{palette.semantic.X}` reference resolves
 *      through the palette to a hex, which counts as cited.
 *
 * Rationale: forcing every neutral step to be name-dropped in decision
 * prose was over-citing prose for no reader benefit. Role bindings are
 * the load-bearing place a hex earns its keep — and the propagation
 * makes named slots equivalent to inline hexes for citation purposes.
 */
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
  const roleText = collectRoleHexCitations(fp);
  const slugCitedHexes = collectSlugBoundHexes(fp);
  const haystack = `${evidenceText}\n${decisionText}\n${roleText}`;

  for (const hex of paletteHexes) {
    if (haystack.includes(hex)) continue;
    if (slugCitedHexes.has(hex)) continue;
    issues.push({
      severity: "info",
      rule: "unused-palette",
      message: `Palette color ${hex} is not cited in any decision or role binding.`,
    });
  }
}

/**
 * Collect every hex citation reachable from `roles[]`:
 *   - direct hex literals in `roles[].tokens.palette.<slot>` for any slot key
 *   - any hex that appears inline in a `roles[].evidence` bullet
 *
 * Returns one big lowercase string so the caller can run substring
 * checks against it. Local references (`{palette.dominant.accent}`) are
 * resolved separately by `collectSlugBoundHexes`.
 */
function collectRoleHexCitations(fp: Expression): string {
  const out: string[] = [];
  const HEX_LITERAL = /^#[0-9a-f]{3,8}$/i;
  for (const role of fp.roles ?? []) {
    const palette = role.tokens?.palette;
    if (palette) {
      for (const value of Object.values(palette)) {
        if (typeof value === "string" && HEX_LITERAL.test(value)) {
          out.push(value.toLowerCase());
        }
      }
    }
    for (const ev of role.evidence ?? []) {
      out.push(ev.toLowerCase());
    }
  }
  return out.join("\n");
}

/**
 * Walk `roles[].tokens.palette` for `{palette.dominant.X}` /
 * `{palette.semantic.X}` references and return the set of palette hexes
 * those references resolve to. Used by `unused-palette` so a hex cited
 * only via a slug binding still counts as used.
 *
 * Unresolvable references are silently skipped — the dedicated
 * `broken-role-reference` rule reports those.
 */
function collectSlugBoundHexes(fp: Expression): Set<string> {
  const out = new Set<string>();
  for (const role of fp.roles ?? []) {
    const palette = role.tokens?.palette;
    if (!palette) continue;
    for (const value of Object.values(palette)) {
      if (!isTokenReference(value)) continue;
      const result = resolveTokenReference(fp, value);
      if (result.value) {
        out.add(result.value.toLowerCase());
      }
    }
  }
  return out;
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
 * Role palette slots may reference named palette entries via
 * `{palette.dominant.<role>}` or `{palette.semantic.<role>}`, or
 * opaque external token refs (`{base.color.brand.x}`) for repos
 * that pull tokens from a Style-Dictionary-style pipeline.
 *
 * The slot vocabulary is open (Phase 5b) — any key the consumer
 * defines is walked. Local refs that don't resolve fire
 * `broken-role-reference`; external refs are accepted as opaque (see
 * `isExternalTokenReference`).
 */
function checkRoleReferences(fp: Expression, issues: LintIssue[]): void {
  const roles = fp.roles ?? [];
  roles.forEach((role, ri) => {
    const palette = role.tokens?.palette;
    if (!palette) return;
    for (const [field, value] of Object.entries(palette)) {
      if (!isTokenReference(value)) continue;
      // External token refs (Style-Dictionary-style namespaces) are
      // accepted as opaque — we can't resolve them without consulting
      // the upstream package, and the agent authored them deliberately.
      if (isExternalTokenReference(value)) continue;
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

/**
 * Heuristic for "this is a deliberately-opaque external token ref."
 * Returns true when the reference clearly targets a foreign namespace —
 * either it starts with a recognized Style-Dictionary-style head, or
 * it has 4+ dotted segments (deeper than local `palette.<bucket>.<role>`).
 *
 * Local refs (`{palette.dominant.accent}`, `{palette.semantic.error}`)
 * are NOT external — the caller resolves them against the palette and
 * fires `broken-role-reference` if they miss. References starting with
 * `palette.` but pointing at an unsupported sub-namespace are also
 * routed through the resolver so its `unsupported-namespace` error
 * surfaces properly.
 */
function isExternalTokenReference(value: string): boolean {
  const match = /^\{([^}]+)\}$/.exec(value);
  if (!match) return false;
  const path = match[1];
  const segments = path.split(".");
  // Anything in the local `palette.*` namespace is resolved locally,
  // even if the sub-namespace is wrong (the resolver's
  // `unsupported-namespace` error is the right diagnostic).
  if (segments[0] === "palette") return false;
  // External Style-Dictionary-style namespace heads — passthrough.
  const externalHeads = new Set([
    "base",
    "core",
    "semantic",
    "component",
    "tokens",
    "ref",
    "sys",
  ]);
  if (externalHeads.has(segments[0] ?? "")) return true;
  // Deeply-nested refs (4+ segments) — heuristic that this is a
  // pipeline-generated token, not a flat slug we should resolve.
  return segments.length >= 4;
}
