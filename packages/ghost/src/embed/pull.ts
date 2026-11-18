import { resolve } from "node:path";
import {
  classifyMaterialLocator,
  closestIds,
  extractSkeletonFences,
  type GhostCatalogNode,
  type GhostMaterial,
  type MaterialTransportResult,
  normalizeMaterial,
  resolveLocalMaterialLocator,
  stripSkeletonSections,
  transportMaterials,
  UsageError,
} from "#ghost-core";
import { guidanceDiagnostics } from "../internal/load-diagnostics.js";
import type { PullMiss } from "../observability-events.js";
import {
  cascadeClosure,
  fallbackPolicy,
  materialRoot,
} from "../scan/cascade.js";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type {
  GhostEmbedSnapshot,
  GhostPulledNode,
  GhostPulledSkeleton,
  GhostPullFallback,
  GhostPullOrder,
  GhostPullResult,
} from "./types.js";

interface PulledNode {
  node: GhostCatalogNode;
  materials: MaterialTransportResult;
  repoRoot: string;
  packageId?: string;
  packageDir?: string;
}

export const GHOST_DEFAULT_FALLBACK_BODY =
  "The package has no authored policy for decisions its selected guidance does not cover. Continue with ordinary reasoning for reversible choices. Ask before consequential, irreversible, or brand-defining choices. Never present provisional reasoning as ghost-backed guidance.";

const CASCADE_RULE_AUTHORITY =
  "Guidance moves from general to specific; universal guidance is followed by the brand's guidance. A node's `requires` field lists the nodes it builds on. Where a node's rule differs from a rule in a node it requires, directly or through other nodes, follow the node's own rule; the rest of the required node still applies. A rule marked `!important` is the exception: only another `!important` rule in a node that requires it can override it. If rules conflict and neither node `requires` the other, report the conflict instead of guessing.";

export async function pullGhostNodes(
  snapshot: GhostEmbedSnapshot,
  options: {
    ids?: readonly string[];
    repoRoot: string;
    inlineMaterials?: boolean;
    order?: GhostPullOrder;
  },
): Promise<GhostPullResult> {
  if (snapshot.cover.state === "dangling") {
    throw new UsageError(
      `manifest cover "${snapshot.cover.id}" does not match any node. Fix manifest.yml cover or add .ghost/${snapshot.cover.id}.md before pulling.`,
    );
  }

  const coverId =
    snapshot.cover.state === "resolved" ? snapshot.cover.id : undefined;
  const selectableNodes = new Map(
    [...snapshot.catalog.nodes].filter(([id]) => id !== coverId),
  );
  const selectableIds = [...selectableNodes.keys()];
  const requested = [...new Set(options.ids ?? [])];
  const selectedRequested = requested.filter((id) => id !== coverId);
  const known = selectedRequested.filter((id) => selectableNodes.has(id));
  const missed: PullMiss[] = selectedRequested
    .filter((id) => !selectableNodes.has(id))
    .map((id) => ({ requested: id, suggested: closestIds(id, selectableIds) }));

  if (known.length === 0 && missed.length > 0) {
    const packet = emptyMissResult(
      selectedRequested,
      missed,
      coverId,
      guidanceDiagnostics(snapshot),
    );
    return snapshot.cascade
      ? { ...packet, provenance: snapshot.cascade.provenance }
      : packet;
  }

  const givenNodes = known.map(
    (id) => selectableNodes.get(id) as GhostCatalogNode,
  );
  const orderedSelectedNodes =
    (options.order ?? "steering") === "given"
      ? givenNodes
      : orderPulledNodes(givenNodes);
  const nodesToPull = snapshot.cascade
    ? cascadeClosure(
        snapshot.catalog.nodes,
        [...snapshot.cascade.core, ...known],
        snapshot.cascade.universalNodeIds,
      )
    : [
        ...(snapshot.cover.state === "resolved" ? [snapshot.cover.node] : []),
        ...orderedSelectedNodes,
      ];
  const packageDir = snapshot.package.dir;
  const pulledNodes = await resolvePulledNodes(
    nodesToPull,
    options.repoRoot,
    packageDir,
    options.inlineMaterials !== false,
    snapshot.cascade,
  );
  dedupeInlinedMaterials(pulledNodes);
  const materialCounts = sumMaterialCounts(pulledNodes);
  const coverPulled =
    snapshot.cover.state === "resolved" ? pulledNodes[0] : undefined;
  const selectedPulled =
    snapshot.cover.state === "resolved" ? pulledNodes.slice(1) : pulledNodes;
  const fallback = snapshot.cascade?.hasAuthoredFallback
    ? undefined
    : fallbackForCover(snapshot.cover);

  return {
    kind: "pull",
    diagnostics: guidanceDiagnostics(snapshot),
    requested: selectedRequested,
    ids: snapshot.cascade ? nodesToPull.map((node) => node.id) : known,
    ...(snapshot.cascade
      ? {
          provenance: snapshot.cascade.provenance,
          authority: CASCADE_RULE_AUTHORITY,
        }
      : {}),
    missed,
    cover:
      coverPulled !== undefined
        ? {
            state: "resolved",
            id: coverPulled.node.id,
            node: formatPulledNode(coverPulled),
          }
        : { state: "absent" },
    ...(fallback ? { fallback } : {}),
    nodes: selectedPulled.map(formatPulledNode),
    skeletons: pulledSkeletons(pulledNodes),
    materialCounts,
  };
}

