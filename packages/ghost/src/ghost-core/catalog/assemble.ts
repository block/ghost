import {
  carriesConcreteMaterial,
  extractSkeletonSections,
} from "../node/steering.js";
import type { GhostNodeDocument } from "../node/types.js";
import type { GhostCatalog, GhostCatalogNode } from "./types.js";

/**
 * One local node located in the package files: its computed path id,
 * its filename-derived kind/slug, and the parsed document. There is no
 * containment axis — the catalog is flat.
 */
export interface PlacedNode {
  id: string;
  /** Optional filename prefix before the first dot (`principle.density`). */
  kind?: string;
  /** Filename slug: the bare name, or the part after the first dot. */
  slug?: string;
  doc: GhostNodeDocument;
}

export interface AssembleCatalogInput {
  /** Local nodes located in the package files. */
  placedNodes?: PlacedNode[];
  /** Kinds whose glossary kind declares `posture: wild`. */
  wildKinds?: Iterable<string>;
  /** Kinds whose glossary kind declares `posture: guard`. */
  guardKinds?: Iterable<string>;
}

/**
 * Assemble package node files into one flat in-memory catalog. Each node's id
 * is its path; kind/slug come from its filename. No edges, no cascade — the
 * agent selects from the catalog.
 */
export function assembleCatalog(input: AssembleCatalogInput): GhostCatalog {
  const nodes = new Map<string, GhostCatalogNode>();
  const wildKinds = new Set(input.wildKinds ?? []);
  const guardKinds = new Set(input.guardKinds ?? []);

  for (const placed of input.placedNodes ?? []) {
    const fm = placed.doc.frontmatter;
    const concrete = carriesConcreteMaterial({
      materials: fm.materials,
      body: placed.doc.body,
    });
    const posture =
      placed.kind !== undefined && wildKinds.has(placed.kind)
        ? "wild"
        : placed.kind !== undefined && guardKinds.has(placed.kind)
          ? "guard"
          : "steady";
    nodes.set(placed.id, {
      id: placed.id,
      ...(placed.kind !== undefined ? { kind: placed.kind } : {}),
      slug: placed.slug ?? placed.id.split("/").pop() ?? placed.id,
      ...(fm.description !== undefined ? { description: fm.description } : {}),
      ...(fm.materials !== undefined ? { materials: fm.materials } : {}),
      concrete,
      hasSkeleton: extractSkeletonSections(placed.doc.body).length > 0,
      posture,
      ...(posture === "wild" ? { wild: true as const } : {}),
      ...(posture === "guard" ? { guard: true as const } : {}),
      body: placed.doc.body,
    });
  }

  return { nodes };
}
