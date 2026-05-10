export const GHOST_RESOURCES_SCHEMA = "ghost.resources/v1" as const;
export const GHOST_RESOURCES_FILENAME = "resources.yml" as const;

export interface GhostResourceRef {
  id?: string;
  target: string;
  kind?: string;
  paths?: string[];
  note?: string;
}

export interface GhostSurfaceResource {
  id?: string;
  name?: string;
  kind?: string;
  target?: string;
  locator?: string;
  paths?: string[];
  note?: string;
}

export interface GhostResourcesDocument {
  schema: typeof GHOST_RESOURCES_SCHEMA;
  id: string;
  primary: GhostResourceRef;
  design_system?: GhostResourceRef[];
  surfaces?: GhostSurfaceResource[];
  screenshots?: GhostResourceRef[];
  docs?: GhostResourceRef[];
  resolvers?: GhostResourceRef[];
  upstreams?: GhostResourceRef[];
  include?: string[];
  exclude?: string[];
}

export type GhostResourcesLintSeverity = "error" | "warning" | "info";

export interface GhostResourcesLintIssue {
  severity: GhostResourcesLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostResourcesLintReport {
  issues: GhostResourcesLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
