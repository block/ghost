import { classifyReference } from "../model/ids.js";
import type { HauntPackage } from "../model/types.js";
import { parseTouchedFiles, type TouchedFile } from "./diff.js";
import { matchesGlob } from "./glob.js";

/** One inventory entry matched by the diff, with the files that hit it. */
export interface MatchedInventory {
  id: string;
  /** The touched file paths that matched this inventory's globs. */
  files: string[];
}

/** A check offered for the agent to weigh, with why it was surfaced. */
export interface OfferedCheck {
  id: string;
  severity: string | undefined;
  /** The references that put this check in play (why it's offered). */
  via: string[];
  /**
   * Whether the check references fingerprint prose — a signal it is likely
   * high-altitude rather than mechanical. Not authoritative; the agent decides.
   */
  referencesFingerprint: boolean;
}

/** A place where the fingerprint cannot grade — the anti-rot signal. */
export interface CoverageGap {
  kind: "unbridged-file" | "unreferenced-inventory";
  detail: string;
  files?: string[];
}

export interface BridgeResolution {
  touchedFiles: TouchedFile[];
  inventory: MatchedInventory[];
  /** Checks offered because they reference touched inventory or fingerprint prose. */
  offeredChecks: OfferedCheck[];
  /** Where the fingerprint cannot grade — the anti-rot signal. */
  gaps: CoverageGap[];
}

/**
 * The inventory bridge. Deterministic, no LLM: one hop from the diff to the
 * materials it touches.
 *
 *   diff files → inventory (via `paths`)
 *   offered checks = every check whose `references` hits a touched inventory
 *                    id, plus every check whose references are all
 *                    fingerprint-shaped (fingerprint truths are always in
 *                    play — there is no mechanical hop from a diff to a truth;
 *                    the agent weighs relevance)
 *   gaps          = touched files no inventory claims; touched inventory no
 *                    check references directly
 *
 * Checks are *offered*, never enforced — the host agent decides relevance
 * against the diff and the referenced prose (see notes/haunt-direction.md).
 */
export function resolveBridge(
  pkg: HauntPackage,
  diffText: string,
): BridgeResolution {
  const touchedFiles = parseTouchedFiles(diffText);
  const localIds = new Set(pkg.inventory.keys());

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

  // --- offered checks ---
  const offeredChecks: OfferedCheck[] = [];
  const referencedInventory = new Set<string>();
  for (const check of pkg.checks.values()) {
    const via: string[] = [];
    let referencesFingerprint = false;
    let referencesLocal = false;
    for (const raw of check.references) {
      const ref = classifyReference(raw, localIds);
      if (ref.kind === "local") {
        referencesLocal = true;
        referencedInventory.add(ref.id);
        if (touchedInventory.has(ref.id)) via.push(raw);
      } else if (ref.kind === "fingerprint") {
        referencesFingerprint = true;
      }
    }
    // Fingerprint-only checks are always offered: brand truths are always in
    // play, and no mechanical hop connects a diff to one.
    const alwaysOffered = referencesFingerprint && !referencesLocal;
    if (via.length > 0 || alwaysOffered) {
      offeredChecks.push({
        id: check.id,
        severity: check.frontmatter.severity,
        via: via.length > 0 ? via : check.references.slice(),
        referencesFingerprint,
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

  const unreferenced = [...touchedInventory].filter(
    (id) => !referencedInventory.has(id),
  );
  if (unreferenced.length > 0) {
    gaps.push({
      kind: "unreferenced-inventory",
      detail:
        "touched inventory has no check referencing it — drift unmeasured",
      files: unreferenced,
    });
  }

  return {
    touchedFiles,
    inventory: [...matched].map(([id, files]) => ({ id, files })),
    offeredChecks,
    gaps,
  };
}