function emptyMissResult(
  requested: readonly string[],
  missed: readonly PullMiss[],
  coverId: string | undefined,
  diagnostics: GhostPullResult["diagnostics"],
): GhostPullResult {
  return {
    kind: "pull",
    diagnostics,
    requested,
    ids: [],
    missed,
    cover: {
      state: "not-emitted",
      ...(coverId !== undefined ? { id: coverId } : {}),
    },
    nodes: [],
    skeletons: [],
    materialCounts: { inlined: 0, omitted: 0 },
  };
}

async function resolvePulledNodes(
  nodes: readonly GhostCatalogNode[],
  repoRoot: string,
  packageDir: string,
  inlineMaterials: boolean,
  cascade: GhostEmbedSnapshot["cascade"],
): Promise<PulledNode[]> {
  const universalIds = new Set(cascade?.universalNodeIds);
  return Promise.all(
    nodes.map(async (node) => {
      const universal = universalIds.has(node.id);
      const ownerDir = universal
        ? (cascade?.universalDir ?? packageDir)
        : packageDir;
      const ownerRoot = cascade ? materialRoot(ownerDir, repoRoot) : repoRoot;
      return {
        node,
        repoRoot: ownerRoot,
        packageDir: cascade ? ownerDir : undefined,
        packageId: (universal
          ? cascade?.provenance.universal
          : cascade?.provenance.package
        )?.id,
        materials: inlineMaterials
          ? await transportMaterials(node.materials, {
              repoRoot: ownerRoot,
              packageDir: ownerDir,
              materialsDir: GHOST_MATERIALS_DIR,
            })
          : locatorOnlyMaterials(node.materials, ownerRoot, ownerDir),
      };
    }),
  );
}

/**
 * Inline each distinct file once per pull. Nodes are already in output order,
 * so the first node that carries a file inlines it; every later declaration of
 * the same resolved path becomes a pointer at the copy already in context.
 * Mechanical, not selective: nothing is dropped and no relevance decision is
 * made — repeating identical bytes only dilutes context and inflates the
 * file's apparent salience.
 */
function dedupeInlinedMaterials(nodes: readonly PulledNode[]): void {
  const firstCarrier = new Map<string, string>();
  for (const { node, materials, repoRoot } of nodes) {
    for (const material of materials.materials) {
      if (material.inlined === undefined || material.path === undefined) {
        continue;
      }
      const path = resolve(repoRoot, material.path);
      const carrier = firstCarrier.get(path);
      if (carrier === undefined) {
        firstCarrier.set(path, node.id);
        continue;
      }
      materials.materials[materials.materials.indexOf(material)] = {
        locator: material.locator,
        ...(material.note !== undefined ? { note: material.note } : {}),
        tier: material.tier,
        path: material.path,
        omitted: true,
        reason: `content inlined above under node ${carrier}`,
      };
      materials.inlined -= 1;
      materials.omitted += 1;
    }
  }
}

function orderPulledNodes(
  nodes: readonly GhostCatalogNode[],
): GhostCatalogNode[] {
  return nodes
    .map((node, index) => ({
      node,
      index,
      bucket: steeringBucket(node),
    }))
    .sort((a, b) => a.bucket - b.bucket || a.index - b.index)
    .map((entry) => entry.node);
}

function steeringBucket(node: GhostCatalogNode): number {
  if (node.concrete) return 1;
  return 2;
}

function locatorOnlyMaterials(
  declarations: readonly GhostMaterial[] | undefined,
  repoRoot: string,
  packageDir: string,
): MaterialTransportResult {
  return {
    materials: (declarations ?? []).map((declaration) => {
      const { locator, note } = normalizeMaterial(declaration);
      return {
        locator,
        ...(note !== undefined ? { note } : {}),
        tier:
          classifyMaterialLocator(locator).kind === "url"
            ? "url"
            : resolveLocalMaterialLocator(locator, {
                repoRoot,
                packageDir,
                materialsDir: GHOST_MATERIALS_DIR,
              }).tier,
      };
    }),
    inlined: 0,
    omitted: 0,
  };
}

function sumMaterialCounts(nodes: readonly PulledNode[]): {
  inlined: number;
  omitted: number;
} {
  return nodes.reduce(
    (sum, { materials }) => ({
      inlined: sum.inlined + materials.inlined,
      omitted: sum.omitted + materials.omitted,
    }),
    { inlined: 0, omitted: 0 },
  );
}

function pulledSkeletons(nodes: readonly PulledNode[]): GhostPulledSkeleton[] {
  return nodes.flatMap(({ node }) =>
    extractSkeletonFences(node.body).map((fence) => ({
      nodeId: node.id,
      ...(fence.info ? { info: fence.info } : {}),
      content: fence.content,
    })),
  );
}

function formatPulledNode({
  node,
  materials,
  packageId,
  packageDir,
}: PulledNode): GhostPulledNode {
  return {
    id: node.id,
    ...(packageId !== undefined ? { packageId, packageDir } : {}),
    ...(node.kind !== undefined ? { kind: node.kind } : {}),
    ...(node.for ? { for: node.for } : {}),
    ...(node.requires?.length ? { requires: [...node.requires] } : {}),
    ...(node.materials !== undefined
      ? { declaredMaterials: [...node.materials] }
      : {}),
    ...(node.materials !== undefined ? { materials: materials.materials } : {}),
    body: stripSkeletonSections(node.body),
  };
}

function fallbackForCover(
  cover: GhostEmbedSnapshot["cover"],
): GhostPullFallback | undefined {
  if (cover.state === "absent") {
    return { source: "ghost-default", body: GHOST_DEFAULT_FALLBACK_BODY };
  }
  if (
    cover.state === "resolved" &&
    !fallbackPolicy(cover.node.body, { legacy: true })
  ) {
    return { source: "ghost-default", body: GHOST_DEFAULT_FALLBACK_BODY };
  }
  return undefined;
}
