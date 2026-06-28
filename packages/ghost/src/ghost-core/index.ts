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
  type PlacedNode,
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
