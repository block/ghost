import type { DesignFingerprint } from "../types.js";

/**
 * Expression-level metadata — lives in the frontmatter alongside the
 * machine-layer of DesignFingerprint but is not part of the fingerprint.
 */
export interface ExpressionMeta {
  name?: string;
  slug?: string;
  schema?: number;
  generator?: string;
  confidence?: number;
  /** Path to a parent expression.md to inherit from. Resolved by loadExpression. */
  extends?: string;
  /**
   * Loose passthrough bag for LLM-authored extensions that don't fit the
   * strict structural blocks. Opaque to comparisons — never feeds the
   * embedding. Typical use: `{ tone: "magazine", era: "2020s-editorial" }`.
   */
  metadata?: Record<string, unknown>;
}

export interface FrontmatterData {
  meta: ExpressionMeta;
  fingerprint: DesignFingerprint;
}

/**
 * DesignFingerprint fields that are populated from YAML frontmatter. Prose
 * fields (observation.summary, observation.distinctiveTraits, decisions[].decision,
 * values) are populated from the markdown body by `applyBody` — they are
 * deliberately NOT listed here.
 */
const FINGERPRINT_KEYS = new Set<keyof DesignFingerprint>([
  "id",
  "source",
  "timestamp",
  "sources",
  "observation",
  "decisions",
  "palette",
  "spacing",
  "typography",
  "surfaces",
  "embedding",
]);

/**
 * Split a frontmatter object into the DesignFingerprint proper
 * and expression-level metadata (name, slug, etc.).
 */
export function splitFrontmatter(
  raw: Record<string, unknown>,
): FrontmatterData {
  const meta: ExpressionMeta = {};
  const fp: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(raw)) {
    if (FINGERPRINT_KEYS.has(k as keyof DesignFingerprint)) {
      fp[k] = v;
    } else if (
      k === "name" ||
      k === "slug" ||
      k === "generator" ||
      k === "extends"
    ) {
      meta[k] = v as string;
    } else if (k === "schema" || k === "confidence") {
      meta[k] = v as number;
    } else if (k === "metadata" && v && typeof v === "object") {
      meta.metadata = v as Record<string, unknown>;
    } else if (k === "generated" && typeof v === "string" && !fp.timestamp) {
      // Accept `generated:` as a friendly alias for `timestamp`
      fp.timestamp = v;
    }
    // Unknown keys silently ignored (zod strict catches them upstream).
  }

  if (!fp.id && meta.slug) fp.id = meta.slug;
  if (!fp.timestamp) fp.timestamp = new Date().toISOString();
  if (!fp.source) fp.source = "unknown";

  return {
    meta,
    fingerprint: fp as unknown as DesignFingerprint,
  };
}

/**
 * Build a plain object for YAML serialization from a fingerprint + meta.
 * Meta comes first for readability; then fingerprint fields, with prose
 * fields stripped — those belong in the markdown body.
 */
export function mergeFrontmatter(
  fingerprint: DesignFingerprint,
  meta: ExpressionMeta = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (meta.name) out.name = meta.name;
  if (meta.slug) out.slug = meta.slug;
  if (meta.schema !== undefined) out.schema = meta.schema;
  if (meta.generator) out.generator = meta.generator;
  if (meta.confidence !== undefined) out.confidence = meta.confidence;
  if (meta.metadata && Object.keys(meta.metadata).length > 0) {
    out.metadata = meta.metadata;
  }

  const ordered: (keyof DesignFingerprint)[] = [
    "id",
    "source",
    "timestamp",
    "sources",
    "observation",
    "decisions",
    "palette",
    "spacing",
    "typography",
    "surfaces",
    "embedding",
  ];
  for (const key of ordered) {
    const v = fingerprint[key];
    if (v === undefined) continue;
    if (key === "observation") {
      const stripped = stripObservationProse(
        v as DesignFingerprint["observation"],
      );
      if (stripped) out.observation = stripped;
    } else if (key === "decisions") {
      const stripped = stripDecisionProse(v as DesignFingerprint["decisions"]);
      if (stripped?.length) out.decisions = stripped;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function stripObservationProse(
  obs: DesignFingerprint["observation"],
): Record<string, unknown> | undefined {
  if (!obs) return undefined;
  const out: Record<string, unknown> = {};
  if (obs.personality?.length) out.personality = obs.personality;
  if (obs.closestSystems?.length) out.closestSystems = obs.closestSystems;
  return Object.keys(out).length ? out : undefined;
}

function stripDecisionProse(
  decisions: DesignFingerprint["decisions"],
): Array<Record<string, unknown>> | undefined {
  if (!decisions?.length) return undefined;
  return decisions.map((d) => {
    const out: Record<string, unknown> = {
      dimension: d.dimension,
      evidence: d.evidence ?? [],
    };
    if (d.embedding) out.embedding = d.embedding;
    return out;
  });
}
