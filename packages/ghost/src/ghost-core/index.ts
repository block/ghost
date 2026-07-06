// --- Embedding primitives ---

// --- Catalog (flat in-memory fingerprint node map) ---
export {
  type AssembleCatalogInput,
  assembleCatalog,
  type BuildCatalogMenuOptions,
  buildCatalogMenu,
  type CatalogMenuEntry,
  closestIds,
  type GhostCatalog,
  type GhostCatalogNode,
  type PlacedNode,
} from "./catalog/index.js";
// --- Check (ghost.check/v1) — markdown checks, agent-evaluated ---
export {
  GHOST_CHECK_SCHEMA,
  GHOST_CHECK_SEVERITIES,
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
// --- Glob matching (repo-relative locators) ---
export { hasGlobMagic, matchesGlob, normalizeGlobPath } from "./glob.js";
// --- Glossary (reserved fingerprint vocabulary slot) ---
export {
  type GhostGlossaryDocument,
  GhostGlossaryFrontmatterSchema,
  type GhostGlossaryKind,
  type GhostGlossaryKindPosture,
  GhostGlossaryKindPostureSchema,
  type GhostGlossaryParseResult,
  parseGlossary,
} from "./glossary.js";
export type { GhostHauntManifest } from "./haunt-manifest.js";
export {
  GHOST_HAUNT_MANIFEST_FILENAME,
  GHOST_HAUNT_SCHEMA,
  GhostHauntManifestSchema,
} from "./haunt-manifest.js";
export {
  type ExpandedLocalMaterialLocator,
  expandLocalMaterialLocator,
  listBundledMaterialFiles,
  type MaterialTransportOptions,
  type MaterialTransportResult,
  materialLocatorClaimsPath,
  resolveLocalMaterialLocator,
  type TransportedMaterial,
  type TransportedMaterialTier,
  transportMaterials,
} from "./material-transport.js";
// --- Materials (node locators) ---
export {
  type ClassifiedGhostMaterialLocator,
  classifyMaterialLocator,
  type GhostMaterialLocatorKind,
  validateMaterialLocator,
} from "./materials.js";
// --- Node (ghost.node/v1) — the markdown node artifact ---
export {
  carriesConcreteMaterial,
  extractSkeletonFences,
  extractSkeletonSections,
  type FencedBlock,
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
  type SkeletonSection,
  serializeNode,
  stripSkeletonSections,
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
