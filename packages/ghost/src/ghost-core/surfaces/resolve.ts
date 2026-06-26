import type {
  GhostFingerprintDocument,
  GhostFingerprintExperienceContract,
  GhostFingerprintPattern,
  GhostFingerprintPrinciple,
  GhostFingerprintSituation,
} from "../fingerprint/types.js";
import {
  GHOST_SURFACE_ROOT_ID,
  type GhostSurfaceEdgeKind,
  type GhostSurfacesDocument,
} from "./types.js";

/**
 * Why a node is present in a resolved slice.
 * - `own`: placed directly on the requested surface.
 * - `ancestor:<id>`: placed on an ancestor and cascaded down the tree.
 * - `edge:<kind>:<id>`: contributed by a typed composition edge (one hop).
 */
export type SliceProvenance =
  | { kind: "own" }
  | { kind: "ancestor"; surface: string }
  | { kind: "edge"; edge: GhostSurfaceEdgeKind; surface: string };

export interface SliceNode<T> {
  node: T;
  provenance: SliceProvenance;
}

export interface ResolvedSlice {
  /** The requested surface id. */
  surface: string;
  /** Ancestor chain from the surface up to (but excluding) the implicit root. */
  ancestors: string[];
  situations: SliceNode<GhostFingerprintSituation>[];
  principles: SliceNode<GhostFingerprintPrinciple>[];
  experience_contracts: SliceNode<GhostFingerprintExperienceContract>[];
  patterns: SliceNode<GhostFingerprintPattern>[];
}

/**
 * Compose the slice for a surface, deterministically and with no I/O or LLM:
 *
 * - own nodes: every fingerprint/check node whose `surface:` equals the id;
 * - cascaded ancestors: nodes placed on each `parent` up to the implicit `core`
 *   root contribute to descendants (the only inheritance — down the tree only,
 *   no mixins, no priority weights);
 * - typed edges: for each edge on the requested surface, the target surface's
 *   own nodes are included once (one hop, no recursion), tagged by edge kind.
 *
 * Unplaced nodes (no `surface:`) belong to the implicit `core` root, so they
 * cascade to every surface; lint still nudges authors to place them.
 *
 * Checks (`validate.yml`) are not placed on surfaces — they route by
 * `applies_to.paths` (the governance/path road), which is rebuilt in Phase 7.
 * The prompt-road slice is description facets only.
 */
export function resolveSurfaceSlice(
  surfaces: GhostSurfacesDocument | undefined,
  fingerprint: GhostFingerprintDocument,
  surfaceId: string,
): ResolvedSlice {
  const parentOf = new Map<string, string | undefined>();
  for (const surface of surfaces?.surfaces ?? []) {
    parentOf.set(surface.id, surface.parent);
  }

  // Ancestor chain: surfaceId's parents up to (and including) core, excluding
  // the surface itself. `core` is the implicit root every chain ends at.
  const ancestors = ancestorChain(surfaceId, parentOf);

  // The set of surfaces whose own nodes cascade in: the surface plus ancestors.
  // A node placed on any of these is "own" (for the surface) or "ancestor".
  const cascadeIds = new Set<string>([surfaceId, ...ancestors]);

  // Edge targets on the requested surface (one hop).
  const edges =
    surfaces?.surfaces.find((surface) => surface.id === surfaceId)?.edges ?? [];

  const slice: ResolvedSlice = {
    surface: surfaceId,
    ancestors,
    situations: [],
    principles: [],
    experience_contracts: [],
    patterns: [],
  };

  const placementOf = (surface: string | undefined): string =>
    surface ?? GHOST_SURFACE_ROOT_ID;

  const provenanceFor = (placement: string): SliceProvenance | null => {
    if (placement === surfaceId) return { kind: "own" };
    if (cascadeIds.has(placement)) {
      return { kind: "ancestor", surface: placement };
    }
    return null;
  };

  // Own + cascaded ancestor nodes.
  for (const node of fingerprint.intent.situations) {
    const provenance = provenanceFor(placementOf(node.surface));
    if (provenance) slice.situations.push({ node, provenance });
  }
  for (const node of fingerprint.intent.principles) {
    const provenance = provenanceFor(placementOf(node.surface));
    if (provenance) slice.principles.push({ node, provenance });
  }
  for (const node of fingerprint.intent.experience_contracts) {
    const provenance = provenanceFor(placementOf(node.surface));
    if (provenance) slice.experience_contracts.push({ node, provenance });
  }
  for (const node of fingerprint.composition.patterns) {
    const provenance = provenanceFor(placementOf(node.surface));
    if (provenance) slice.patterns.push({ node, provenance });
  }

  // Typed-edge contributions: the target surface's OWN nodes (one hop), tagged
  // by edge kind. Cascade and edges do not compose recursively.
  for (const edge of edges) {
    const edgeProvenance: SliceProvenance = {
      kind: "edge",
      edge: edge.kind,
      surface: edge.to,
    };
    for (const node of fingerprint.intent.situations) {
      if (node.surface === edge.to) {
        slice.situations.push({ node, provenance: edgeProvenance });
      }
    }
    for (const node of fingerprint.intent.principles) {
      if (node.surface === edge.to) {
        slice.principles.push({ node, provenance: edgeProvenance });
      }
    }
    for (const node of fingerprint.intent.experience_contracts) {
      if (node.surface === edge.to) {
        slice.experience_contracts.push({ node, provenance: edgeProvenance });
      }
    }
    for (const node of fingerprint.composition.patterns) {
      if (node.surface === edge.to) {
        slice.patterns.push({ node, provenance: edgeProvenance });
      }
    }
  }

  return slice;
}

/**
 * The parent chain from `surfaceId` up to the implicit `core` root, excluding
 * the surface itself. Stops at `core` (never included as an ancestor entry,
 * since `core`-placed nodes are handled as the cascade root) and guards against
 * cycles defensively (lint already rejects them).
 */
function ancestorChain(
  surfaceId: string,
  parentOf: Map<string, string | undefined>,
): string[] {
  const chain: string[] = [];
  const seen = new Set<string>([surfaceId]);
  let current = parentOf.get(surfaceId);
  while (current !== undefined && current !== GHOST_SURFACE_ROOT_ID) {
    if (seen.has(current)) break;
    chain.push(current);
    seen.add(current);
    if (!parentOf.has(current)) break;
    current = parentOf.get(current);
  }
  // `core` is always an implicit ancestor (the cascade root) unless the surface
  // *is* core.
  if (surfaceId !== GHOST_SURFACE_ROOT_ID) chain.push(GHOST_SURFACE_ROOT_ID);
  return chain;
}
