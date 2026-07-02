import { sliceNodeSection } from "@anarchitecture/ghost-fingerprint/core";
import type { LoadedFingerprintPackage } from "../fingerprint/load.js";
import { classifyReference } from "../model/ids.js";
import type { HauntPackage } from "../model/types.js";

/** The referenced prose a check enforces — local inventory or a fingerprint node. */
export interface BaselineProse {
  /** The reference string as authored (e.g. `modals` or `checkout > Density`). */
  ref: string;
  /** `local` (inventory) or `fingerprint` (a .ghost/ node). */
  kind: "local" | "fingerprint";
  description?: string;
  body: string;
  /** Set when a heading anchor did not match — the whole body is embedded. */
  warning?: string;
}

/**
 * Resolve one reference to its baseline prose: local inventory prose, or a
 * fingerprint node body — sliced by `sliceNodeSection` when a heading anchor
 * is present (whole body if no anchor; whole body plus a warning line when
 * the anchor doesn't match). Unresolved refs return null (tolerated: they may
 * name not-yet-written prose; `haunt validate` reports them).
 */
export function resolveBaseline(
  raw: string,
  pkg: HauntPackage,
  fingerprint: LoadedFingerprintPackage,
  localIds: ReadonlySet<string>,
): BaselineProse | null {
  const ref = classifyReference(raw, localIds);
  if (ref.kind === "local") {
    const doc = pkg.inventory.get(ref.id);
    if (!doc) return null;
    return {
      ref: raw,
      kind: "local",
      ...(doc.frontmatter.description !== undefined
        ? { description: doc.frontmatter.description }
        : {}),
      body: doc.body,
    };
  }
  if (ref.kind === "malformed") return null;

  const node = fingerprint.catalog.nodes.get(ref.nodeId);
  if (!node) return null;
  if (ref.heading === undefined) {
    return {
      ref: raw,
      kind: "fingerprint",
      ...(node.description !== undefined
        ? { description: node.description }
        : {}),
      body: node.body,
    };
  }
  const section = sliceNodeSection(node.body, ref.heading);
  if (section === null) {
    return {
      ref: raw,
      kind: "fingerprint",
      ...(node.description !== undefined
        ? { description: node.description }
        : {}),
      body: node.body,
      warning: `heading '${ref.heading}' not found in node '${ref.nodeId}' — embedding the whole body`,
    };
  }
  return {
    ref: raw,
    kind: "fingerprint",
    ...(node.description !== undefined
      ? { description: node.description }
      : {}),
    body: section,
  };
}
