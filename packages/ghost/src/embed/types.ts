import type {
  CatalogMenuEntry,
  GhostCatalogNode,
  GhostGlossaryKind,
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
  undescribed: number;
}

export interface GhostGatherContract {
  completeness: {
    complete: true;
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
  noAsk: string;
}

export interface GhostGatherResult {
  kind: "menu";
  ask?: string;
  source: {
    artifact: "ghost package";
    list: "Available guidance";
  };
  contract: GhostGatherContract;
  cover: GhostCoverState;
  silence: {
    ifNoneApply: string;
  };
  coverage: GhostGatherCoverage;
  kinds?: readonly GhostMenuKind[];
  /** Selectable menu entries. A resolved cover is intentionally separated. */
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
  description?: string;
  declaredMaterials?: readonly string[];
  materials?: readonly TransportedMaterial[];
  body: string;
}

export interface GhostPullResult {
  kind: "pull";
  requested: readonly string[];
  ids: readonly string[];
  missed: readonly PullMiss[];
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
