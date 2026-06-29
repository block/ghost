/** The in-repo root contract reference. */
export const IN_REPO_CONTRACT = "." as const;

/**
 * npm package name: optional `@scope/`, then a lowercase name. Matches the npm
 * naming rules closely enough to distinguish a package reference from a path,
 * URL, or arbitrary resource id.
 */
const NPM_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

export type ContractReferenceKind = "in-repo" | "npm" | "unsupported";

/**
 * Classify a binding `contract:` reference. `.` is the in-repo root contract; an
 * npm package name resolves from `node_modules`; anything else (a path, URL, or
 * resource id) is not yet supported (see docs/ideas/polish-cut-d-plan.md).
 */
export function classifyContractReference(
  reference: string,
): ContractReferenceKind {
  if (reference === IN_REPO_CONTRACT) return "in-repo";
  // Exclude path-like and protocol-like references before the npm-name test.
  if (reference.includes("/") && !reference.startsWith("@")) {
    return "unsupported";
  }
  if (reference.includes(":") || reference.startsWith(".")) {
    return "unsupported";
  }
  return NPM_NAME.test(reference) ? "npm" : "unsupported";
}
