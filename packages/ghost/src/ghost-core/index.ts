// --- Embedding primitives ---

// --- Catalog (flat in-memory fingerprint node map) ---
export {
  type AssembleCatalogInput,
  assembleCatalog,
  buildCatalogMenu,
  type CatalogMenuEntry,
  closestIds,
  type GhostCatalog,
  type GhostCatalogNode,
  type PlacedNode,
} from "./catalog/index.js";
// --- Check (ghost.check/v1) — markdown checks, agent-evaluated ---
export {
  GHOST_CHECK_DETECTOR_TYPES,
  GHOST_CHECK_SCHEMA,
  GHOST_CHECK_SEVERITIES,
  type GhostCheckDetector,
  type GhostCheckDetectorType,
  type GhostCheckDocument,
  type GhostCheckFrontmatter,
  type GhostCheckLintIssue,
  type GhostCheckLintReport,
  type GhostCheckLintSeverity,
  type GhostCheckMarkdownSeverity,
  lintGhostCheck,
  loadGhostCheck,
  type ParsedCheckMarkdown,
  type ParsedSourceRef,
  parseCheckMarkdown,
  parseSourceRef,
  sliceNodeSection,
} from "./check/index.js";
// --- CLI exit-code contract ---
export { EXIT, UsageError } from "./errors.js";
// --- Glossary (reserved fingerprint vocabulary slot) ---
export {
  type GhostGlossaryCategory,
  type GhostGlossaryDocument,
  GhostGlossaryFrontmatterSchema,
  type GhostGlossaryParseResult,
  parseGlossary,
} from "./glossary.js";
export type { GhostHauntManifest } from "./haunt-manifest.js";
export {
  GHOST_HAUNT_MANIFEST_FILENAME,
  GHOST_HAUNT_SCHEMA,
  GhostHauntManifestSchema,
} from "./haunt-manifest.js";
// --- Materials (node locators) ---
export {
  type ClassifiedGhostMaterialLocator,
  classifyMaterialLocator,
  type GhostMaterialLocatorKind,
  validateMaterialLocator,
} from "./materials.js";
// --- Node (ghost.node/v1) — the markdown node artifact ---
export {
  GHOST_NODE_SCHEMA,
  type GhostNodeDocument,
  type GhostNodeFrontmatter,
  GhostNodeFrontmatterSchema,
  type GhostNodeLintIssue,
  type GhostNodeLintReport,
  type GhostNodeLintSeverity,
  lintGhostNode,
  NodeIdSchema,
  NodeRefSchema,
  type ParseNodeResult,
  parseNode,
  serializeNode,
} from "./node/index.js";
// --- Fingerprint package manifest (ghost.fingerprint-package/v1) ---
export type { GhostFingerprintPackageManifest } from "./package-manifest.js";
export {
  GHOST_FINGERPRINT_PACKAGE_SCHEMA,
  GhostFingerprintPackageManifestSchema,
} from "./package-manifest.js";
// --- Skill bundle loader ---
export type { SkillBundleFile } from "./skill-bundle-loader.js";
export { loadSkillBundle } from "./skill-bundle-loader.js";
