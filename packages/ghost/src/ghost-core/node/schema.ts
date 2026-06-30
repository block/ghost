import { z } from "zod";
import { GHOST_NODE_RELATION_KINDS } from "./types.js";

/**
 * A node id is its path within the package, `.md` dropped (`marketing/email`).
 * The directory tree is the containment graph: the containing directory is the
 * parent, so the id *does* encode hierarchy by design. A segment is a permissive
 * lowercase slug (alphanumeric plus `.` `_` `-`); segments join with `/`. No
 * leading, trailing, or doubled slash. Ids are computed by the loader from the
 * file path, never authored in frontmatter.
 */
const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;

const NodeIdSchema = z.string().min(1).regex(NODE_ID_PATTERN, {
  message:
    "node id must be a path of lowercase slug segments joined by '/' (alphanumeric plus . _ -, no leading/trailing/doubled slash)",
});

/**
 * A node ref points at another node by its path id (`marketing/email`), or a
 * cross-package ref `<package-id>:<path>` where `<package-id>` is a key declared
 * in the package manifest's `extends` map. The local part is a path id; `:` is
 * Ghost's cross-package qualifier lineage (e.g. the old `intent.principle:foo`).
 */
const NodeRefSchema = z
  .string()
  .min(1)
  .regex(
    new RegExp(
      `^(?:[a-z0-9][a-z0-9._-]*:)?${NODE_ID_PATTERN.source.slice(1, -1)}$`,
    ),
    {
      message:
        "node ref must be a path id 'marketing/email' or a cross-package ref '<package-id>:<path>'",
    },
  );

const NodeRelationSchema = z
  .object({
    to: NodeRefSchema,
    as: z.enum(GHOST_NODE_RELATION_KINDS).optional(),
  })
  .strict();

/**
 * Zod schema for a `ghost.node/v1` frontmatter block.
 *
 * Validates a node in isolation. Graph-level rules that need the whole package
 * — `under` / `relates` targets exist, exactly one incarnation-agnostic root, no
 * cycles, cross-package resolution — are deferred to later-phase lint, because
 * Zod cannot see other nodes from a single frontmatter.
 */
export const GhostNodeFrontmatterSchema = z
  .object({
    description: z.string().min(1).optional(),
    relates: z.array(NodeRelationSchema).optional(),
    incarnation: z.string().min(1).optional(),
  })
  // Passthrough, not strict: authors may add free-form descriptive keys
  // (e.g. `audience`, `stage`) that describe what the node is. Ghost does not
  // gate on them — they ride along as part of the node's descriptive surface.
  .passthrough();

export { NodeIdSchema, NodeRefSchema };
