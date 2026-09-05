// --- Embedding primitives ---

// --- Catalog (flat in-memory package node map) ---
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
  type ParsedCheckReference,
  parseCheckMarkdown,
  parseCheckReference,
  sliceNodeSection,
} from "./check/index.js";
// --- CLI exit-code contract ---
export { EXIT, UsageError } from "./errors.js";
// --- Glossary (reserved ghost vocabulary slot) ---
export {
  type GhostGlossaryDocument,
  GhostGlossaryFrontmatterSchema,
  type GhostGlossaryKind,
  type GhostGlossaryParseResult,
  parseGlossary,
} from "./glossary.js";
export {
  inferMaterialMime,
  isBinaryMaterial,
  isTextMime,
  listBundledMaterialFiles,
  type MaterialMimeInfo,
  type MaterialTransportOptions,
  type MaterialTransportResult,
  materialLocatorClaimsPath,
  type ResolvedLocalMaterialFile,
  resolveContainedRealFile,
  resolveLocalMaterialFile,
  resolveLocalMaterialLocator,
  type TransportedMaterial,
  type TransportedMaterialTier,
  transportMaterials,
} from "./material-transport.js";
// --- Materials (node locators) ---
export {
  type ClassifiedGhostMaterialLocator,
  classifyMaterialLocator,
  externalLocatorScheme,
  type GhostAnnotatedMaterial,
  type GhostMaterial,
  type GhostMaterialLocatorKind,
  materialLocator,
  normalizeMaterial,
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
  hasSubstantialFencedExample,
  lintGhostNode,
  NodeIdSchema,
  NodeRefSchema,
  type ParseNodeResult,
  parseNode,
  type SkeletonSection,
  serializeNode,
  stripSkeletonSections,
} from "./node/index.js";
// --- ghost package manifest ---
export type { GhostPackageManifest } from "./package-manifest.js";
export {
  GHOST_PACKAGE_SCHEMA,
  GhostPackageManifestSchema,
} from "./package-manifest.js";
// --- Skill bundle loader ---
export type { SkillBundleFile } from "./skill-bundle-loader.js";
export { loadSkillBundle } from "./skill-bundle-loader.js";
