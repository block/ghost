import { parse as parseYaml } from "yaml";
import type {
  DesignDecision,
  DesignObservation,
  Fingerprint,
} from "#ghost-core";
import { type BodyData, parseBody } from "./body.js";
import { type FingerprintMeta, splitFrontmatter } from "./frontmatter.js";
import { validateFrontmatter } from "./schema.js";

export interface ParsedFingerprint {
  fingerprint: Fingerprint;
  meta: FingerprintMeta;
  /**
   * Structured view of the body as it was read from disk. Kept for lint
   * tooling that wants to check orphan intent or missing rationale against
   * the frontmatter machine-layer.
   */
  body: BodyData;
  /**
   * The raw markdown body (everything after the frontmatter). Surfaced for
   * layout/lint tooling that needs the source text.
   */
  bodyRaw: string;
}

export interface ParseOptions {
  /**
   * Skip zod validation of the frontmatter. Only useful for tools that want
   * to read partial or in-progress fingerprint files (e.g. lint). Default: false.
   */
  skipValidation?: boolean;
}

/**
 * Split a raw fingerprint.md string into its YAML frontmatter and markdown body.
 *
 * A frontmatter block is delimited by two lines that are *exactly* `---`
 * (trailing whitespace tolerated). The opening delimiter must be the first
 * non-empty line of the file. This line-oriented scan is robust against
 * `---` appearing inside a YAML block scalar — indented `---` is part of
 * the scalar, not a delimiter.
 *
 * Throws if the frontmatter block is missing or unterminated.
 */
export function splitRaw(raw: string): { frontmatter: string; body: string } {
  const lines = raw.split(/\r?\n/);
  let i = 0;
  // Skip leading blank lines so a fingerprint.md with a BOM / stray newline
  // before `---` still parses.
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || !isDelimiter(lines[i])) {
    throw new Error(
      "Fingerprint is missing a YAML frontmatter block (--- … ---).",
    );
  }
  const startOfYaml = i + 1;
  let endOfYaml = -1;
  for (let j = startOfYaml; j < lines.length; j++) {
    if (isDelimiter(lines[j])) {
      endOfYaml = j;
      break;
    }
  }
  if (endOfYaml === -1) {
    throw new Error(
      "Fingerprint frontmatter is unterminated — missing closing `---`.",
    );
  }
  const frontmatter = lines.slice(startOfYaml, endOfYaml).join("\n");
  const body = lines.slice(endOfYaml + 1).join("\n");
  return { frontmatter, body };
}

function isDelimiter(line: string): boolean {
  return /^---\s*$/.test(line);
}

/**
 * Parse a raw fingerprint.md string into a Fingerprint plus metadata and
 * structured body.
 *
 * Contract: frontmatter and body own disjoint fields.
 *   • Frontmatter owns machine-facts: id, tokens, dimension slugs,
 *     personality/resembles tags, references, checks, and compact values.
 *   • Body owns intent: `# Character` → summary, `# Signature` →
 *     recognizable output posture, `### dimension` → decision rationale.
 *
 * The returned fingerprint unions both sources. Since the two sides never
 * carry the same field, there is no precedence rule — each field has one
 * home.
 *
 * Parse-time check (unless `skipValidation`): zod validation — throws a
 * readable error listing bad fields.
 */
export function parseFingerprint(
  raw: string,
  options: ParseOptions = {},
): ParsedFingerprint {
  const { frontmatter, body: bodyText } = splitRaw(raw);
  const yamlObj = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;

  if (!options.skipValidation) {
    // Files that extend a base fingerprint may omit fields they inherit. Final
    // validation happens after extends resolution (see loadFingerprint).
    const partial = typeof yamlObj.extends === "string";
    validateFrontmatter(yamlObj, { partial });
  }

  const { meta, fingerprint } = splitFrontmatter(yamlObj);
  const body = parseBody(bodyText);
  const merged = applyBody(fingerprint, body);
  return { fingerprint: merged, meta, body, bodyRaw: bodyText };
}

/**
 * Fold body-owned intent fields into the fingerprint. The body provides
 * Character intent for `observation`, Signature intent for `signature`, and
 * rationale for `decisions` (keyed by dimension). Frontmatter-only
 * dimensions keep their evidence but get no body intent (decision text left
 * empty).
 */
export function applyBody(fp: Fingerprint, body: BodyData): Fingerprint {
  const observation = mergeObservation(fp.observation, body);
  const decisions = mergeDecisions(fp.decisions, body.decisions ?? []);

  const out: Fingerprint = { ...fp };
  if (observation) out.observation = observation;
  else delete out.observation;
  if (body.signature?.trim()) out.signature = body.signature.trim();
  else delete out.signature;
  if (decisions?.length) out.decisions = decisions;
  else delete out.decisions;
  return out;
}

function mergeObservation(
  yamlObs: DesignObservation | undefined,
  body: BodyData,
): DesignObservation | undefined {
  const summary = body.character?.trim() ?? "";
  const personality = yamlObs?.personality ?? [];
  const resembles = yamlObs?.resembles ?? [];
  if (!summary && personality.length === 0 && resembles.length === 0) {
    return undefined;
  }
  return { summary, personality, resembles };
}

/**
 * Merge the frontmatter decision skeletons (dimension + optional kind) with
 * the body's rationale and evidence (keyed by `### dimension`).
 * Frontmatter order wins; body-only decisions append at the end.
 *
 * Evidence comes from the body. Runtime decision embeddings are derived, not
 * read from `fingerprint.md`.
 */
function mergeDecisions(
  fromYaml: DesignDecision[] | undefined,
  fromBody: DesignDecision[],
): DesignDecision[] | undefined {
  const hasYaml = (fromYaml?.length ?? 0) > 0;
  const hasBody = fromBody.length > 0;
  if (!hasYaml && !hasBody) return undefined;

  const bodyByDim = new Map(fromBody.map((d) => [d.dimension, d]));
  const seen = new Set<string>();
  const out: DesignDecision[] = [];

  for (const y of fromYaml ?? []) {
    seen.add(y.dimension);
    const b = bodyByDim.get(y.dimension);
    out.push({
      dimension: y.dimension,
      decision: b?.decision ?? "",
      evidence: b?.evidence ?? [],
      ...(y.dimension_kind ? { dimension_kind: y.dimension_kind } : {}),
    });
  }
  for (const b of fromBody) {
    if (seen.has(b.dimension)) continue;
    out.push({
      dimension: b.dimension,
      decision: b.decision,
      evidence: b.evidence ?? [],
    });
  }
  return out;
}
