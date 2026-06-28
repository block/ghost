import { z } from "zod";
import { GHOST_NODE_RELATION_KINDS } from "./types.js";

/**
 * A node id is a permissive lowercase slug, unique within the package. The
 * charset is liberal on purpose (lowercase alphanumeric plus `.` `_` `-`): the
 * schema enforces machine-tractability, not a separator style. Dashes are the
 * emitted convention (skill / init / agent authoring), nudged in guidance — not
 * a lint rule. The tree lives only in `under`; an id never encodes hierarchy.
 */
const NodeIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "node id must be a lowercase slug (alphanumeric plus . _ -, leading alphanumeric)",
  });

/**
 * A node ref points at another node: a local id (`<node>`), or a cross-package
 * ref `<package-id>:<node>` where `<package-id>` is a key declared in the
 * package manifest's `extends` map. Reference is by identity, never by path —
 * `:` is Ghost's qualifier lineage (e.g. the old `intent.principle:foo` refs).
 */
const NodeRefSchema = z
  .string()
  .min(1)
  .regex(/^(?:[a-z0-9][a-z0-9._-]*:)?[a-z0-9][a-z0-9._-]*$/, {
    message:
      "node ref must be a local id '<node>' or a cross-package ref '<package-id>:<node>'",
  });

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
    id: NodeIdSchema,
    description: z.string().min(1).optional(),
    under: NodeRefSchema.optional(),
    relates: z.array(NodeRelationSchema).optional(),
    incarnation: z.string().min(1).optional(),
  })
  // Passthrough, not strict: authors may add free-form descriptive keys
  // (e.g. `audience`, `stage`) that describe what the node is. Ghost does not
  // gate on them — they ride along as part of the node's descriptive surface.
  .passthrough();

export { NodeIdSchema, NodeRefSchema };
