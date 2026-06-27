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
 * A node ref points at another node: a local id, or a cross-package ref
 * `<package>#<id>`. The `<package>` prefix is accepted here so future
 * cross-package links validate; resolution is a later phase. `<package>` is an
 * npm-style name (optionally scoped): `@scope/name` or `name`.
 */
const NodeRefSchema = z
  .string()
  .min(1)
  .regex(
    /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*#|[a-z0-9][a-z0-9._-]*#)?[a-z0-9][a-z0-9._-]*$/,
    {
      message:
        "node ref must be a local id or a cross-package ref '<package>#<id>'",
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
    id: NodeIdSchema,
    under: NodeRefSchema.optional(),
    relates: z.array(NodeRelationSchema).optional(),
    incarnation: z.string().min(1).optional(),
  })
  .strict();

export { NodeIdSchema, NodeRefSchema };
