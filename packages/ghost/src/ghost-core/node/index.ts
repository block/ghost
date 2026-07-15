/**
 * Public surface for `ghost.node/v1` — the node artifact: markdown +
 * frontmatter, the single unit a fingerprint corpus is made of: schema +
 * types + parse + serialize.
 */

export { lintGhostNode, type ParseNodeResult, parseNode } from "./parse.js";
export {
  GhostNodeFrontmatterSchema,
  NodeIdSchema,
  NodeRefSchema,
} from "./schema.js";
export { serializeNode } from "./serialize.js";
export {
  carriesConcreteMaterial,
  extractSkeletonFences,
  extractSkeletonSections,
  type FencedBlock,
  hasSubstantialFencedExample,
  hasThreeLineFence,
  type SkeletonSection,
  stripSkeletonSections,
} from "./steering.js";
export {
  GHOST_NODE_SCHEMA,
  type GhostNodeDocument,
  type GhostNodeFrontmatter,
  type GhostNodeLintIssue,
  type GhostNodeLintReport,
  type GhostNodeLintSeverity,
} from "./types.js";
