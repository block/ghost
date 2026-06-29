import { GHOST_SURFACE_ROOT_ID, type GhostSurfacesDocument } from "./types.js";

/** Build a child→parent lookup from a surfaces document. */
export function buildParentMap(
  surfaces: GhostSurfacesDocument | undefined,
): Map<string, string | undefined> {
  const parentOf = new Map<string, string | undefined>();
  for (const surface of surfaces?.surfaces ?? []) {
    parentOf.set(surface.id, surface.parent);
  }
  return parentOf;
}

/**
 * The parent chain from `surfaceId` up to the implicit `core` root, excluding
 * the surface itself. `core` is always the final ancestor (the cascade root)
 * unless the surface *is* core. Guards against cycles defensively (lint already
 * rejects them).
 *
 * This is the single definition of "what cascades down to a surface" — used by
 * both the slice resolver (context) and check routing (governance).
 */
export function ancestorChain(
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
  if (surfaceId !== GHOST_SURFACE_ROOT_ID) chain.push(GHOST_SURFACE_ROOT_ID);
  return chain;
}
