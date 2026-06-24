import type { Fingerprint } from "#ghost-core";

/**
 * Fingerprint-level metadata — lives in the frontmatter alongside the
 * machine-layer of Fingerprint but is not part of the structured content.
 */
export interface FingerprintMeta {
  name?: string;
  slug?: string;
  generator?: string;
  confidence?: number;
  /** Path to a base fingerprint.md to inherit from. Resolved by loadFingerprint. */
  extends?: string;
  /**
   * Loose passthrough bag for LLM-authored extensions that don't fit the
   * strict structural blocks. Opaque to comparisons — never feeds the
   * embedding. Typical use: `{ tone: "magazine", era: "2020s-editorial" }`.
   */
  metadata?: Record<string, unknown>;
}

export interface FrontmatterData {
  meta: FingerprintMeta;
  fingerprint: Fingerprint;
}

/**
 * Fingerprint fields that are populated from YAML frontmatter. Intent
 * fields (observation.summary, decisions[].decision) are populated from
 * the markdown body by `applyBody` — they are deliberately NOT listed
 * here.
 */
const FINGERPRINT_KEYS = new Set<keyof Fingerprint>([
  "id",
  "source",
  "timestamp",
  "sources",
  "references",
  "observation",
  "decisions",
  "palette",
  "spacing",
  "typography",
  "surfaces",
]);

/**
 * Split a frontmatter object into the Fingerprint proper
 * and fingerprint-level metadata (name, slug, etc.).
 */
export function splitFrontmatter(
  raw: Record<string, unknown>,
): FrontmatterData {
  const meta: FingerprintMeta = {};
  const fp: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(raw)) {
    if (FINGERPRINT_KEYS.has(k as keyof Fingerprint)) {
      fp[k] = v;
    } else if (
      k === "name" ||
      k === "slug" ||
      k === "generator" ||
      k === "extends"
    ) {
      meta[k] = v as string;
    } else if (k === "confidence") {
      meta.confidence = v as number;
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
    fingerprint: fp as unknown as Fingerprint,
  };
}

/**
 * Build a plain object for YAML serialization from a fingerprint + meta.
 * Meta comes first for readability; then fingerprint fields, with intent
 * fields stripped — those belong in the markdown body.
 */
export function mergeFrontmatter(
  fingerprint: Fingerprint,
  meta: FingerprintMeta = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (meta.name) out.name = meta.name;
  if (meta.slug) out.slug = meta.slug;
  if (meta.generator) out.generator = meta.generator;
  if (meta.confidence !== undefined) out.confidence = meta.confidence;
  if (meta.metadata && Object.keys(meta.metadata).length > 0) {
    out.metadata = meta.metadata;
  }

  const ordered: (keyof Fingerprint)[] = [
    "id",
    "source",
    "timestamp",
    "sources",
    "references",
    "observation",
    "decisions",
    "palette",
    "spacing",
    "typography",
    "surfaces",
  ];
  for (const key of ordered) {
    const v = fingerprint[key];
    if (v === undefined) continue;
    if (key === "observation") {
      const stripped = stripObservationIntent(v as Fingerprint["observation"]);
      if (stripped) out.observation = stripped;
    } else if (key === "decisions") {
      const stripped = stripDecisionIntent(v as Fingerprint["decisions"]);
      if (stripped?.length) out.decisions = stripped;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function stripObservationIntent(
  obs: Fingerprint["observation"],
): Record<string, unknown> | undefined {
  if (!obs) return undefined;
  const out: Record<string, unknown> = {};
  if (obs.personality?.length) out.personality = obs.personality;
  if (obs.resembles?.length) out.resembles = obs.resembles;
  return Object.keys(out).length ? out : undefined;
}

function stripDecisionIntent(
  decisions: Fingerprint["decisions"],
): Array<Record<string, unknown>> | undefined {
  if (!decisions?.length) return undefined;
  return decisions.map((d) => {
    const out: Record<string, unknown> = { dimension: d.dimension };
    if (d.dimension_kind) out.dimension_kind = d.dimension_kind;
    return out;
  });
}
