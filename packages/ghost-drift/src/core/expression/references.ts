import type { Expression } from "@ghost/core";

/**
 * Role token reference syntax: `{palette.dominant.<role>}` or
 * `{palette.semantic.<role>}`. Lets a role bind its palette to a named
 * palette slot instead of a raw hex — renames cascade, and the linter
 * can flag a role pointing at a palette entry that no longer exists.
 *
 * Only the named palette slots are referenceable in v1. Positional
 * inventories (neutrals.steps, typography.sizeRamp, spacing.scale,
 * surfaces.borderRadii) have no names to point at, so role tokens for
 * those dimensions stay raw.
 */

/** Matches `{namespace.role}` where namespace contains one or more segments. */
const REFERENCE_RE = /^\{([a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+)\}$/i;

export interface ParsedTokenReference {
  /** Full reference string, e.g. `palette.dominant.accent`. */
  path: string;
  /** Namespace segment, e.g. `palette.dominant`. */
  namespace: string;
  /** Terminal segment — the role name to look up. */
  role: string;
}

/** True when `value` is wrapped in `{...}` and shaped like a dotted path. */
export function isTokenReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_RE.test(value);
}

/** Parse `{palette.dominant.accent}` → structured form, or null if malformed. */
export function parseTokenReference(
  value: string,
): ParsedTokenReference | null {
  const match = REFERENCE_RE.exec(value);
  if (!match) return null;
  const path = match[1];
  const lastDot = path.lastIndexOf(".");
  return {
    path,
    namespace: path.slice(0, lastDot),
    role: path.slice(lastDot + 1),
  };
}

export type TokenReferenceError =
  | { kind: "malformed"; value: string }
  | { kind: "unsupported-namespace"; namespace: string; supported: string[] }
  | { kind: "unknown-role"; namespace: string; role: string };

export interface ResolveResult {
  value: string | null;
  error: TokenReferenceError | null;
}

const SUPPORTED_NAMESPACES = ["palette.dominant", "palette.semantic"];

/**
 * Resolve a `{...}` reference against an expression. Returns the primitive
 * value (hex string) when resolvable, plus a structured error describing why
 * resolution failed otherwise. Callers that just want the value can ignore
 * `error`; the linter uses it to report `broken-role-reference` precisely.
 */
export function resolveTokenReference(
  fp: Expression,
  value: string,
): ResolveResult {
  const parsed = parseTokenReference(value);
  if (!parsed) {
    return { value: null, error: { kind: "malformed", value } };
  }

  const list = lookupNamespace(fp, parsed.namespace);
  if (!list) {
    return {
      value: null,
      error: {
        kind: "unsupported-namespace",
        namespace: parsed.namespace,
        supported: SUPPORTED_NAMESPACES,
      },
    };
  }

  const hit = list.find((c) => c.role === parsed.role);
  if (!hit) {
    return {
      value: null,
      error: {
        kind: "unknown-role",
        namespace: parsed.namespace,
        role: parsed.role,
      },
    };
  }

  return { value: hit.value, error: null };
}

function lookupNamespace(
  fp: Expression,
  namespace: string,
): { role: string; value: string }[] | null {
  switch (namespace) {
    case "palette.dominant":
      return fp.palette?.dominant ?? [];
    case "palette.semantic":
      return fp.palette?.semantic ?? [];
    default:
      return null;
  }
}

/** Human-readable message for a resolve error — used by the linter. */
export function formatReferenceError(error: TokenReferenceError): string {
  switch (error.kind) {
    case "malformed":
      return `\`${error.value}\` is not a valid token reference (expected \`{namespace.role}\`).`;
    case "unsupported-namespace":
      return `Reference targets \`${error.namespace}\` which is not a valid reference namespace. Supported: ${error.supported.map((n) => `\`${n}\``).join(", ")}.`;
    case "unknown-role":
      return `Reference \`{${error.namespace}.${error.role}}\` does not resolve — no entry with role \`${error.role}\` in \`${error.namespace}\`.`;
  }
}
