import { NodeIdSchema } from "../node/schema.js";

/**
 * A parsed `source:` reference: the node path id it points at, plus the
 * optional heading anchor (`checkout/payment > Confirmation` → nodeId
 * `checkout/payment`, heading `Confirmation`).
 */
export interface ParsedSourceRef {
  nodeId: string;
  heading?: string;
}

/**
 * Parse the check `source:` reference grammar — `<node-id> > <Heading>`.
 * Splits on the *first* `>` and trims both parts. Returns `null` when the
 * node-id part is not a valid node path id (or the input is empty); the
 * heading is present only when a non-empty anchor follows the `>`. This is
 * shape validation only — whether the node (or heading) exists is the
 * caller's concern: an unresolved ref may name not-yet-written prose.
 */
export function parseSourceRef(raw: string): ParsedSourceRef | null {
  const splitAt = raw.indexOf(">");
  const nodePart = (splitAt === -1 ? raw : raw.slice(0, splitAt)).trim();
  if (!NodeIdSchema.safeParse(nodePart).success) {
    return null;
  }
  const heading = splitAt === -1 ? "" : raw.slice(splitAt + 1).trim();
  return heading.length > 0
    ? { nodeId: nodePart, heading }
    : { nodeId: nodePart };
}

/**
 * Slice the section a heading anchor points at out of a node body. Matches the
 * first markdown heading line (any level) whose text equals `heading`
 * case-insensitively, then returns everything up to the next heading of the
 * same or higher level (or end of body), trimmed. Returns `null` when no
 * heading matches.
 */
export function sliceNodeSection(body: string, heading: string): string | null {
  const wanted = heading.trim().toLowerCase();
  const lines = body.split("\n");
  const headingPattern = /^(#{1,6})\s+(.*)$/;

  let startLine = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const match = headingPattern.exec(lines[i]);
    if (match && match[2].trim().toLowerCase() === wanted) {
      startLine = i;
      level = match[1].length;
      break;
    }
  }
  if (startLine === -1) {
    return null;
  }

  let endLine = lines.length;
  for (let i = startLine + 1; i < lines.length; i += 1) {
    const match = headingPattern.exec(lines[i]);
    if (match && match[1].length <= level) {
      endLine = i;
      break;
    }
  }

  return lines
    .slice(startLine + 1, endLine)
    .join("\n")
    .trim();
}
