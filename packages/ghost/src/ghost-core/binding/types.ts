export const GHOST_BINDING_SCHEMA = "ghost.binding/v1" as const;
export const GHOST_BINDING_FILENAME = ".ghost.bind.yml" as const;

/**
 * One binding entry: a surface in the contract, realized by these repo paths.
 * `paths` live here on the binding, never on the surface — this is the home of
 * the deleted `topology.scopes[].paths` (see docs/ideas/surface-binding.md).
 */
export interface GhostBindingEntry {
  surface: string;
  paths: string[];
}

export interface GhostBindingDocument {
  schema: typeof GHOST_BINDING_SCHEMA;
  /**
   * Reference to the contract this binding instantiates. Only `.` (the in-repo
   * root contract) is supported now; external references (npm name, resource
   * id) are deferred (see docs/ideas/surface-binding.md open fork 1).
   */
  contract: string;
  bindings: GhostBindingEntry[];
}

export type GhostBindingLintSeverity = "error" | "warning" | "info";

export interface GhostBindingLintIssue {
  severity: GhostBindingLintSeverity;
  rule: string;
  message: string;
  path: string;
}

export interface GhostBindingLintReport {
  issues: GhostBindingLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
