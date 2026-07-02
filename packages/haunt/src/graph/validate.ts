import type { LoadedFingerprintPackage } from "../fingerprint/load.js";
import { classifyReference } from "../model/ids.js";
import {
  finalizeReport,
  type HauntLintIssue,
  type HauntLintReport,
  type HauntPackage,
} from "../model/types.js";

/**
 * Reference validation. Assumes each document already parsed and
 * per-document-validated (loadHauntPackage). For each check reference:
 *   - a bare slug matching local inventory → ok (local-first);
 *   - a fingerprint-shaped target → looked up in the loaded catalog when a
 *     fingerprint is present (warning when it does not resolve — it may name
 *     not-yet-written prose); an info note when no fingerprint resolves at all;
 *   - a string that parses as neither → error.
 * Inventory `paths` glob sanity checks survive from the earlier shape.
 */
export function validateHauntGraph(
  pkg: HauntPackage,
  fingerprint: LoadedFingerprintPackage | null = null,
): HauntLintReport {
  const issues: HauntLintIssue[] = [];
  const localIds = new Set(pkg.inventory.keys());

  let hasFingerprintRefs = false;
  for (const check of pkg.checks.values()) {
    for (const raw of check.references) {
      const ref = classifyReference(raw, localIds);
      if (ref.kind === "local") continue;
      if (ref.kind === "malformed") {
        issues.push({
          severity: "error",
          rule: "reference/malformed",
          where: `checks/${check.id}.references`,
          message: `reference '${raw}' is neither a local inventory id nor a fingerprint node target (node path id with optional '> Heading' anchor)`,
        });
        continue;
      }
      hasFingerprintRefs = true;
      if (fingerprint !== null && !fingerprint.catalog.nodes.has(ref.nodeId)) {
        issues.push({
          severity: "warning",
          rule: "reference/fingerprint-unresolved",
          where: `checks/${check.id}.references`,
          message: `reference '${raw}' does not resolve in the .ghost/ fingerprint (node '${ref.nodeId}' not found — it may name not-yet-written prose)`,
        });
      }
    }
  }

  if (hasFingerprintRefs && fingerprint === null) {
    issues.push({
      severity: "info",
      rule: "reference/no-fingerprint",
      where: "checks",
      message:
        "checks reference fingerprint nodes but no .ghost/ package resolves — `ghost-haunt review` requires one (npm i -D @anarchitecture/ghost-fingerprint && ghost init)",
    });
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
