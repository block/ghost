export const GHOST_PATTERNS_SCHEMA = "ghost.patterns/v1" as const;
export const GHOST_PATTERNS_FILENAME = "patterns.yml" as const;

export interface GhostPatternEvidence {
  surface_id?: string;
  path?: string;
  locator?: string;
  note?: string;
}

export interface GhostSurfaceTypePattern {
  id: string;
  title?: string;
  description?: string;
  signals?: string[];
  preferred_patterns?: string[];
  discouraged_patterns?: string[];
  evidence?: GhostPatternEvidence[];
}

export interface GhostCompositionAnatomy {
  ordered?: string[];
  required?: string[];
  optional?: string[];
  forbidden?: string[];
}

export interface GhostCompositionPattern {
  id: string;
  title?: string;
  intent?: string;
  surface_types?: string[];
  frequency?: number;
  confidence?: number;
  anatomy?: GhostCompositionAnatomy;
  traits?: Record<string, string | string[]>;
  variants?: string[];
  anti_patterns?: string[];
  evidence?: GhostPatternEvidence[];
  advisory?: string[];
}

export interface GhostPatternsDocument {
  schema: typeof GHOST_PATTERNS_SCHEMA;
  id: string;
  surface_types: GhostSurfaceTypePattern[];
  composition_patterns: GhostCompositionPattern[];
  advisory?: {
    review_expectations?: string[];
  };
}

export type GhostPatternsLintSeverity = "error" | "warning" | "info";

export interface GhostPatternsLintIssue {
  severity: GhostPatternsLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostPatternsLintReport {
  issues: GhostPatternsLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
