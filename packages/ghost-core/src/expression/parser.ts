import { parse as parseYaml } from "yaml";
import type { DesignFingerprint } from "../types.js";
import { type BodyData, parseBody } from "./body.js";
import { type ExpressionMeta, splitFrontmatter } from "./frontmatter.js";
import { EXPRESSION_SCHEMA_VERSION, validateFrontmatter } from "./schema.js";

export interface ParsedExpression {
  fingerprint: DesignFingerprint;
  meta: ExpressionMeta;
  /** Parsed body content. Informational only — the frontmatter is authoritative. */
  body: BodyData;
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
 * Contract (schema 2): frontmatter is authoritative. Every field on the
 * returned fingerprint comes from the YAML. The body is parsed into BodyData
 * for downstream tooling (lint, diff) but is NEVER merged into the
 * fingerprint. If the body says one thing and the frontmatter another, the
 * frontmatter wins.
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
  return { fingerprint, meta, body };
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
