import type {
  DesignDecision,
  DesignObservation,
  Expression,
} from "@ghost/core";
import { stringify as stringifyYaml } from "yaml";
import { EMBEDDING_FRAGMENT_FILENAME } from "./fragments.js";
import { type ExpressionMeta, mergeFrontmatter } from "./frontmatter.js";

export interface SerializeOptions {
  meta?: ExpressionMeta;
  /** Omit the human-readable body (frontmatter-only output). Default: false. */
  frontmatterOnly?: boolean;
  /**
   * Extract the embedding out of the frontmatter and append a body link
   * to a sibling `embedding.md`. Default: true for v4 output. Set to
   * false to keep the embedding inline (e.g. for in-memory round-trips
   * that don't emit sibling files).
   */
  extractEmbedding?: boolean;
}

/**
 * Serialize an Expression to an expression.md string.
 *
 * Contract: frontmatter and body own disjoint fields.
 *   • Frontmatter carries the machine-layer (id, tokens, dimension slugs,
 *     evidence, personality/resembles tags, embedding).
 *   • Body carries prose (# Character, # Decisions rationale).
 *
 * Each field has exactly one home — so there is no precedence rule and no
 * way for the two sides to drift.
 */
export function serializeExpression(
  expression: Expression,
  options: SerializeOptions = {},
): string {
  const meta: ExpressionMeta = { ...options.meta };
  const extractEmbedding = options.extractEmbedding ?? true;
  const forFrontmatter = extractEmbedding
    ? stripEmbedding(expression)
    : expression;
  const obj = mergeFrontmatter(forFrontmatter, meta);
  const yaml = stringifyYaml(obj, { lineWidth: 0 }).trimEnd();

  if (options.frontmatterOnly) {
    return `---\n${yaml}\n---\n`;
  }

  const body = buildBody(
    expression.observation,
    expression.decisions,
    extractEmbedding && (expression.embedding?.length ?? 0) > 0,
  );
  return body ? `---\n${yaml}\n---\n\n${body}\n` : `---\n${yaml}\n---\n`;
}

function stripEmbedding(fp: Expression): Expression {
  const { embedding: _dropped, ...rest } = fp;
  return rest as Expression;
}

function buildBody(
  observation: DesignObservation | undefined,
  decisions: DesignDecision[] | undefined,
  embeddingExtracted: boolean,
): string {
  const parts: string[] = [];
  if (observation?.summary?.trim()) {
    parts.push(`# Character\n\n${observation.summary.trim()}`);
  }
  if (decisions?.length) {
    const blocks = decisions
      .filter((d) => d.decision?.trim())
      .map(formatDecision)
      .join("\n\n");
    if (blocks) parts.push(`# Decisions\n\n${blocks}`);
  }
  if (embeddingExtracted) {
    // Mirrors the agent-skills pattern: the index references its siblings
    // via ordinary markdown links. Readers scan the body to discover fragments.
    parts.push(
      `# Fragments\n\n- [embedding](${EMBEDDING_FRAGMENT_FILENAME}) — 49-dim vector for compare/composite/viz`,
    );
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
