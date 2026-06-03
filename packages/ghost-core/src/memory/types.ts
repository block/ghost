export const GHOST_DECISION_SCHEMA = "ghost.decision/v1" as const;

export const GHOST_DECISIONS_DIRNAME = "decisions" as const;

export type GhostDecisionStatus = "accepted" | "rejected" | "superseded";

export interface GhostExperienceScope {
  roles?: string[];
  scopes?: string[];
  surface_types?: string[];
  pattern_ids?: string[];
  paths?: string[];
}

export interface GhostExperienceEvidence {
  path?: string;
  survey_surface_id?: string;
  locator?: string;
  note?: string;
}

export interface GhostDecisionDocument {
  schema: typeof GHOST_DECISION_SCHEMA;
  id: string;
  status: GhostDecisionStatus;
  title: string;
  claim: string;
  rationale: string;
  scope?: GhostExperienceScope;
  evidence: GhostExperienceEvidence[];
  decided_at: string;
}

export type GhostMemoryLintSeverity = "error" | "warning" | "info";

export interface GhostMemoryLintIssue {
  severity: GhostMemoryLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostMemoryLintReport {
  issues: GhostMemoryLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
