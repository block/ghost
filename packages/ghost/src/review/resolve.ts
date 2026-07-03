import {
  classifyMaterialLocator,
  type GhostCatalog,
  parseSourceRef,
} from "#ghost-core";
import type { LoadedCheck } from "../scan/haunt-tree.js";
import { parseTouchedFiles, type TouchedFile } from "./diff.js";
import { matchesGlob } from "./glob.js";

export interface MatchedMaterialNode {
  id: string;
  files: string[];
  locators: string[];
}

export interface OfferedCheck {
  id: string;
  severity: string | undefined;
  offered: "matched" | "always";
  via: string[];
}

export interface CoverageGap {
  kind: "unmatched-file" | "unguarded-material";
  detail: string;
  files?: string[];
  nodes?: string[];
}

export interface ReviewResolution {
  touchedFiles: TouchedFile[];
  materialNodes: MatchedMaterialNode[];
  offeredChecks: OfferedCheck[];
  gaps: CoverageGap[];
}

export function resolveReview(
  catalog: GhostCatalog,
  checks: Map<string, LoadedCheck>,
  diffText: string,
): ReviewResolution {
  const touchedFiles = parseTouchedFiles(diffText);
  const materialNodeIds = new Set<string>();
  const matched = new Map<
    string,
    { files: Set<string>; locators: Set<string> }
  >();
  const claimedFiles = new Set<string>();

  for (const node of catalog.nodes.values()) {
    const localLocators = (node.materials ?? []).filter(
      (locator) => classifyMaterialLocator(locator).kind === "local",
    );
    if (localLocators.length === 0) continue;
    materialNodeIds.add(node.id);
    for (const file of touchedFiles) {
      const locators = localLocators.filter((locator) =>
        matchesGlob(locator, file.path),
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
    let referencesMaterial = false;
    for (const raw of check.references) {
      const ref = parseSourceRef(raw);
      if (ref === null) continue;
      if (materialNodeIds.has(ref.nodeId)) {
        referencesMaterial = true;
        referencedMaterialNodes.add(ref.nodeId);
        if (touchedMaterialNodes.has(ref.nodeId)) matchedRefs.push(raw);
      }
    }
    if (matchedRefs.length > 0 || !referencesMaterial) {
      offeredChecks.push({
        id: check.id,
        severity: check.doc.frontmatter.severity,
        offered: matchedRefs.length > 0 ? "matched" : "always",
        via: matchedRefs.length > 0 ? matchedRefs : check.references.slice(),
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
        "changed files match no node `materials` locators — no fingerprint material claims them",
      files: unmatched,
    });
  }

  const unguarded = [...touchedMaterialNodes].filter(
    (id) => !referencedMaterialNodes.has(id),
  );
  if (unguarded.length > 0) {
    gaps.push({
      kind: "unguarded-material",
      detail:
        "touched material-backed nodes have no check referencing them — review coverage is missing",
      nodes: unguarded,
    });
  }

  return {
    touchedFiles,
    materialNodes: [...matched].map(([id, entry]) => ({
      id,
      files: [...entry.files].sort(),
      locators: [...entry.locators].sort(),
    })),
    offeredChecks,
    gaps,
  };
}
