import { resolve } from "node:path";
import {
  classifyMaterialLocator,
  closestIds,
  extractSkeletonFences,
  type GhostCatalogNode,
  type GhostMaterial,
  inspectLayeredContext,
  isLayeredPackage,
  LAYERED_AUTHORITY,
  type MaterialTransportResult,
  normalizeMaterial,
  orderLayeredNodes,
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
  packageDir: string;
  repoRoot: string;
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
  if (snapshot.framing.state === "dangling") {
    throw new UsageError(
      `framing node "${snapshot.framing.id}" is missing; add framing.md before pulling.`,
    );
  }

  const framingId =
    snapshot.framing.state === "resolved" ? snapshot.framing.id : undefined;
  const selectableNodes = new Map(
    [...snapshot.catalog.nodes].filter(([id]) => id !== framingId),
  );
  const selectableIds = [...selectableNodes.keys()];
  const requested = [...new Set(options.ids ?? [])];
  const selectedRequested = requested.filter((id) => id !== framingId);
  const known = selectedRequested.filter((id) => selectableNodes.has(id));
  const missed: PullMiss[] = selectedRequested
    .filter((id) => !selectableNodes.has(id))
    .map((id) => ({
      requested: id,
      suggested: closestIds(id, selectableIds),
    }));

  const manifest = {
    ...snapshot.package.manifest,
    core: snapshot.core ? [...snapshot.core] : snapshot.package.manifest.core,
  };
  const layered = isLayeredPackage(snapshot.package.manifest);
  const expanded = layered;
  const invalidRequested = selectedRequested.find((id) =>
    snapshot.invalid.some(
      (entry) =>
        (entry.file === `${id}.md` ||
          entry.file ===
            resolve(
              snapshot.baseline?.dir ?? snapshot.package.dir,
              `${id}.md`,
            )) &&
        (expanded ||
          /^(scope|layer|requires)|scope\/layer/.test(entry.message)),
    ),
  );
  if (invalidRequested) {
    throw new UsageError(
      `required node "${invalidRequested}" is invalid; run ghost validate`,
    );
  }
  const context = layered
    ? inspectLayeredContext(snapshot.catalog.nodes, manifest, [
        ...(framingId ? [framingId] : []),
        ...known,
      ])
    : { ids: known, issues: [] };
  if (layered && context.issues.length > 0) {
    throw new UsageError(
      context.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n"),
    );
  }

  if (known.length === 0 && missed.length > 0) {
    return emptyMissResult(
      selectedRequested,
      missed,
      framingId,
      snapshot.invalid,
      snapshot.provenance,
    );
  }

  const givenNodes = known.map(
    (id) => selectableNodes.get(id) as GhostCatalogNode,
  );
  const orderedSelectedNodes = expanded
    ? orderLayeredNodes(
        context.ids
          .filter((id) => id !== framingId)
          .map((id) => snapshot.catalog.nodes.get(id) as GhostCatalogNode),
      )
    : (options.order ?? "steering") === "given"
      ? givenNodes
      : orderPulledNodes(givenNodes);
  const nodesToPull = [
    ...(snapshot.framing.state === "resolved" ? [snapshot.framing.node] : []),
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
  const framingPulled =
    snapshot.framing.state === "resolved" ? pulledNodes[0] : undefined;
  const selectedPulled =
    snapshot.framing.state === "resolved" ? pulledNodes.slice(1) : pulledNodes;
  const fallback = fallbackForFraming(snapshot.framing);

  return {
    kind: "pull",
    provenance: snapshot.provenance,
    diagnostics: snapshot.invalid,
    requested: selectedRequested,
    ids: expanded ? orderedSelectedNodes.map((node) => node.id) : known,
    missed,
    framing:
      framingPulled !== undefined
        ? {
            state: "resolved",
            id: framingPulled.node.id,
            node: formatPulledNode(framingPulled),
          }
        : { state: "absent" },
    ...(fallback ? { fallback } : {}),
    ...(layered ? { authority: LAYERED_AUTHORITY } : {}),
    nodes: selectedPulled.map(formatPulledNode),
    skeletons: pulledSkeletons(pulledNodes),
    materialCounts,
  };
}

function emptyMissResult(
  requested: readonly string[],
  missed: readonly PullMiss[],
  framingId: string | undefined,
  diagnostics: GhostPullResult["diagnostics"],
  provenance: GhostPullResult["provenance"],
): GhostPullResult {
  return {
    kind: "pull",
    provenance,
    diagnostics,
    requested,
    ids: [],
    missed,
    framing: {
      state: "not-emitted",
      ...(framingId !== undefined ? { id: framingId } : {}),
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
      packageDir: node.packageDir ?? packageDir,
      repoRoot: node.repoRoot ?? repoRoot,
      materials: inlineMaterials
        ? await transportMaterials(node.materials, {
            repoRoot: node.repoRoot ?? repoRoot,
            packageDir: node.packageDir ?? packageDir,
            materialsDir: GHOST_MATERIALS_DIR,
          })
        : locatorOnlyMaterials(
            node.materials,
            node.repoRoot ?? repoRoot,
            node.packageDir ?? packageDir,
          ),
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
  for (const { node, materials, repoRoot } of nodes) {
    for (const material of materials.materials) {
      if (material.inlined === undefined || material.path === undefined) {
        continue;
      }
      const absolutePath = resolve(repoRoot, material.path);
      const carrier = firstCarrier.get(absolutePath);
      if (carrier === undefined) {
        firstCarrier.set(absolutePath, node.id);
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
  packageDir,
}: PulledNode): GhostPulledNode {
  return {
    id: node.id,
    packageDir,
    ...(node.kind !== undefined ? { kind: node.kind } : {}),
    ...(node.for ? { for: node.for } : {}),
    ...(node.scope !== undefined
      ? { scope: node.scope, layer: node.layer }
      : {}),
    ...(node.requires !== undefined ? { requires: [...node.requires] } : {}),
    ...(node.materials !== undefined
      ? { declaredMaterials: [...node.materials] }
      : {}),
    ...(node.materials !== undefined ? { materials: materials.materials } : {}),
    body: stripSkeletonSections(node.body),
  };
}

function fallbackForFraming(
  framing: GhostEmbedSnapshot["framing"],
): GhostPullFallback | undefined {
  if (framing.state === "absent") {
    return { source: "ghost-default", body: GHOST_DEFAULT_FALLBACK_BODY };
  }
  if (
    framing.state === "resolved" &&
    !NO_GUIDANCE_HEADING.test(framing.node.body)
  ) {
    return { source: "ghost-default", body: GHOST_DEFAULT_FALLBACK_BODY };
  }
  return undefined;
}
