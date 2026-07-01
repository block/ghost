/**
 * Public surface for `ghost.node/v1` — the node artifact: markdown +
 * frontmatter, the single unit a fingerprint graph is made of. Phase 1 ships
 * schema + types + parse + serialize only. The loader fold (reading nodes into
 * the in-memory graph) and graph-level lint are later phases. See
 * docs/ideas/phase-1-node-schema.md.
 */

export { lintGhostNode, type ParseNodeResult, parseNode } from "./parse.js";
export {
  GhostNodeFrontmatterSchema,
  NodeIdSchema,
  NodeRefSchema,
} from "./schema.js";
export { serializeNode } from "./serialize.js";
export {
  GHOST_NODE_SCHEMA,
  type GhostNodeDocument,
  type GhostNodeFrontmatter,
  type GhostNodeLintIssue,
  type GhostNodeLintReport,
  type GhostNodeLintSeverity,
} from "./types.js";
