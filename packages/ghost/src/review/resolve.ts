import {
  classifyMaterialLocator,
  type GhostCatalog,
  type MaterialTransportOptions,
  materialLocator,
  materialLocatorClaimsPath,
  NodeIdSchema,
  parseCheckReference,
  UsageError,
} from "#ghost-core";
import type { LoadedCheck } from "../scan/check-files.js";
import { parseTouchedFiles, type TouchedFile } from "./diff.js";

export interface MatchedMaterialNode {
  id: string;
  files: string[];
  locators: string[];
}

export interface OfferedCheck {
  id: string;
  severity: string | undefined;
  offered: "matched" | "always" | "explicit";
  via: string[];
  explicitVia?: string[];
}

export interface CoverageGap {
  kind: "unmatched-file" | "unchecked-material";
  detail: string;
  files?: string[];
  nodes?: string[];
}

export interface ReviewResolution {
  explicitNodeIds: string[];
  touchedFiles: TouchedFile[];
  materialNodes: MatchedMaterialNode[];
  offeredChecks: OfferedCheck[];
  gaps: CoverageGap[];
}

/** Validate the complete selection before any review work; identities are exact. */
export function validateExplicitReviewNodes(
  catalog: GhostCatalog,
  ids: readonly string[] = [],
): string[] {
  const uniqueIds = [...new Set(ids)];
  const invalid = uniqueIds.filter(
    (id) => !NodeIdSchema.safeParse(id).success || !catalog.nodes.has(id),
  );
  if (invalid.length > 0) {
    throw new UsageError(
      `Invalid or unknown review node IDs: ${invalid.map((id) => JSON.stringify(id)).join(", ")}. Run ghost gather --format json with the same --package to find exact node IDs.`,
    );
  }
  return uniqueIds;
}

export function resolveReview(
  catalog: GhostCatalog,
  checks: Map<string, LoadedCheck>,
  diffText: string,
  transport: MaterialTransportOptions,
  nodeIds: readonly string[] = [],
): ReviewResolution {
  const explicitNodeIds = validateExplicitReviewNodes(catalog, nodeIds);
  const explicitNodes = new Set(explicitNodeIds);
  const touchedFiles = parseTouchedFiles(diffText);
  const materialNodeIds = new Set<string>();
  const matched = new Map<
    string,
    { files: Set<string>; locators: Set<string> }
  >();
  const claimedFiles = new Set<string>();

  for (const node of catalog.nodes.values()) {
    const localLocators = (node.materials ?? [])
      .map(materialLocator)
      .filter((locator) => classifyMaterialLocator(locator).kind === "local");
    if (localLocators.length === 0) continue;
    materialNodeIds.add(node.id);
    for (const file of touchedFiles) {
      // Resolve each locator the same way validate does: package-relative
      // `materials/…` locators expand to their repo-relative form before
      // matching diff paths (which git emits repo-relative). Matching the
      // raw locator text silently missed every exact-path locator whenever
      // the package lives below the repo root.
      const locators = localLocators.filter((locator) =>
        materialLocatorClaimsPath(locator, file.path, transport),
      );
      if (locators.length === 0) continue;
      claimedFiles.add(file.path);
      const entry = matched.get(node.id) ?? {
        files: new Set<string>(),
        locators: new Set<string>(),
      };
      entry.files.add(file.path);
      for (const locator of locators) entry.locators.add(locator);
      matched.set(node.id, entry);
    }
  }

  const touchedMaterialNodes = new Set(matched.keys());
  const referencedMaterialNodes = new Set<string>();
  const offeredChecks: OfferedCheck[] = [];

  for (const check of checks.values()) {
    const matchedRefs: string[] = [];
    const explicitRefs: string[] = [];
    let referencesMaterial = false;
    for (const raw of check.references) {
      const ref = parseCheckReference(raw);
      if (ref === null) continue;
      if (explicitNodes.has(ref.nodeId)) explicitRefs.push(raw);
      if (materialNodeIds.has(ref.nodeId)) {
        referencesMaterial = true;
        referencedMaterialNodes.add(ref.nodeId);
        if (touchedMaterialNodes.has(ref.nodeId)) matchedRefs.push(raw);
      }
    }
    if (
      matchedRefs.length > 0 ||
      !referencesMaterial ||
      explicitRefs.length > 0
    ) {
      offeredChecks.push({
        id: check.id,
        severity: check.doc.frontmatter.severity,
        offered:
          matchedRefs.length > 0
            ? "matched"
            : !referencesMaterial
              ? "always"
              : "explicit",
        via:
          matchedRefs.length > 0
            ? matchedRefs
            : !referencesMaterial
              ? check.references.slice()
              : explicitRefs,
        ...(explicitRefs.length > 0 ? { explicitVia: explicitRefs } : {}),
      });
    }
  }

  const gaps: CoverageGap[] = [];
  const unmatched = touchedFiles
    .map((file) => file.path)
    .filter((path) => !claimedFiles.has(path));
  if (unmatched.length > 0) {
    gaps.push({
      kind: "unmatched-file",
      detail:
        explicitNodeIds.length > 0
          ? "changed files have no local material locator matches"
          : "changed files match no node `materials` locators — no ghost package guidance claims them",
      files: unmatched,
    });
  }

  const unchecked = [...touchedMaterialNodes].filter(
    (id) => !referencedMaterialNodes.has(id),
  );
  if (unchecked.length > 0) {
    gaps.push({
      kind: "unchecked-material",
      detail:
        "touched material-backed nodes have no check referencing them — review coverage is missing",
      nodes: unchecked,
    });
  }

  const matchedNodes = [...matched].map(([id, entry]) => ({
    id,
    files: [...entry.files].sort(),
    locators: [...entry.locators].sort(),
  }));

  return {
    explicitNodeIds,
    touchedFiles,
    materialNodes: matchedNodes,
    offeredChecks,
    gaps,
  };
}
