import type {
  DesignDecision,
  DesignObservation,
  Expression,
} from "@ghost/core";
import { stringify as stringifyYaml } from "yaml";
import { type ExpressionMeta, mergeFrontmatter } from "./frontmatter.js";

export interface SerializeOptions {
  meta?: ExpressionMeta;
  /** Omit the human-readable body (frontmatter-only output). Default: false. */
  frontmatterOnly?: boolean;
}

/**
 * Serialize an Expression to an expression.md string.
 *
 * Contract: frontmatter and body own disjoint fields.
 *   • Frontmatter carries the machine-layer (id, tokens, dimension slugs,
 *     personality/resembles tags, references, checks, compact values).
 *   • Body carries prose (# Character, # Signature, # Decisions rationale).
 *
 * Each field has exactly one home — so there is no precedence rule and no
 * way for the two sides to drift.
 */
export function serializeExpression(
  expression: Expression,
  options: SerializeOptions = {},
): string {
  const meta: ExpressionMeta = { ...options.meta };
  const obj = mergeFrontmatter(expression, meta);
  const yaml = stringifyYaml(obj, { lineWidth: 0 }).trimEnd();

  if (options.frontmatterOnly) {
    return `---\n${yaml}\n---\n`;
  }

  const body = buildBody(
    expression.observation,
    expression.signature,
    expression.decisions,
  );
  return body ? `---\n${yaml}\n---\n\n${body}\n` : `---\n${yaml}\n---\n`;
}

function buildBody(
  observation: DesignObservation | undefined,
  signature: string | undefined,
  decisions: DesignDecision[] | undefined,
): string {
  const parts: string[] = [];
  if (observation?.summary?.trim()) {
    parts.push(`# Character\n\n${observation.summary.trim()}`);
  }
  if (signature?.trim()) {
    parts.push(`# Signature\n\n${signature.trim()}`);
  }
  if (decisions?.length) {
    const blocks = decisions
      .filter((d) => d.decision?.trim())
      .map(formatDecision)
      .join("\n\n");
    if (blocks) parts.push(`# Decisions\n\n${blocks}`);
  }
  return parts.join("\n\n");
}

/**
 * Body carries the full per-dimension story: rationale prose followed by an
 * `**Evidence:**` bullet list (schema 5). Each evidence string becomes one
 * bullet, wrapped in backticks so token-name citations render as code.
 * Evidence is skipped entirely when empty.
 */
function formatDecision(d: DesignDecision): string {
  const title = unslug(d.dimension);
  const prose = d.decision.trim();
  const evidence = d.evidence?.filter((e) => e?.trim()) ?? [];
  if (!evidence.length) return `### ${title}\n${prose}`;
  const bullets = evidence.map((e) => `- ${fenceEvidence(e)}`).join("\n");
  return `### ${title}\n${prose}\n\n**Evidence:**\n${bullets}`;
}

/** Wrap evidence strings in backticks when they aren't already fenced. */
function fenceEvidence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("`") && trimmed.endsWith("`")) return trimmed;
  return `\`${trimmed.replace(/`/g, "\\`")}\``;
}

function unslug(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
