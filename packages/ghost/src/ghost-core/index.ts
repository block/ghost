// --- Embedding primitives ---

// --- Check (ghost.check/v1) — markdown checks, agent-evaluated ---
export {
  type CheckRelevance,
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
  parseCheckMarkdown,
  type RoutedCheck,
  selectChecksForSurfaces,
} from "./check/index.js";
// --- Fingerprint package filenames ---
// --- Graph (in-memory fingerprint node graph) ---
export {
  type AssembleGraphInput,
  ancestorChain,
  assembleGraph,
  buildGraphMenu,
  GHOST_GRAPH_ROOT_ID,
  type GhostGraph,
  type GhostGraphNode,
  type GhostGraphNodeOrigin,
  type GraphLintIssue,
  type GraphLintReport,
  type GraphLintSeverity,
  type GraphMenuEntry,
  type GraphSlice,
  type GraphSliceNode,
  type GraphSliceProvenance,
  lintGraph,
  type ResolveGraphSliceOptions,
  resolveGraphSlice,
} from "./graph/index.js";
// --- Node (ghost.node/v1) — the markdown node artifact ---
export {
  GHOST_NODE_RELATION_KINDS,
  GHOST_NODE_SCHEMA,
  type GhostNodeDocument,
  type GhostNodeFrontmatter,
  GhostNodeFrontmatterSchema,
  type GhostNodeLintIssue,
  type GhostNodeLintReport,
  type GhostNodeLintSeverity,
  type GhostNodeRelation,
  type GhostNodeRelationKind,
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
// --- Patterns (ghost.patterns/v1) ---
export type {
  GhostCompositionAnatomy,
  GhostCompositionPattern,
  GhostPatternEvidence,
  GhostPatternsDocument,
  GhostPatternsLintIssue,
  GhostPatternsLintReport,
  GhostPatternsLintSeverity,
  GhostSurfaceTypePattern,
} from "./patterns/index.js";
export {
  GHOST_PATTERNS_FILENAME,
  GHOST_PATTERNS_SCHEMA,
  GhostCompositionAnatomySchema,
  GhostCompositionPatternSchema,
  GhostPatternEvidenceSchema,
  GhostPatternsSchema,
  GhostSurfaceTypePatternSchema,
  lintGhostPatterns,
} from "./patterns/index.js";
// --- Resources (ghost.resources/v1) ---
export type {
  GhostResourceRef,
  GhostResourcesDocument,
  GhostResourcesLintIssue,
  GhostResourcesLintReport,
  GhostResourcesLintSeverity,
  GhostSurfaceResource,
} from "./resources/index.js";
export {
  GHOST_RESOURCES_FILENAME,
  GHOST_RESOURCES_SCHEMA,
  GhostResourceRefSchema,
  GhostResourcesSchema,
  GhostSurfaceResourceSchema,
  lintGhostResources,
} from "./resources/index.js";
// --- Inventory scan output types ---
export type {
  GitInfo,
  InventoryOutput,
  LanguageHistogramEntry,
  TopLevelEntry,
} from "./scan-types.js";
// --- Skill bundle loader ---
export type { SkillBundleFile } from "./skill-bundle-loader.js";
export { loadSkillBundle } from "./skill-bundle-loader.js";
// --- Surfaces (ghost.surfaces/v1) — the optional terse spine file ---
export {
  GHOST_SURFACE_ROOT_ID,
  GHOST_SURFACES_SCHEMA,
  GHOST_SURFACES_YML_FILENAME,
  type GhostSurface,
  type GhostSurfacesDocument,
  type GhostSurfacesLintIssue,
  type GhostSurfacesLintReport,
  type GhostSurfacesLintSeverity,
  GhostSurfacesSchema,
  lintGhostSurfaces,
} from "./surfaces/index.js";
