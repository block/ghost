import { parse as parseYaml } from "yaml";
import type { DesignFingerprint } from "../types.js";
import { applyObservation, type BodyData, parseBody } from "./body.js";
import { type ExpressionMeta, splitFrontmatter } from "./frontmatter.js";

export interface ParsedExpression {
  fingerprint: DesignFingerprint;
  meta: ExpressionMeta;
  body: BodyData;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Split a raw expression.md string into its YAML frontmatter and markdown body.
 * Throws if the frontmatter block is missing.
 */
export function splitRaw(raw: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) {
    throw new Error(
      "Expression is missing a YAML frontmatter block (--- … ---).",
    );
  }
  return { frontmatter: match[1], body: match[2] };
}

/**
 * Parse a raw expression.md string into a DesignFingerprint plus metadata and
 * structured body. The body's Character → observation.summary and
 * Signature → observation.distinctiveTraits are merged into the fingerprint.
 */
export function parseExpression(raw: string): ParsedExpression {
  const { frontmatter, body: bodyText } = splitRaw(raw);
  const yamlObj = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;
  const { meta, fingerprint } = splitFrontmatter(yamlObj);
  const body = parseBody(bodyText);

  // Body-sourced observation overrides/fills what the frontmatter didn't carry
  const observation = applyObservation(body, fingerprint.observation);
  if (observation) fingerprint.observation = observation;

  // Prefer body decisions when the frontmatter didn't include them
  if (!fingerprint.decisions && body.decisions?.length) {
    fingerprint.decisions = body.decisions;
  }

  // Surface Do/Don't stance from the body onto the fingerprint
  if (!fingerprint.values && body.values) {
    const { do: dos, dont } = body.values;
    if (dos.length > 0 || dont.length > 0) {
      fingerprint.values = { do: dos, dont };
    }
  }

  return { fingerprint, meta, body };
}
