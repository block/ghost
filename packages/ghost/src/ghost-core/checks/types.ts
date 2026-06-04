import type {
  GhostFingerprintDocument,
  GhostFingerprintRef,
} from "../fingerprint/index.js";
import type { MapFrontmatter, MapScope } from "../map/index.js";

export const GHOST_CHECKS_SCHEMA = "ghost.checks/v1" as const;
export const GHOST_CHECKS_FILENAME = "checks.yml" as const;

export type GhostCheckStatus = "active" | "proposed" | "disabled";
export type GhostCheckSeverity = "critical" | "serious" | "nit";
export type GhostCheckDerivationProseRef = Extract<
  GhostFingerprintRef,
  | `prose.principle:${string}`
  | `prose.situation:${string}`
  | `prose.experience_contract:${string}`
>;
export type GhostCheckDerivationInventoryRef = Extract<
  GhostFingerprintRef,
  `inventory.exemplar:${string}`
>;
export type GhostCheckDerivationCompositionRef = Extract<
  GhostFingerprintRef,
  `composition.pattern:${string}`
>;

export interface GhostCheckDerivation {
  prose?: GhostCheckDerivationProseRef[];
  inventory?: GhostCheckDerivationInventoryRef[];
  composition?: GhostCheckDerivationCompositionRef[];
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

export interface GhostChecksDocument {
  schema: typeof GHOST_CHECKS_SCHEMA;
  id: string;
  checks: GhostCheck[];
}

export type GhostChecksLintSeverity = "error" | "warning" | "info";

export interface GhostChecksLintIssue {
  severity: GhostChecksLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostChecksLintReport {
  issues: GhostChecksLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface GhostChecksLintOptions {
  map?: Pick<MapFrontmatter, "scopes" | "feature_areas">;
  fingerprint?: GhostFingerprintDocument;
}

export interface RoutedGhostCheck {
  check: GhostCheck;
  matched_scopes: MapScope[];
}
