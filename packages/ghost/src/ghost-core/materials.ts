/** Material locator support for fingerprint nodes. */
export type GhostMaterialLocatorKind = "local" | "url";

export interface ClassifiedGhostMaterialLocator {
  kind: GhostMaterialLocatorKind;
  value: string;
}

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Classify a material locator. `https://…` locators point outside the repo;
 * everything else is a repo-relative path/glob after validation.
 */
export function classifyMaterialLocator(
  value: string,
): ClassifiedGhostMaterialLocator {
  return value.startsWith("https://")
    ? { kind: "url", value }
    : { kind: "local", value };
}

/** Return a human-readable validation error, or null when the locator is valid. */
export function validateMaterialLocator(value: string): string | null {
  if (value.trim() !== value) {
    return "material locator must not have leading or trailing whitespace";
  }
  if (value.length === 0) {
    return "material locator must not be empty";
  }

  if (URL_SCHEME.test(value)) {
    if (!value.startsWith("https://")) {
      return "material URL locators must use https://";
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.hostname.length === 0) {
        return "material URL locators must be absolute https URLs";
      }
      return null;
    } catch {
      return "material URL locator is not a valid URL";
    }
  }

  if (value.startsWith("/") || value.startsWith("\\")) {
    return "local material locators must be repo-relative, not absolute paths";
  }
  if (/^[a-zA-Z]:[\\/]/.test(value)) {
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
  return null;
}
