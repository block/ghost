import { ancestorChain, buildParentMap } from "../surfaces/cascade.js";
import {
  GHOST_SURFACE_ROOT_ID,
  type GhostSurfacesDocument,
} from "../surfaces/types.js";
import type { GhostCheckDocument } from "./types.js";

/** Why a check is relevant to a diff: placed on a touched surface, or cascaded. */
export type CheckRelevance =
  | { kind: "own"; surface: string }
  | { kind: "ancestor"; surface: string; via: string };

export interface RoutedCheck {
  check: GhostCheckDocument;
  relevance: CheckRelevance;
}

/**
 * Select the markdown checks relevant to a set of touched surfaces,
 * deterministically and with no LLM. A check governs a touched surface when its
 * `surface:` equals that surface (own) or any ancestor of it (cascade) — the
 * same rule the slice resolver uses for context. An unplaced check governs
 * `core`, so it applies to every diff.
 *
 * Ghost selects and emits; it never runs the check. The host agent evaluates
 * the markdown rule.
 */
export function selectChecksForSurfaces(
  checks: GhostCheckDocument[],
  surfaces: GhostSurfacesDocument | undefined,
  touchedSurfaces: string[],
): RoutedCheck[] {
  const parentOf = buildParentMap(surfaces);

  // For each touched surface, the set of surfaces whose checks apply: itself
  // plus its ancestors (up to and including core). Track, per governing
  // surface, the nearest touched surface it cascades into (for provenance).
  const governing = new Map<string, CheckRelevance>();
  for (const touched of touchedSurfaces) {
    record(governing, touched, { kind: "own", surface: touched });
    for (const ancestor of ancestorChain(touched, parentOf)) {
      record(governing, ancestor, {
        kind: "ancestor",
        surface: ancestor,
        via: touched,
      });
    }
  }
  // core governs every diff even when no surface was touched.
  record(governing, GHOST_SURFACE_ROOT_ID, {
    kind: "own",
    surface: GHOST_SURFACE_ROOT_ID,
  });

  const routed: RoutedCheck[] = [];
  for (const check of checks) {
    const placement = check.frontmatter.surface ?? GHOST_SURFACE_ROOT_ID;
    const relevance = governing.get(placement);
    if (relevance) routed.push({ check, relevance });
  }
  return routed;
}

/**
 * Record a governing surface, preferring "own" over "ancestor" if both arise
 * (a surface that is both touched and an ancestor of another touched surface
 * reports as own).
 */
function record(
  governing: Map<string, CheckRelevance>,
  surface: string,
  relevance: CheckRelevance,
): void {
  const existing = governing.get(surface);
  if (existing && existing.kind === "own") return;
  if (existing && relevance.kind === "ancestor") return;
  governing.set(surface, relevance);
}
