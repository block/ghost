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
import type { PullMiss } from "../observability-events.js";
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
}

export const GHOST_DEFAULT_FALLBACK_BODY =
  "The package has no authored policy for decisions its selected guidance does not cover. Continue with ordinary reasoning for reversible choices. Ask before consequential, irreversible, or brand-defining choices. Never present provisional reasoning as ghost-backed guidance.";

const NO_GUIDANCE_HEADING = /^##[ \t]+If no guidance applies[ \t]*$/im;

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
    return emptyMissResult(
      selectedRequested,
      missed,
      coverId,
      snapshot.invalid,
    );
  }

  const givenNodes = known.map(
    (id) => selectableNodes.get(id) as GhostCatalogNode,
  );
  const orderedSelectedNodes =
    (options.order ?? "steering") === "given"
      ? givenNodes
      : orderPulledNodes(givenNodes);
  const nodesToPull = [
    ...(snapshot.cover.state === "resolved" ? [snapshot.cover.node] : []),
    ...orderedSelectedNodes,
  ];
  const packageDir = snapshot.package.dir;
  const pulledNodes = await resolvePulledNodes(
    nodesToPull,
    options.repoRoot,
    packageDir,
    options.inlineMaterials !== false,
  );
  dedupeInlinedMaterials(pulledNodes);
  const materialCounts = sumMaterialCounts(pulledNodes);
  const coverPulled =
    snapshot.cover.state === "resolved" ? pulledNodes[0] : undefined;
  const selectedPulled =
    snapshot.cover.state === "resolved" ? pulledNodes.slice(1) : pulledNodes;
  const fallback = fallbackForCover(snapshot.cover);

  return {
    kind: "pull",
    diagnostics: snapshot.invalid,
    requested: selectedRequested,
    ids: known,
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

function formatPulledNode({ node, materials }: PulledNode): GhostPulledNode {
  return {
    id: node.id,
    ...(node.kind !== undefined ? { kind: node.kind } : {}),
    ...(node.for ? { for: node.for } : {}),
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
    !NO_GUIDANCE_HEADING.test(cover.node.body)
  ) {
    return { source: "ghost-default", body: GHOST_DEFAULT_FALLBACK_BODY };
  }
  return undefined;
}
