import { stringify as stringifyYaml } from "yaml";
import type {
  DesignDecision,
  DesignFingerprint,
  DesignObservation,
  DesignValues,
} from "../types.js";
import { type ExpressionMeta, mergeFrontmatter } from "./frontmatter.js";

export interface SerializeOptions {
  meta?: ExpressionMeta;
}

/**
 * Serialize a DesignFingerprint to an expression.md string.
 *
 * Fields split:
 * - Frontmatter: id, source, timestamp, sources, palette, spacing,
 *   typography, surfaces, embedding, and residual observation fields
 *   (personality, closestSystems).
 * - Body: Character (observation.summary), Signature (distinctiveTraits),
 *   Decisions (dimension + decision + evidence).
 *
 * The body is authoritative on read for summary/distinctiveTraits/decisions;
 * the writer therefore emits those fields only in the body to keep the
 * frontmatter diff-friendly.
 */
export function serializeExpression(
  fingerprint: DesignFingerprint,
  options: SerializeOptions = {},
): string {
  const { observation, decisions, values, ...core } = fingerprint;
  const residualObservation = stripBodyFields(observation);

  const forFrontmatter: DesignFingerprint = {
    ...(core as DesignFingerprint),
    ...(residualObservation ? { observation: residualObservation } : {}),
  };

  const obj = mergeFrontmatter(forFrontmatter, options.meta);
  const yaml = stringifyYaml(obj, { lineWidth: 0 }).trimEnd();
  const body = buildBody(observation, decisions, values);

  const out = body ? `---\n${yaml}\n---\n\n${body}\n` : `---\n${yaml}\n---\n`;
  return out;
}

/** Return observation with summary+distinctiveTraits removed, or undefined if empty. */
function stripBodyFields(
  obs: DesignObservation | undefined,
): DesignObservation | undefined {
  if (!obs) return undefined;
  const personality = obs.personality ?? [];
  const closestSystems = obs.closestSystems ?? [];
  if (personality.length === 0 && closestSystems.length === 0) return undefined;
  return {
    summary: "",
    personality,
    distinctiveTraits: [],
    closestSystems,
  };
}

function buildBody(
  observation: DesignObservation | undefined,
  decisions: DesignDecision[] | undefined,
  values: DesignValues | undefined,
): string {
  const parts: string[] = [];
  if (observation?.summary?.trim()) {
    parts.push(`# Character\n\n${observation.summary.trim()}`);
  }
  if (observation?.distinctiveTraits?.length) {
    const bullets = observation.distinctiveTraits
      .map((t) => `- ${t}`)
      .join("\n");
    parts.push(`# Signature\n\n${bullets}`);
  }
  if (decisions?.length) {
    const blocks = decisions.map(formatDecision).join("\n\n");
    parts.push(`# Decisions\n\n${blocks}`);
  }
  if (values && (values.do.length > 0 || values.dont.length > 0)) {
    const doBlock = values.do.length
      ? `## Do\n${values.do.map((v) => `- ${v}`).join("\n")}`
      : "";
    const dontBlock = values.dont.length
      ? `## Don't\n${values.dont.map((v) => `- ${v}`).join("\n")}`
      : "";
    const section = [doBlock, dontBlock].filter(Boolean).join("\n\n");
    parts.push(`# Values\n\n${section}`);
  }
  return parts.join("\n\n");
}

function formatDecision(d: DesignDecision): string {
  const title = unslug(d.dimension);
  const header = `### ${title}`;
  const prose = d.decision.trim();
  if (!d.evidence?.length) {
    return `${header}\n${prose}`;
  }
  const evidence = d.evidence.map((e) => `- ${e}`).join("\n");
  return `${header}\n${prose}\n\n**Evidence:**\n${evidence}`;
}

function unslug(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
