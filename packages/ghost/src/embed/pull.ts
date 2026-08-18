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
} from "#ghost-core";
import type { PullMiss } from "../observability-events.js";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type {
  GhostEmbedSnapshot,
  GhostPulledSkeleton,
  GhostPullOrder,
  GhostPullResult,
} from "./types.js";

interface PulledNode {
  node: GhostCatalogNode;
  materials: MaterialTransportResult;
}

export async function pullGhostNodes(
  snapshot: GhostEmbedSnapshot,
  options: {
    ids: readonly string[];
    repoRoot: string;
    inlineMaterials?: boolean;
    order?: GhostPullOrder;
  },
): Promise<GhostPullResult> {
  const requested = [...new Set(options.ids)];
  const allIds = [...snapshot.catalog.nodes.keys()];
  const known = requested.filter((id) => snapshot.catalog.nodes.has(id));
  const missed: PullMiss[] = requested
    .filter((id) => !snapshot.catalog.nodes.has(id))
    .map((id) => ({ requested: id, suggested: closestIds(id, allIds) }));
  const givenNodes = known.map(
    (id) => snapshot.catalog.nodes.get(id) as GhostCatalogNode,
  );
  const orderedNodes =
    (options.order ?? "steering") === "given"
      ? givenNodes
      : orderPulledNodes(
          givenNodes,
          snapshot.cover.state === "resolved" ? snapshot.cover.id : undefined,
        );
  const packageDir = snapshot.package.dir;
  const pulledNodes = await resolvePulledNodes(
    orderedNodes,
    options.repoRoot,
    packageDir,
    options.inlineMaterials !== false,
  );
  dedupeInlinedMaterials(pulledNodes);
  const materialCounts = sumMaterialCounts(pulledNodes);

  return {
    kind: "pull",
    requested,
    ids: known,
    missed,
    nodes: pulledNodes.map(({ node, materials }) => ({
      id: node.id,
      ...(node.kind !== undefined ? { kind: node.kind } : {}),
      ...(node.description ? { description: node.description } : {}),
      ...(node.materials !== undefined
        ? { declaredMaterials: [...node.materials] }
        : {}),
      ...(node.materials !== undefined
        ? { materials: materials.materials }
        : {}),
      body: stripSkeletonSections(node.body),
    })),
    skeletons: pulledSkeletons(pulledNodes),
    materialCounts,
  };
}

async function resolvePulledNodes(
  nodes: readonly GhostCatalogNode[],
  repoRoot: string,
  packageDir: string,
  inlineMaterials: boolean,
): Promise<PulledNode[]> {
  return Promise.all(
    nodes.map(async (node) => ({
      node,
      materials: inlineMaterials
        ? await transportMaterials(node.materials, {
            repoRoot,
            packageDir,
            materialsDir: GHOST_MATERIALS_DIR,
          })
        : locatorOnlyMaterials(node.materials, repoRoot, packageDir),
    })),
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
  for (const { node, materials } of nodes) {
    for (const material of materials.materials) {
      if (material.inlined === undefined || material.path === undefined) {
        continue;
      }
      const carrier = firstCarrier.get(material.path);
      if (carrier === undefined) {
        firstCarrier.set(material.path, node.id);
        continue;
      }
      delete material.inlined;
      material.omitted = true;
      material.reason = `content inlined above under node ${carrier}`;
      materials.inlined -= 1;
      materials.omitted += 1;
    }
  }
}

function orderPulledNodes(
  nodes: readonly GhostCatalogNode[],
  coverId: string | undefined,
): GhostCatalogNode[] {
  return nodes
    .map((node, index) => ({
      node,
      index,
      bucket: steeringBucket(node, coverId),
    }))
    .sort((a, b) => a.bucket - b.bucket || a.index - b.index)
    .map((entry) => entry.node);
}

function steeringBucket(
  node: GhostCatalogNode,
  coverId: string | undefined,
): number {
  if (coverId !== undefined && node.id === coverId) return 0;
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
