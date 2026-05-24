export const GHOST_FINGERPRINT_SCHEMA = "ghost.fingerprint/v1" as const;
export const GHOST_FINGERPRINT_YML_FILENAME = "fingerprint.yml" as const;

export type GhostFingerprintStatus = "accepted" | "proposed" | "deprecated";
export type GhostFingerprintPatternKind =
  | "visual"
  | "behavioral"
  | "content"
  | "composition";
export type GhostFingerprintRefPrefix =
  | "principle"
  | "situation"
  | "experience_contract"
  | "pattern"
  | "substrate"
  | "check";

export type GhostFingerprintRef = `${GhostFingerprintRefPrefix}:${string}`;

export interface GhostFingerprintEvidence {
  path?: string;
  locator?: string;
  note?: string;
}

export interface GhostFingerprintScope {
  scopes?: string[];
  paths?: string[];
  surface_types?: string[];
  situations?: string[];
}

export interface GhostFingerprintSummary {
  product?: string;
  audience?: string[];
  goals?: string[];
  anti_goals?: string[];
  tradeoffs?: string[];
  tone?: string[];
}

export interface GhostFingerprintTopologyScope {
  id: string;
  paths: string[];
  surface_types?: string[];
}

export interface GhostFingerprintTopologyExample {
  path: string;
  surface_type?: string;
  note?: string;
}

export interface GhostFingerprintTopology {
  scopes?: GhostFingerprintTopologyScope[];
  surface_types?: string[];
  examples?: GhostFingerprintTopologyExample[];
}

export interface GhostFingerprintSituation {
  id: string;
  title?: string;
  user_intent?: string;
  product_obligation?: string;
  surface_type?: string;
  hierarchy?: Record<string, string>;
  refuses?: string[];
  principles?: GhostFingerprintRef[];
  experience_contracts?: GhostFingerprintRef[];
  patterns?: GhostFingerprintRef[];
  evidence?: GhostFingerprintEvidence[];
}

export interface GhostFingerprintPrinciple {
  id: string;
  status: GhostFingerprintStatus;
  principle: string;
  applies_to?: GhostFingerprintScope;
  guidance?: string[];
  evidence?: GhostFingerprintEvidence[];
  counterexamples?: string[];
  check_refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintExperienceContract {
  id: string;
  status: GhostFingerprintStatus;
  contract: string;
  applies_to?: GhostFingerprintScope;
  obligations?: string[];
  evidence?: GhostFingerprintEvidence[];
  check_refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintPattern {
  id: string;
  status: GhostFingerprintStatus;
  kind: GhostFingerprintPatternKind;
  pattern: string;
  applies_to?: GhostFingerprintScope;
  guidance?: string[];
  evidence?: GhostFingerprintEvidence[];
  anti_patterns?: string[];
  check_refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintSubstrate {
  tokens?: string[];
  components?: string[];
  accessibility?: string[];
  responsive?: string[];
}

export interface GhostFingerprintReviewPolicy {
  proposal_policy?: string[];
  experience_gap_categories?: string[];
  memory_gap_policy?: string[];
}

export interface GhostFingerprintDocument {
  schema: typeof GHOST_FINGERPRINT_SCHEMA;
  summary: GhostFingerprintSummary;
  topology: GhostFingerprintTopology;
  situations: GhostFingerprintSituation[];
  principles: GhostFingerprintPrinciple[];
  experience_contracts: GhostFingerprintExperienceContract[];
  patterns: GhostFingerprintPattern[];
  substrate: GhostFingerprintSubstrate;
  review_policy: GhostFingerprintReviewPolicy;
}

export type GhostFingerprintLintSeverity = "error" | "warning" | "info";

export interface GhostFingerprintLintIssue {
  severity: GhostFingerprintLintSeverity;
  rule: string;
  message: string;
  path?: string;
}

export interface GhostFingerprintLintReport {
  issues: GhostFingerprintLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}
