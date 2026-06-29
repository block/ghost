import type { GhostFingerprintDocument } from "../fingerprint/types.js";
import { resolveSurfaceSlice, type SliceProvenance } from "./resolve.js";
import type { GhostSurfacesDocument } from "./types.js";

/** A single grounding item, carrying its slice provenance (own | ancestor | edge). */
export interface GroundingItem {
  ref: string;
  kind: "principle" | "contract" | "pattern" | "exemplar";
  statement: string;
  /** Concrete source path (exemplars only). */
  path?: string;
  provenance: SliceProvenance;
}

export interface SurfaceGrounding {
  surface: string;
  /** Design intent a finding can cite: principles + experience contracts. */
  why: GroundingItem[];
  /** What good looks like: composition patterns + inventory exemplars. */
  what: GroundingItem[];
}

/**
 * Project a surface's composed slice into review grounding — the *why*
 * (principles, contracts) and the *what to change* (patterns, exemplars). Pure:
 * reuses `resolveSurfaceSlice` (own + inherited ancestors + edges) and maps it;
 * no new traversal, no I/O, no LLM.
 *
 * A check that fires on a surface is grounded here: the agent cites the why and
 * points at the what. Inherited (ancestor) items carry their provenance so the
 * consumer can show brand-wide vs. surface-specific grounding.
 */
export function groundSurface(
  surfaces: GhostSurfacesDocument | undefined,
  fingerprint: GhostFingerprintDocument,
  surfaceId: string,
): SurfaceGrounding {
  const slice = resolveSurfaceSlice(surfaces, fingerprint, surfaceId);

  const why: GroundingItem[] = [
    ...slice.principles.map((entry) => ({
      ref: `intent.principle:${entry.node.id}`,
      kind: "principle" as const,
      statement: entry.node.principle,
      provenance: entry.provenance,
    })),
    ...slice.experience_contracts.map((entry) => ({
      ref: `intent.experience_contract:${entry.node.id}`,
      kind: "contract" as const,
      statement: entry.node.contract,
      provenance: entry.provenance,
    })),
  ];

  const what: GroundingItem[] = [
    ...slice.patterns.map((entry) => ({
      ref: `composition.pattern:${entry.node.id}`,
      kind: "pattern" as const,
      statement: entry.node.pattern,
      provenance: entry.provenance,
    })),
    ...exemplarsForSurface(fingerprint, slice.surface, slice.ancestors),
  ];

  return { surface: surfaceId, why, what };
}

/**
 * Exemplars are inventory nodes; the slice resolver covers intent/composition,
 * so gather exemplars here by the same placement rule (own surface or any
 * ancestor, unplaced → core).
 */
function exemplarsForSurface(
  fingerprint: GhostFingerprintDocument,
  surfaceId: string,
  ancestors: string[],
): GroundingItem[] {
  const cascade = new Set<string>([surfaceId, ...ancestors]);
  const items: GroundingItem[] = [];
  for (const exemplar of fingerprint.inventory.exemplars) {
    const placement = exemplar.surface ?? "core";
    if (!cascade.has(placement)) continue;
    items.push({
      ref: `inventory.exemplar:${exemplar.id}`,
      kind: "exemplar",
      statement: exemplar.title ?? exemplar.why ?? exemplar.id,
      path: exemplar.path,
      provenance:
        placement === surfaceId
          ? { kind: "own" }
          : { kind: "ancestor", surface: placement },
    });
  }
  return items;
}
