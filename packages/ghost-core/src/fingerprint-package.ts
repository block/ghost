export const FINGERPRINT_PACKAGE_DIR = ".ghost" as const;
export const RESOURCES_FILENAME = "resources.yml" as const;
export const PATTERNS_FILENAME = "patterns.yml" as const;
export const INTENT_FILENAME = "intent.md" as const;
export const FINGERPRINT_FILENAME = "fingerprint.md" as const;
export const DECISIONS_DIRNAME = "decisions" as const;
export const PROPOSALS_DIRNAME = "proposals" as const;

export interface FingerprintPackagePaths {
  dir: string;
  resources: string;
  map: string;
  survey: string;
  patterns: string;
  /** Legacy direct markdown path; not part of the canonical root bundle. */
  fingerprint: string;
  checks: string;
  intent: string;
  decisions: string;
  proposals: string;
}
