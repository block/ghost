import { stringify as stringifyYaml } from "yaml";
import type {
  DesignDecision,
  DesignFingerprint,
  DesignObservation,
  DesignValues,
} from "../types.js";
import { type ExpressionMeta, mergeFrontmatter } from "./frontmatter.js";
import { EXPRESSION_SCHEMA_VERSION } from "./schema.js";

export interface SerializeOptions {
  meta?: ExpressionMeta;
  /** Omit the human-readable body (frontmatter-only output). Default: false. */
  frontmatterOnly?: boolean;
}

/**
 * Serialize a DesignFingerprint to an expression.md string.
 *
 * Contract (schema 2): frontmatter is authoritative. Every field on the
 * fingerprint is emitted to YAML. The markdown body below the frontmatter
 * is a human-readable mirror of the narrative fields (Character, Signature,
 * Decisions, Values) — rendered for readers and LLM prompts, but never
 * consulted by parseExpression. If the body and frontmatter ever disagree,
 * the frontmatter wins.
 */
export function serializeExpression(
  fingerprint: DesignFingerprint,
  options: SerializeOptions = {},
): string {
  const meta: ExpressionMeta = {
    schema: EXPRESSION_SCHEMA_VERSION,
    ...options.meta,
  };
  const obj = mergeFrontmatter(fingerprint, meta);
  const yaml = stringifyYaml(obj, { lineWidth: 0 }).trimEnd();

  if (options.frontmatterOnly) {
    return `---\n${yaml}\n---\n`;
  }

  const body = buildBody(
    fingerprint.observation,
    fingerprint.decisions,
    fingerprint.values,
  );
  return body ? `---\n${yaml}\n---\n\n${body}\n` : `---\n${yaml}\n---\n`;
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
