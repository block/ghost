import { parseQualifiedRef } from "../model/ids.js";
import type { HauntPackage } from "../model/types.js";
import { parseTouchedFiles, type TouchedFile } from "./diff.js";
import { matchesGlob } from "./glob.js";

/** One inventory entry matched by the diff, with the files that hit it. */
export interface MatchedInventory {
  id: string;
  /** The touched file paths that matched this inventory's globs. */
  files: string[];
}

/** A check offered for the agent to judge, with why it was surfaced. */
export interface OfferedCheck {
  id: string;
  severity: string | undefined;
  /** The grounded refs that intersected the touched graph (why it's offered). */
  via: string[];
  /**
   * Whether the check grounds in a tenet — a signal it is likely high-altitude
   * (agent-judged) rather than mechanical. Not authoritative; the agent decides.
   */
  groundsTenet: boolean;
}

/** A touched file that no inventory entry claims — unbridged. */
export interface CoverageGap {
  kind: "unbridged-file" | "ungraded-inventory";
  detail: string;
  files?: string[];
}

export interface BridgeResolution {
  touchedFiles: TouchedFile[];
  inventory: MatchedInventory[];
  /** Surface ids that `use` any matched inventory. */
  surfaces: string[];
  /** Tenet ids reachable via matched surfaces' `honors`. */
  tenets: string[];
  /** Checks offered because they ground in a touched tenet/surface/inventory. */
  offeredChecks: OfferedCheck[];
  /** Where the fingerprint cannot grade — the anti-rot signal. */
  gaps: CoverageGap[];
}

/**
 * The inventory bridge (Slice 3). Deterministic, no LLM: given a validated
 * package and a diff, walk the edges to decide what is in play, which checks to
 * offer, and where coverage is missing.
 *
 *   diff files → inventory (via `paths`)
 *              → surfaces  (which `use` that inventory)
 *              → tenets    (which those surfaces `honor`)
 *   offered checks = every check that `grounds` in any touched inventory/surface/tenet
 *   gaps          = touched files no inventory claims; touched inventory no check grounds
 *
 * Checks are *offered*, never enforced — the host agent judges relevance against
 * the diff and the grounded prose (see notes/haunt-shape.md).
 */
export function resolveBridge(
  pkg: HauntPackage,
  diffText: string,
): BridgeResolution {
  const touchedFiles = parseTouchedFiles(diffText);

  // --- diff files → inventory ---
  const matched = new Map<string, string[]>();
  const claimedFiles = new Set<string>();
  for (const inv of pkg.inventory.values()) {
    const globs = inv.frontmatter.paths ?? [];
    const hits: string[] = [];
    for (const file of touchedFiles) {
      if (globs.some((g) => matchesGlob(g, file.path))) {
        hits.push(file.path);
        claimedFiles.add(file.path);
      }
    }
    if (hits.length > 0) matched.set(inv.id, hits);
  }

  const touchedInventory = new Set(matched.keys());

  // --- inventory → surfaces (uses) ---
  const touchedSurfaces = new Set<string>();
  for (const surface of pkg.surfaces.values()) {
    const uses = surface.frontmatter.uses ?? [];
    if (uses.some((u) => touchedInventory.has(u))) {
      touchedSurfaces.add(surface.id);
    }
  }

  // --- surfaces → tenets (honors) ---
  const touchedTenets = new Set<string>();
  for (const id of touchedSurfaces) {
    for (const t of pkg.surfaces.get(id)?.frontmatter.honors ?? []) {
      if (pkg.tenets.has(t)) touchedTenets.add(t);
    }
  }

  // --- offered checks: grounds ∩ touched graph ---
  const offeredChecks: OfferedCheck[] = [];
  for (const check of pkg.checks.values()) {
    const via: string[] = [];
    let groundsTenet = false;
    for (const ref of check.frontmatter.grounds) {
      const { tier, id } = parseQualifiedRef(ref);
      const hit =
        (tier === "inventory" && touchedInventory.has(id)) ||
        (tier === "surfaces" && touchedSurfaces.has(id)) ||
        (tier === "tenets" && touchedTenets.has(id));
      if (hit) {
        via.push(ref);
        if (tier === "tenets") groundsTenet = true;
      }
    }
    if (via.length > 0) {
      offeredChecks.push({
        id: check.id,
        severity: check.frontmatter.severity,
        via,
        groundsTenet,
      });
    }
  }

  // --- coverage gaps ---
  const gaps: CoverageGap[] = [];

  const unbridged = touchedFiles
    .map((f) => f.path)
    .filter((p) => !claimedFiles.has(p));
  if (unbridged.length > 0) {
    gaps.push({
      kind: "unbridged-file",
      detail:
        "changed files match no inventory `paths` — no material claims them, so nothing is graded here",
      files: unbridged,
    });
  }

  // Touched inventory that no offered check grounds against → ungraded material.
  const groundedInventory = new Set<string>();
  for (const check of pkg.checks.values()) {
    for (const ref of check.frontmatter.grounds) {
      const { tier, id } = parseQualifiedRef(ref);
      if (tier === "inventory") groundedInventory.add(id);
    }
  }
  const ungraded = [...touchedInventory].filter(
    (id) => !groundedInventory.has(id),
  );
  // Only a gap if none of the tenets/surfaces this inventory feeds are graded
  // either — otherwise the material is covered transitively.
  const gradedTenets = new Set<string>();
  const gradedSurfaces = new Set<string>();
  for (const check of pkg.checks.values()) {
    for (const ref of check.frontmatter.grounds) {
      const { tier, id } = parseQualifiedRef(ref);
      if (tier === "tenets") gradedTenets.add(id);
      if (tier === "surfaces") gradedSurfaces.add(id);
    }
  }
  const trulyUngraded = ungraded.filter((invId) => {
    // Find surfaces using this inventory; if any is graded (directly or via a
    // graded tenet), the material is covered transitively.
    for (const surface of pkg.surfaces.values()) {
      if (!(surface.frontmatter.uses ?? []).includes(invId)) continue;
      if (gradedSurfaces.has(surface.id)) return false;
      if ((surface.frontmatter.honors ?? []).some((t) => gradedTenets.has(t)))
        return false;
    }
    return true;
  });
  if (trulyUngraded.length > 0) {
    gaps.push({
      kind: "ungraded-inventory",
      detail:
        "touched inventory has no grounding check (directly or via a graded surface/tenet) — drift unmeasured",
      files: trulyUngraded,
    });
  }

  return {
    touchedFiles,
    inventory: [...matched].map(([id, files]) => ({ id, files })),
    surfaces: [...touchedSurfaces],
    tenets: [...touchedTenets],
    offeredChecks,
    gaps,
  };
}
