import type { ZodIssue } from "zod";
import { GhostSurfacesSchema } from "./schema.js";
import {
  GHOST_SURFACE_ROOT_ID,
  type GhostSurfacesDocument,
  type GhostSurfacesLintIssue,
  type GhostSurfacesLintReport,
} from "./types.js";

/**
 * Lint a `ghost.surfaces/v1` document for document-level correctness that the
 * schema cannot express in isolation: the containment tree (parent refs, no
 * cycles), the composition graph (edge refs), the reserved root, duplicate ids,
 * and teaching warnings for near-miss references.
 *
 * Containment (`parent`) is tree-constrained: cycles and self-parents are
 * errors. Composition (`edges`) may form a graph, including cycles among edges;
 * only dangling edge targets are errors.
 */
export function lintGhostSurfaces(input: unknown): GhostSurfacesLintReport {
  const result = GhostSurfacesSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostSurfacesDocument;
  const issues: GhostSurfacesLintIssue[] = [];

  const ids = new Set<string>();
  for (const surface of doc.surfaces) ids.add(surface.id);
  // `core` is always a resolvable target (implicit root) even if not declared.
  const knownIds = new Set(ids);
  knownIds.add(GHOST_SURFACE_ROOT_ID);

  checkDuplicateIds(doc, issues);
  checkReservedCore(doc, issues);
  checkParentRefs(doc, knownIds, issues);
  checkParentCycles(doc, issues);
  checkEdgeRefs(doc, ids, issues);
  checkNearMissIds(doc, ids, issues);

  return finalize(issues);
}

function checkDuplicateIds(
  doc: GhostSurfacesDocument,
  issues: GhostSurfacesLintIssue[],
): void {
  const seen = new Map<string, number>();
  doc.surfaces.forEach((surface, index) => {
    const previous = seen.get(surface.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "duplicate-id",
        message: `surface id '${surface.id}' is duplicated (also at surfaces[${previous}])`,
        path: `surfaces[${index}].id`,
      });
    } else {
      seen.set(surface.id, index);
    }
  });
}

function checkReservedCore(
  doc: GhostSurfacesDocument,
  issues: GhostSurfacesLintIssue[],
): void {
  // `core` is the implicit root: it may be declared (to describe it) but may
  // never have a parent.
  doc.surfaces.forEach((surface, index) => {
    if (surface.id === GHOST_SURFACE_ROOT_ID && surface.parent !== undefined) {
      issues.push({
        severity: "error",
        rule: "surface-core-reserved",
        message: `'${GHOST_SURFACE_ROOT_ID}' is the reserved implicit root and cannot declare a parent`,
        path: `surfaces[${index}].parent`,
      });
    }
  });
}

function checkParentRefs(
  doc: GhostSurfacesDocument,
  knownIds: Set<string>,
  issues: GhostSurfacesLintIssue[],
): void {
  doc.surfaces.forEach((surface, index) => {
    if (surface.parent === undefined) return;
    if (!knownIds.has(surface.parent)) {
      issues.push({
        severity: "error",
        rule: "surface-parent-unknown",
        message: `parent '${surface.parent}' does not match any surface id`,
        path: `surfaces[${index}].parent`,
      });
    }
  });
}

function checkParentCycles(
  doc: GhostSurfacesDocument,
  issues: GhostSurfacesLintIssue[],
): void {
  const parentOf = new Map<string, string | undefined>();
  for (const surface of doc.surfaces) parentOf.set(surface.id, surface.parent);

  doc.surfaces.forEach((surface, index) => {
    const visited = new Set<string>([surface.id]);
    let current = surface.parent;
    while (current !== undefined && current !== GHOST_SURFACE_ROOT_ID) {
      if (visited.has(current)) {
        issues.push({
          severity: "error",
          rule: "surface-parent-cycle",
          message: `surface '${surface.id}' is part of a parent cycle (revisits '${current}')`,
          path: `surfaces[${index}].parent`,
        });
        return;
      }
      visited.add(current);
      // Only walk ids that exist; an unknown parent is reported separately.
      if (!parentOf.has(current)) return;
      current = parentOf.get(current);
    }
  });
}

function checkEdgeRefs(
  doc: GhostSurfacesDocument,
  ids: Set<string>,
  issues: GhostSurfacesLintIssue[],
): void {
  // Edge targets must be declared surfaces. Unlike `parent`, edges do not get
  // the implicit-`core` exemption: an edge must point at a real surface.
  doc.surfaces.forEach((surface, index) => {
    surface.edges?.forEach((edge, edgeIndex) => {
      if (!ids.has(edge.to)) {
        issues.push({
          severity: "error",
          rule: "surface-edge-unknown",
          message: `edge '${edge.kind}' target '${edge.to}' does not match any surface id`,
          path: `surfaces[${index}].edges[${edgeIndex}].to`,
        });
      }
    });
  });
}

function checkNearMissIds(
  doc: GhostSurfacesDocument,
  ids: Set<string>,
  issues: GhostSurfacesLintIssue[],
): void {
  const candidates = [...ids];

  doc.surfaces.forEach((surface, index) => {
    if (surface.parent !== undefined && !ids.has(surface.parent)) {
      const near = nearest(surface.parent, candidates);
      if (near) {
        issues.push({
          severity: "warning",
          rule: "surface-id-near-miss",
          message: `parent '${surface.parent}' is unknown; did you mean '${near}'?`,
          path: `surfaces[${index}].parent`,
        });
      }
    }
    surface.edges?.forEach((edge, edgeIndex) => {
      if (!ids.has(edge.to)) {
        const near = nearest(edge.to, candidates);
        if (near) {
          issues.push({
            severity: "warning",
            rule: "surface-id-near-miss",
            message: `edge target '${edge.to}' is unknown; did you mean '${near}'?`,
            path: `surfaces[${index}].edges[${edgeIndex}].to`,
          });
        }
      }
    });
  });
}

/** Nearest candidate within edit distance 2, or null. */
function nearest(value: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of candidates) {
    const distance = levenshtein(value, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= 2 ? best : null;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) dist[i][0] = i;
  for (let j = 0; j < cols; j++) dist[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }
  return dist[a.length][b.length];
}

function zodIssues(issues: ZodIssue[]): GhostSurfacesLintIssue[] {
  return issues.map((issue) => ({
    severity: "error" as const,
    rule: `schema/${issue.code}`,
    message: issue.message,
    path: formatZodPath(issue.path),
  }));
}

function formatZodPath(path: ZodIssue["path"]): string | undefined {
  if (path.length === 0) return undefined;
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") return `${formatted}[${segment}]`;
    const key = String(segment);
    return formatted ? `${formatted}.${key}` : key;
  }, "");
}

function finalize(issues: GhostSurfacesLintIssue[]): GhostSurfacesLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
