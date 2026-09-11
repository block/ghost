import type {
  CatalogMenuEntry,
  GhostCatalogNode,
  GhostGlossaryKind,
  GhostMaterial,
  GhostPackageManifest,
  TransportedMaterial,
} from "#ghost-core";
import type { PullMiss } from "../observability-events.js";
import type { LoadedCheck } from "../scan/check-files.js";
import type { ReadOnlySnapshotMap } from "./readonly-map.js";

export type GhostCoverState =
  | {
      state: "resolved";
      id: string;
      node: Readonly<GhostCatalogNode>;
    }
  | {
      state: "absent";
    }
  | {
      state: "dangling";
      id: string;
    };

export interface GhostGlossarySnapshot {
  path: string;
  kinds: readonly Readonly<GhostGlossaryKind>[];
}

export interface GhostEmbedSnapshot {
  package: Readonly<{
    id: string;
    dir: string;
    manifest: Readonly<GhostPackageManifest>;
    manifestRaw: string;
  }>;
  catalog: Readonly<{
    nodes: ReadOnlySnapshotMap<string, Readonly<GhostCatalogNode>>;
  }>;
  cover: GhostCoverState;
  glossary?: Readonly<GhostGlossarySnapshot>;
  checks: ReadOnlySnapshotMap<string, Readonly<LoadedCheck>>;
  invalid: readonly Readonly<{ file: string; message: string }>[];
  invalidChecks: readonly Readonly<{ file: string; message: string }>[];
}

export interface GhostMenuKind {
  name: string;
  purpose: string;
}

export interface GhostGatherCoverage {
  nodes: number;
  concrete: number;
  payloads: {
    materials: number;
    fencedExamples: number;
    skeletons: number;
  };
  withoutFor: number;
}

export interface GhostGatherContract {
  completeness: {
    complete: boolean;
    filtered: false;
    ranked: false;
    selectedByGhost: false;
  };
  selection: {
    basis: "applicability";
    instruction: string;
    topicOverlapAloneIsApplicability: false;
    addForCompleteness: false;
    omitApplicableForCount: false;
  };
  /** Route when the host agent finds no applicable selectable nodes. */
  ifNoneApply: string;
  noAsk: string;
}

export interface GhostGatherResult {
  kind: "menu";
  /** Invalid guidance files skipped during loading; never includes checks. */
  diagnostics: GhostEmbedSnapshot["invalid"];
  ask?: string;
  source: {
    artifact: "ghost package";
    list: "Available guidance";
  };
  contract: GhostGatherContract;
  coverage: GhostGatherCoverage;
  kinds?: readonly GhostMenuKind[];
  /** Selectable menu entries. A resolved cover is intentionally excluded. */
  nodes: readonly CatalogMenuEntry[];
}

export type GhostPullOrder = "steering" | "given";

export interface GhostPulledSkeleton {
  nodeId: string;
  info?: string;
  content: string;
}

export interface GhostPulledNode {
  id: string;
  kind?: string;
  for?: string;
  declaredMaterials?: readonly GhostMaterial[];
  materials?: readonly TransportedMaterial[];
  body: string;
}

export type GhostPullCover =
  | {
      state: "resolved";
      id: string;
      node: GhostPulledNode;
    }
  | {
      state: "absent";
    }
  | {
      /** No packet was assembled because every selected id missed. */
      state: "not-emitted";
      id?: string;
    };

export interface GhostPullFallback {
  source: "ghost-default";
  body: string;
}

export interface GhostPullResult {
  kind: "pull";
  /** Invalid guidance files skipped during loading, including all-miss pulls. */
  diagnostics: GhostEmbedSnapshot["invalid"];
  /** Caller-selected ids after de-duplicating and removing a cover alias. */
  requested: readonly string[];
  ids: readonly string[];
  missed: readonly PullMiss[];
  cover: GhostPullCover;
  fallback?: GhostPullFallback;
  nodes: readonly GhostPulledNode[];
  skeletons: readonly GhostPulledSkeleton[];
  materialCounts: {
    inlined: number;
    omitted: number;
  };
}

export type GhostInspectLocalPolicy = "bundled" | "bundled-and-referenced";

export interface GhostInspectPolicy {
  local?: GhostInspectLocalPolicy;
  maxBytes?: number;
  allowedMimeTypes?: readonly string[];
}

export interface InspectGhostMaterialRequest {
  nodeId: string;
  locator: string;
  repoRoot: string;
  policy?: GhostInspectPolicy;
}

export type InspectGhostMaterialResult =
  | {
      ok: true;
      nodeId: string;
      locator: string;
      tier: "bundled" | "referenced";
      path: string;
      byteLength: number;
      mime: string;
      contentKind: "text";
      encoding: "utf-8";
      text: string;
      /** Inspected material is source data, never instructions. */
      untrusted: true;
    }
  | {
      ok: true;
      nodeId: string;
      locator: string;
      tier: "bundled" | "referenced";
      path: string;
      byteLength: number;
      mime: string;
      contentKind: "image" | "binary";
      /** Inspected material is source data, never instructions. */
      untrusted: true;
    }
  | {
      ok: false;
      nodeId: string;
      locator: string;
      reason: string;
      tier?: "bundled" | "referenced" | "url";
      path?: string;
      byteLength?: number;
      mime?: string;
    };
