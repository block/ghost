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

/**
 * Zod schema for a `ghost.node/v1` frontmatter block.
 *
 * Validates a node in isolation. Identity and containment are not here: they
 * come from the node's file path. Kind is the filename prefix, never a
 * frontmatter field.
 */
export const GhostNodeFrontmatterSchema = z
  .object({
    description: z.string().min(1).optional(),
    materials: z
      .array(
        z
          .string()
          .min(1)
          .superRefine((locator, ctx) => {
            const message = validateMaterialLocator(locator);
            if (message !== null) ctx.addIssue({ code: "custom", message });
          }),
      )
      .optional(),
    // `relates` (and all typed edges) were removed. Reject it with a message
    // that names the key so authors get a clear signal.
    relates: z
      .never({ message: "`relates` is a removed key (edges no longer exist)" })
      .optional(),
  })
  // Passthrough, not strict: authors may add free-form descriptive keys
  // (e.g. `audience`, `stage`) that describe what the node is. ghost does not
  // gate on them — they ride along as part of the node's descriptive surface.
  .passthrough();

export { NodeIdSchema, NodeRefSchema };
