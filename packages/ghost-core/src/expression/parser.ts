import { parse as parseYaml } from "yaml";
import type {
  DesignDecision,
  DesignFingerprint,
  DesignObservation,
} from "../types.js";
import { type BodyData, parseBody } from "./body.js";
import { type ExpressionMeta, splitFrontmatter } from "./frontmatter.js";
import { EXPRESSION_SCHEMA_VERSION, validateFrontmatter } from "./schema.js";

export interface ParsedExpression {
  fingerprint: DesignFingerprint;
  meta: ExpressionMeta;
  /**
   * Structured view of the body as it was read from disk. Kept for lint
   * tooling that wants to check orphan prose or missing rationale against
   * the frontmatter machine-layer.
   */
  body: BodyData;
  /**
   * The raw markdown body (everything after the frontmatter). Surfaced so
   * the loader can scan for fragment links (e.g. `[embedding](embedding.md)`)
   * without re-reading the file.
   */
  bodyRaw: string;
}

export interface ParseOptions {
  /**
   * Skip zod validation of the frontmatter. Only useful for tools that want
   * to read partial or in-progress expression files (e.g. lint). Default: false.
   */
  skipValidation?: boolean;
}

/**
 * Split a raw expression.md string into its YAML frontmatter and markdown body.
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
  // Skip leading blank lines so an expression.md with a BOM / stray newline
  // before `---` still parses.
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || !isDelimiter(lines[i])) {
    throw new Error(
      "Expression is missing a YAML frontmatter block (--- … ---).",
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
      "Expression frontmatter is unterminated — missing closing `---`.",
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
 * Parse a raw expression.md string into a DesignFingerprint plus metadata and
 * structured body.
 *
 * Contract (schema 3): frontmatter and body own disjoint fields.
 *   • Frontmatter owns machine-facts: id, tokens, dimension slugs, evidence,
 *     personality/closestSystems tags, embedding.
 *   • Body owns prose: `# Character` → summary, `# Signature` → distinctive
 *     traits, `### dimension` → decision rationale, `# Values` → Do/Don't.
 *
 * The returned fingerprint unions both sources. Since the two sides never
 * carry the same field, there is no precedence rule — each field has one
 * home.
 *
 * Parse-time checks (unless `skipValidation`):
 *   1. Schema version gate — rejects non-matching `schema:` values.
 *   2. Zod validation — throws a readable error listing bad fields.
 */
export function parseExpression(
  raw: string,
  options: ParseOptions = {},
): ParsedExpression {
  const { frontmatter, body: bodyText } = splitRaw(raw);
  const yamlObj = (parseYaml(frontmatter) ?? {}) as Record<string, unknown>;

  if (!options.skipValidation) {
    checkSchemaVersion(yamlObj);
    // Files that extend a parent may omit fields they inherit. Final
    // validation happens after extends resolution (see loadExpression).
    const partial = typeof yamlObj.extends === "string";
    validateFrontmatter(yamlObj, { partial });
  }

  const { meta, fingerprint } = splitFrontmatter(yamlObj);
  const body = parseBody(bodyText);
  const merged = applyBody(fingerprint, body);
  return { fingerprint: merged, meta, body, bodyRaw: bodyText };
}

/**
 * Fold body-owned prose fields into the fingerprint. The body provides
 * Character/Signature prose for `observation`, rationale for `decisions`
 * (keyed by dimension), and `# Values`. Frontmatter-only dimensions keep
 * their evidence but get no body prose (decision text left empty).
 */
export function applyBody(
  fp: DesignFingerprint,
  body: BodyData,
): DesignFingerprint {
  const observation = mergeObservation(fp.observation, body);
  const decisions = mergeDecisions(fp.decisions, body.decisions ?? []);
  const values = body.values ?? fp.values;

  const out: DesignFingerprint = { ...fp };
  if (observation) out.observation = observation;
  else delete out.observation;
  if (decisions?.length) out.decisions = decisions;
  else delete out.decisions;
  if (values && (values.do.length || values.dont.length)) out.values = values;
  else delete out.values;
  return out;
}

function mergeObservation(
  yamlObs: DesignObservation | undefined,
  body: BodyData,
): DesignObservation | undefined {
  const summary = body.character?.trim() ?? "";
  const distinctiveTraits = body.signature ?? [];
  const personality = yamlObs?.personality ?? [];
  const closestSystems = yamlObs?.closestSystems ?? [];
  if (
    !summary &&
    distinctiveTraits.length === 0 &&
    personality.length === 0 &&
    closestSystems.length === 0
  ) {
    return undefined;
  }
  return { summary, personality, distinctiveTraits, closestSystems };
}

/**
 * Merge the frontmatter decision skeletons (dimension + evidence) with the
 * body's rationale (prose keyed by `### dimension`). Frontmatter order wins;
 * body-only decisions append at the end.
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
      evidence: y.evidence ?? [],
      ...(y.embedding ? { embedding: y.embedding } : {}),
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

function checkSchemaVersion(raw: Record<string, unknown>): void {
  const v = raw.schema;
  if (v === undefined) return; // tolerate omission; zod will catch missing required fields
  if (v !== EXPRESSION_SCHEMA_VERSION) {
    throw new Error(
      `Expression schema version mismatch: file declares schema: ${String(v)}, reader expects schema: ${EXPRESSION_SCHEMA_VERSION}. Re-generate with \`ghost profile . --emit\`.`,
    );
  }
}
