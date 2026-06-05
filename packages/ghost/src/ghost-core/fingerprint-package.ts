export const FINGERPRINT_PACKAGE_DIR = ".ghost" as const;
export const RESOURCES_FILENAME = "resources.yml" as const;
export const PATTERNS_FILENAME = "patterns.yml" as const;
export const FINGERPRINT_YML_FILENAME = "fingerprint.yml" as const;
export const FINGERPRINT_DIRNAME = "fingerprint" as const;
export const FINGERPRINT_MANIFEST_FILENAME = "manifest.yml" as const;
export const FINGERPRINT_PROSE_FILENAME = "prose.yml" as const;
export const FINGERPRINT_INVENTORY_FILENAME = "inventory.yml" as const;
export const FINGERPRINT_COMPOSITION_FILENAME = "composition.yml" as const;
export const FINGERPRINT_ENFORCEMENT_DIRNAME = "enforcement" as const;
export const FINGERPRINT_MEMORY_DIRNAME = "memory" as const;
export const FINGERPRINT_SOURCES_DIRNAME = "sources" as const;
export const CONFIG_FILENAME = "config.yml" as const;
export const INTENT_FILENAME = "intent.md" as const;
export const FINGERPRINT_FILENAME = "fingerprint.md" as const;
export const DECISIONS_DIRNAME = "decisions" as const;
export const CACHE_DIRNAME = "cache" as const;

export interface FingerprintPackagePaths {
  dir: string;
  fingerprintDir: string;
  manifest: string;
  prose: string;
  inventory: string;
  composition: string;
  enforcement: string;
  fingerprintYml: string;
  config: string;
  resources: string;
  map: string;
  survey: string;
  patterns: string;
  /** Legacy direct markdown path; not part of the canonical root bundle. */
  fingerprint: string;
  checks: string;
  memory: string;
  intent: string;
  decisions: string;
  sources: string;
  cache: string;
}
