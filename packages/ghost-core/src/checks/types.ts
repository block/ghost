import type { MapFrontmatter, MapScope } from "../map/index.js";

export const GHOST_VALIDATE_SCHEMA = "ghost.validate/v1" as const;
export const GHOST_VALIDATE_FILENAME = "validate.yml" as const;

export type GhostCheckStatus = "active" | "proposed" | "disabled";
export type GhostCheckSeverity = "critical" | "serious" | "nit";
export type GhostCheckDerivationIntentRef =
  | `intent.principle:${string}`
  | `intent.situation:${string}`
  | `intent.experience_contract:${string}`;
export type GhostCheckDerivationInventoryRef = `inventory.exemplar:${string}`;
export type GhostCheckDerivationCompositionRef =
  `composition.pattern:${string}`;

export interface GhostCheckDerivation {
  intent?: GhostCheckDerivationIntentRef[];
  inventory?: GhostCheckDerivationInventoryRef[];
  composition?: GhostCheckDerivationCompositionRef[];
}

export interface GhostValidateFingerprintContext {
  intent?: {
    principles?: { id: string }[];
    situations?: { id: string }[];
    experience_contracts?: { id: string }[];
  };
  inventory?: {
    topology?: {
      scopes?: { id: string; surface_types?: string[] }[];
      surface_types?: string[];
    };
    exemplars?: { id: string }[];
  };
  composition?: {
    patterns?: { id: string }[];
  };
}

export type GhostCheckDetectorType =
  | "forbidden-regex"
  | "required-regex"
  | "banned-import"
  | "banned-component"
  | "required-token";

export interface GhostCheckAppliesTo {
  scopes?: string[];
  paths?: string[];
  surface_types?: string[];
  pattern_ids?: string[];
}

export interface GhostCheckDetector {
  type: GhostCheckDetectorType;
  pattern?: string;
  value?: string;
  contexts?: string[];
}

export interface GhostCheckEvidence {
  support?: number;
  observed_count?: number;
  examples?: Array<string | { path: string; note?: string }>;
}

export interface GhostCheck {
  id: string;
  title: string;
  status: GhostCheckStatus;
  severity: GhostCheckSeverity;
  derivation?: GhostCheckDerivation;
  applies_to?: GhostCheckAppliesTo;
  detector: GhostCheckDetector;
  evidence?: GhostCheckEvidence;
  repair?: string;
}

export interface GhostValidateDocument {
  schema: typeof GHOST_VALIDATE_SCHEMA;
  id: string;
  checks: GhostCheck[];
}

export type GhostValidateLintSeverity = "error" | "warning" | "info";

export interface GhostValidateLintIssue {
  severity: GhostValidateLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostValidateLintReport {
  issues: GhostValidateLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface GhostValidateLintOptions {
  map?: Pick<MapFrontmatter, "scopes" | "feature_areas">;
  fingerprint?: GhostValidateFingerprintContext;
}

export interface RoutedGhostValidateCheck {
  check: GhostCheck;
  matched_scopes: MapScope[];
}
