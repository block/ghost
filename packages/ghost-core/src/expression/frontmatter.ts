import type { DesignFingerprint } from "../types.js";

/**
 * Frontmatter shape. Mirrors DesignFingerprint 1:1 so round-trip is lossless.
 * Fields outside the DesignFingerprint type (name, slug, generator, confidence)
 * are metadata for humans/catalogs and are preserved on the wrapper.
 */
export interface ExpressionMeta {
  name?: string;
  slug?: string;
  schema?: number;
  generator?: string;
  confidence?: number;
}

export interface FrontmatterData {
  meta: ExpressionMeta;
  fingerprint: DesignFingerprint;
}

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
    } else if (k === "name" || k === "slug" || k === "generator") {
      meta[k] = v as string;
    } else if (k === "schema" || k === "confidence") {
      meta[k] = v as number;
    } else if (k === "generated" && typeof v === "string" && !fp.timestamp) {
      // Accept `generated:` as a friendly alias for `timestamp`
      fp.timestamp = v;
    }
    // Unknown keys silently ignored; body/frontmatter schema is open.
  }

  if (!fp.id && meta.slug) fp.id = meta.slug;
  if (!fp.timestamp) fp.timestamp = new Date().toISOString();
  if (!fp.source) fp.source = "llm";

  return {
    meta,
    fingerprint: fp as unknown as DesignFingerprint,
  };
}

/**
 * Build a plain object for YAML serialization from a fingerprint + meta.
 * Meta comes first for readability, then the DesignFingerprint fields.
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

  // Spread fingerprint fields in stable order
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
    if (v !== undefined) out[key] = v;
  }
  return out;
}
