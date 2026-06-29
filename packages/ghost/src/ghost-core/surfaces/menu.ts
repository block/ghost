import {
  GHOST_SURFACE_ROOT_ID,
  type GhostSurfaceEdge,
  type GhostSurfacesDocument,
} from "./types.js";

export interface SurfaceMenuEntry {
  id: string;
  description?: string;
  parent: string;
  edges: GhostSurfaceEdge[];
}

/**
 * The deterministic list of surfaces with their authored descriptions, for a
 * host agent to match a natural-language ask against. Ghost does no NLP — it
 * hands over a labeled menu and lets the agent pick.
 *
 * Always includes the implicit `core` root (described generically if not
 * declared). Sorted by id for stable output.
 */
export function buildSurfaceMenu(
  surfaces: GhostSurfacesDocument | undefined,
): SurfaceMenuEntry[] {
  const entries = new Map<string, SurfaceMenuEntry>();

  entries.set(GHOST_SURFACE_ROOT_ID, {
    id: GHOST_SURFACE_ROOT_ID,
    description: "The product-wide surface; true everywhere.",
    parent: GHOST_SURFACE_ROOT_ID,
    edges: [],
  });

  for (const surface of surfaces?.surfaces ?? []) {
    entries.set(surface.id, {
      id: surface.id,
      ...(surface.description ? { description: surface.description } : {}),
      parent: surface.parent ?? GHOST_SURFACE_ROOT_ID,
      edges: surface.edges ?? [],
    });
  }

  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}
