export const GHOST_FINGERPRINT_SCHEMA = "ghost.fingerprint/v1" as const;
export const GHOST_FINGERPRINT_PACKAGE_SCHEMA =
  "ghost.fingerprint-package/v1" as const;
export const GHOST_FINGERPRINT_YML_FILENAME = "fingerprint.yml" as const;

export type GhostFingerprintPatternKind =
  | "rule"
  | "layout"
  | "structure"
  | "flow"
  | "state"
  | "visual"
  | "behavior"
  | "content";
export type GhostFingerprintRefPrefix =
  | "prose.principle"
  | "prose.situation"
  | "prose.experience_contract"
  | "inventory.exemplar"
  | "composition.pattern"
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

export interface GhostFingerprintExemplar {
  id: string;
  path: string;
  title?: string;
  surface_type?: string;
  scope?: string;
  note?: string;
  why?: string;
  refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintTopology {
  scopes?: GhostFingerprintTopologyScope[];
  surface_types?: string[];
}

export interface GhostFingerprintInventoryBuildingBlocks {
  tokens?: string[];
  components?: string[];
  libraries?: string[];
  assets?: string[];
  routes?: string[];
  files?: string[];
  notes?: string[];
}

export type GhostFingerprintInventorySourceKind =
  | "registry"
  | "file"
  | "url"
  | "package";

export interface GhostFingerprintInventorySource {
  id: string;
  kind: GhostFingerprintInventorySourceKind;
  ref: string;
  note?: string;
}

export interface GhostFingerprintProse {
  summary: GhostFingerprintSummary;
  situations: GhostFingerprintSituation[];
  principles: GhostFingerprintPrinciple[];
  experience_contracts: GhostFingerprintExperienceContract[];
}

export interface GhostFingerprintInventory {
  topology: GhostFingerprintTopology;
  building_blocks: GhostFingerprintInventoryBuildingBlocks;
  exemplars: GhostFingerprintExemplar[];
  sources: GhostFingerprintInventorySource[];
}

export interface GhostFingerprintComposition {
  patterns: GhostFingerprintPattern[];
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
  principle: string;
  applies_to?: GhostFingerprintScope;
  guidance?: string[];
  evidence?: GhostFingerprintEvidence[];
  counterexamples?: string[];
  check_refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintExperienceContract {
  id: string;
  contract: string;
  applies_to?: GhostFingerprintScope;
  obligations?: string[];
  evidence?: GhostFingerprintEvidence[];
  check_refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintPattern {
  id: string;
  kind: GhostFingerprintPatternKind;
  pattern: string;
  applies_to?: GhostFingerprintScope;
  guidance?: string[];
  evidence?: GhostFingerprintEvidence[];
  anti_patterns?: string[];
  check_refs?: GhostFingerprintRef[];
}

export interface GhostFingerprintDocument {
  schema: typeof GHOST_FINGERPRINT_SCHEMA;
  prose: GhostFingerprintProse;
  inventory: GhostFingerprintInventory;
  composition: GhostFingerprintComposition;
}

export interface GhostFingerprintPackageManifest {
  schema: typeof GHOST_FINGERPRINT_PACKAGE_SCHEMA;
  id: string;
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
