import { z } from "zod";
import { validateMaterialLocator } from "../materials.js";

/**
 * A node id is its path within the package, `.md` dropped (`marketing/email`).
 * Directory nesting is only file organization; it does not create parents,
 * ancestors, or semantic hierarchy. A segment is a permissive lowercase slug
 * (alphanumeric plus `.` `_` `-`); segments join with `/`. No leading,
 * trailing, or doubled slash. Ids are computed by the loader from the file
 * path, never authored in frontmatter.
 */
const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;

const NodeIdSchema = z.string().min(1).regex(NODE_ID_PATTERN, {
  message:
    "node id must be a path of lowercase slug segments joined by '/' (alphanumeric plus . _ -, no leading/trailing/doubled slash)",
});

const NodeRefSchema = z.string().min(1).regex(NODE_ID_PATTERN, {
  message: "node ref must be a path id like 'marketing/email'",
});

const MaterialLocatorSchema = z
  .string()
  .min(1)
  .superRefine((locator, ctx) => {
    const message = validateMaterialLocator(locator);
    if (message !== null) ctx.addIssue({ code: "custom", message });
  });

const AnnotatedMaterialSchema = z
  .object({
    locator: MaterialLocatorSchema,
    note: z.string().trim().min(1).optional(),
  })
  .strict();

/**
 * Zod schema for a `ghost.node/v1` frontmatter block.
 *
 * Validates a node in isolation. Identity and containment are not here: they
 * come from the node's file path. Kind is the filename prefix, never a
 * frontmatter field.
 */
export const GhostNodeFrontmatterSchema = z
  .object({
    for: z.string().min(1).optional(),
    scope: z
      .never({
        message:
          "scope is derived from the filename; remove scope from frontmatter",
      })
      .optional(),
    layer: z
      .never({
        message:
          "layer is derived from the filename; remove layer from frontmatter",
      })
      .optional(),
    requires: z.array(NodeIdSchema).optional(),
    materials: z
      .array(z.union([MaterialLocatorSchema, AnnotatedMaterialSchema]))
      .optional(),
    // The retrieval payload field is `for`. Reject near-miss keys that would
    // otherwise ride along silently and leave the node invisible to gather.
    context: z
      .never({ message: "`context` is not a node key; use `for`" })
      .optional(),
    description: z
      .never({ message: "`description` is not a node key; use `for`" })
      .optional(),
    // `relates` was removed. `requires` names explicit prerequisites only.
    relates: z
      .never({
        message: "`relates` is a removed key; use `requires` for prerequisites",
      })
      .optional(),
  })
  .strict();

export const LegacyNodeFrontmatterSchema = GhostNodeFrontmatterSchema.omit({
  scope: true,
  layer: true,
}).passthrough();

export { NodeIdSchema, NodeRefSchema };
