import { parseQualifiedRef } from "../model/ids.js";
import {
  finalizeReport,
  type HauntLintIssue,
  type HauntLintReport,
  type HauntPackage,
} from "../model/types.js";

/**
 * Cross-tier graph validation (Slice 2). Assumes each document already parsed
 * and per-document-validated (loadHauntPackage). Here we check the edges the
 * frontmatter declares:
 *   - `honors` → an existing tenet
 *   - `uses` → an existing inventory entry
 *   - `grounds` → an existing tenet/surface/inventory (tier-qualified)
 *   - inventory `paths` globs are well-formed
 * plus advisory warnings: orphan tenets (no surface honors, no check grounds),
 * inventory with no `paths` (can't bridge to code), and surfaces with no edges.
 *
 * There is no cascade to cycle over — `honors`/`uses`/`grounds` are one-way
 * citations across tiers — so no acyclicity check is needed (see
 * notes/haunt-shape.md → "no inheritance").
 */
export function validateHauntGraph(pkg: HauntPackage): HauntLintReport {
  const issues: HauntLintIssue[] = [];

  // Track incoming references for orphan detection.
  const tenetReferenced = new Set<string>();
  const inventoryReferenced = new Set<string>();

  // --- surfaces: honors → tenets, uses → inventory ---
  for (const surface of pkg.surfaces.values()) {
    for (const ref of surface.frontmatter.honors ?? []) {
      if (pkg.tenets.has(ref)) {
        tenetReferenced.add(ref);
      } else {
        issues.push({
          severity: "error",
          rule: "edge/honors-unresolved",
          where: `surfaces/${surface.id}.honors`,
          message: `honors '${ref}' does not resolve to a tenet`,
        });
      }
    }
    for (const ref of surface.frontmatter.uses ?? []) {
      if (pkg.inventory.has(ref)) {
        inventoryReferenced.add(ref);
      } else {
        issues.push({
          severity: "error",
          rule: "edge/uses-unresolved",
          where: `surfaces/${surface.id}.uses`,
          message: `uses '${ref}' does not resolve to an inventory entry`,
        });
      }
    }
  }

  // --- checks: grounds → tenets/surfaces/inventory ---
  const tenetGrounded = new Set<string>();
  for (const check of pkg.checks.values()) {
    for (const ref of check.frontmatter.grounds) {
      const { tier, id } = parseQualifiedRef(ref);
      const bucket =
        tier === "tenets"
          ? pkg.tenets
          : tier === "inventory"
            ? pkg.inventory
            : pkg.surfaces;
      if (bucket.has(id)) {
        if (tier === "tenets") {
          tenetReferenced.add(id);
          tenetGrounded.add(id);
        }
        if (tier === "inventory") inventoryReferenced.add(id);
      } else {
        issues.push({
          severity: "error",
          rule: "edge/grounds-unresolved",
          where: `checks/${check.id}.grounds`,
          message: `grounds '${ref}' does not resolve to a ${tier} entry`,
        });
      }
    }
  }

  // --- inventory: paths well-formed + present ---
  for (const inv of pkg.inventory.values()) {
    const paths = inv.frontmatter.paths ?? [];
    if (paths.length === 0) {
      issues.push({
        severity: "warning",
        rule: "inventory/no-paths",
        where: `inventory/${inv.id}`,
        message:
          "inventory entry has no `paths` — it cannot bridge to code, so no diff will resolve to it",
      });
    }
    for (const glob of paths) {
      if (!isWellFormedGlob(glob)) {
        issues.push({
          severity: "error",
          rule: "inventory/bad-glob",
          where: `inventory/${inv.id}.paths`,
          message: `path glob '${glob}' is not well-formed (must be a relative repo glob, no leading '/')`,
        });
      }
    }
  }

  // --- advisory: orphan tenets (nothing honors them, nothing grounds them) ---
  for (const tenet of pkg.tenets.values()) {
    if (!tenetReferenced.has(tenet.id)) {
      issues.push({
        severity: "warning",
        rule: "tenet/orphan",
        where: `tenets/${tenet.id}`,
        message:
          "no surface honors this tenet and no check grounds in it — it is unreachable by review",
      });
    } else if (!tenetGrounded.has(tenet.id)) {
      issues.push({
        severity: "info",
        rule: "tenet/ungrounded",
        where: `tenets/${tenet.id}`,
        message:
          "tenet is honored by a surface but no check grounds in it — drift against it will not be graded",
      });
    }
  }

  return finalizeReport(issues);
}

/**
 * A shallow well-formedness check for a repo path glob: relative, no scheme, no
 * leading slash, non-empty. We do not verify it matches anything on disk (that
 * is a runtime concern for the bridge).
 */
function isWellFormedGlob(glob: string): boolean {
  if (glob.length === 0) return false;
  if (glob.startsWith("/")) return false;
  if (/^[a-z]+:\/\//i.test(glob)) return false;
  return true;
}
