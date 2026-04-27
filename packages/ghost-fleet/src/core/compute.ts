import { compareExpressions } from "@ghost/core";
import type {
  FleetGroupingsComputed,
  FleetMember,
  FleetPairwise,
  FleetTrack,
} from "./types.js";

/**
 * Compute the pairwise distance array between every member that has a
 * valid expression. Members without a loadable expression are dropped
 * from the matrix — they still appear in the members table.
 *
 * Order: ascending by `(a, b)` id pair, so the JSON output is reproducible.
 */
export function computePairwiseDistances(
  members: FleetMember[],
): FleetPairwise[] {
  const eligible = members.filter(
    (m) => m.expression && m.expressionStatus === "ok",
  );

  const out: FleetPairwise[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i];
      const b = eligible[j];
      if (!a.expression || !b.expression) continue;
      const cmp = compareExpressions(a.expression, b.expression);
      out.push({ a: a.id, b: b.id, distance: cmp.distance });
    }
  }

  return out.sort((x, y) => {
    if (x.a !== y.a) return x.a.localeCompare(y.a);
    return x.b.localeCompare(y.b);
  });
}

/**
 * Compute the five group-by axes from each member's map.md frontmatter.
 *
 * Axes per `docs/ideas/ghost-fleet.md`:
 *   - by_platform           map.platform
 *   - by_build_system       map.build_system
 *   - by_registry           map.registry?.path ?? "none"
 *   - by_rendering          map.composition.rendering
 *   - by_styling            map.composition.styling[0]
 *
 * Members without a parsed map.md are skipped — they show up in the
 * members table but not in the groupings.
 */
export function computeGroupings(
  members: FleetMember[],
): FleetGroupingsComputed {
  const groupings: FleetGroupingsComputed = {
    by_platform: {},
    by_build_system: {},
    by_registry: {},
    by_rendering: {},
    by_styling: {},
  };

  for (const member of members) {
    const map = member.map;
    if (!map) continue;

    // platform / build_system may be a string OR an array — the fleet
    // groupings cross-tabulate per value, so an array contributes the
    // member to each bucket it names.
    for (const value of toArray(map.platform)) {
      push(groupings.by_platform, value, member.id);
    }
    for (const value of toArray(map.build_system)) {
      push(groupings.by_build_system, value, member.id);
    }
    push(groupings.by_registry, map.registry ? "shadcn" : "none", member.id);

    const rendering = map.composition.rendering;
    push(groupings.by_rendering, rendering, member.id);

    const primaryStyling = map.composition.styling[0];
    if (primaryStyling) {
      push(groupings.by_styling, primaryStyling, member.id);
    }
  }

  // Sort each axis bucket so output is deterministic.
  for (const axis of Object.values(groupings) as Record<string, string[]>[]) {
    for (const key of Object.keys(axis)) {
      axis[key]?.sort((a, b) => a.localeCompare(b));
    }
  }

  return groupings;
}

function push(
  bucket: Record<string, string[]>,
  key: string | undefined,
  id: string,
): void {
  if (!key) return;
  if (!bucket[key]) bucket[key] = [];
  bucket[key].push(id);
}

/** Normalize a string-or-array map field to an array of strings. */
function toArray<T extends string>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Build the tracks-graph from each member's recorded `tracks` target.
 *
 * Edges read directly from `.ghost-sync.json` — fleet does not author
 * relationships (Invariant 5). The right-hand side is whatever the member
 * declared; the skill recipe interprets whether it resolves to another
 * member id or an external reference.
 */
export function computeTracks(members: FleetMember[]): FleetTrack[] {
  const out: FleetTrack[] = [];
  for (const member of members) {
    if (!member.tracks) continue;
    out.push({ from: member.id, to: member.tracks });
  }
  return out.sort((x, y) => {
    if (x.from !== y.from) return x.from.localeCompare(y.from);
    return x.to.localeCompare(y.to);
  });
}
