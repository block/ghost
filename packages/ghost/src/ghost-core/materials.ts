/** Material locator support for fingerprint nodes. */
export type GhostMaterialLocatorKind = "local" | "url";

/** A material locator with an optional retrieval note. */
export interface GhostAnnotatedMaterial {
  locator: string;
  note?: string;
}

/** A node material declaration. Bare locator strings remain supported. */
export type GhostMaterial = string | GhostAnnotatedMaterial;

export interface ClassifiedGhostMaterialLocator {
  kind: GhostMaterialLocatorKind;
  value: string;
  /** Present for external locators. `url` remains the legacy public kind. */
  access?: "https" | "connector";
}

const URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]/;
const CONNECTOR_SEPARATOR_ONLY_TARGET = /^(?:[\\/]|%(?:25)*(?:2f|5c))*$/i;
const ALLOWED_EXTERNAL_PROTOCOLS = new Set([
  "figma:",
  "github:",
  "https:",
  "mcp:",
]);

/** Normalize either supported material declaration shape. */
export function normalizeMaterial(
  material: GhostMaterial,
): GhostAnnotatedMaterial {
  return typeof material === "string" ? { locator: material } : material;
}

/** Return the locator from either supported material declaration shape. */
export function materialLocator(material: GhostMaterial): string {
  return normalizeMaterial(material).locator;
}

/**
 * Return the lowercased scheme name of an external locator without its colon
 * (e.g. `mcp`, `figma`, `github`, `https`). Returns `undefined` for a
 * repo-relative local locator that carries no scheme.
 */
export function externalLocatorScheme(value: string): string | undefined {
  if (!URI_SCHEME.test(value) || WINDOWS_ABSOLUTE_PATH.test(value)) {
    return undefined;
  }
  return value.slice(0, value.indexOf(":")).toLowerCase();
}

/**
 * Classify a material locator after `validateMaterialLocator`. `url` is the
 * legacy public kind for an external locator; `access` distinguishes HTTPS from
 * connection-dependent locators. ghost never resolves or connects to them.
 * Everything else is an explicit repo-relative file path.
 */
export function classifyMaterialLocator(
  value: string,
): ClassifiedGhostMaterialLocator {
  if (!URI_SCHEME.test(value) || WINDOWS_ABSOLUTE_PATH.test(value)) {
    return { kind: "local", value };
  }
  return {
    kind: "url",
    value,
    access:
      value.slice(0, value.indexOf(":")).toLowerCase() === "https"
        ? "https"
        : "connector",
  };
}

/** Return a human-readable validation error, or null when the locator is valid. */
export function validateMaterialLocator(value: string): string | null {
  if (value.trim() !== value) {
    return "material locator must not have leading or trailing whitespace";
  }
  if (value.length === 0) {
    return "material locator must not be empty";
  }

  // Preserve the local path boundary before URI classification. A drive path
  // has URI-like syntax but must not bypass repo-relative path validation.
  if (WINDOWS_ABSOLUTE_PATH.test(value)) {
    return "local material locators must be repo-relative, not absolute paths";
  }

  if (URI_SCHEME.test(value)) {
    let uri: URL;
    try {
      uri = new URL(value);
    } catch {
      return "external material locator must be a valid absolute URI";
    }

    const protocol = uri.protocol.toLowerCase();
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(protocol)) {
      return `external material locator protocol ${protocol} is not supported; use https:, mcp:, figma:, or github:`;
    }
    if (protocol === "https:" && uri.hostname.length === 0) {
      return "HTTPS material locators must be absolute URLs with a host";
    }
    if (
      protocol !== "https:" &&
      CONNECTOR_SEPARATOR_ONLY_TARGET.test(`${uri.host}${uri.pathname}`)
    ) {
      return `${protocol} material locators must name a connector target`;
    }
    return null;
  }

  if (value.startsWith("/") || value.startsWith("\\")) {
    return "local material locators must be repo-relative, not absolute paths";
  }
  const normalized = value.replace(/\\/g, "/");
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.endsWith("/..") ||
    normalized.includes("/../")
  ) {
    return "local material locators must not escape the repo with '..'";
  }
  if (normalized.startsWith("~/")) {
    return "local material locators must be repo-relative, not home-relative paths";
  }
  if (/[*?{]/.test(normalized)) {
    return "local material locators must name each file explicitly; glob patterns are not supported";
  }
  return null;
}
