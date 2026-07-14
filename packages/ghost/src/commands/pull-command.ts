import type { CAC } from "cac";
import {
  classifyMaterialLocator,
  closestIds,
  extractSkeletonFences,
  type GhostCatalogNode,
  type MaterialTransportResult,
  resolveLocalMaterialLocator,
  stripSkeletonSections,
  type TransportedMaterial,
  transportMaterials,
} from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import {
  appendGhostEvent,
  type PullMiss,
  resolveRunId,
} from "../observability-events.js";
import {
  GHOST_EVENTS_FILENAME,
  GHOST_MATERIALS_DIR,
} from "../scan/constants.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { resolveGitRoot } from "../scan/package-paths.js";
import { failFromError } from "./errors.js";

interface PulledNode {
  node: GhostCatalogNode;
  materials: MaterialTransportResult;
}

interface PulledSkeleton {
  nodeId: string;
  info?: string;
  content: string;
}

export function registerPullCommand(cli: CAC): void {
  cli
    .command(
      "pull <...ids>",
      "Emit the named nodes' full prose bodies, and append the pull to the events tape.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option(
      "--no-materials",
      "Emit material locators only; do not inline files",
    )
    .option("--order <mode>", "Output order: steering or given", {
      default: "steering",
    })
    .option("--no-events", `Skip appending to .ghost/${GHOST_EVENTS_FILENAME}`)
    .option(
      "--run <id>",
      "Attribute the tape event to this run id (default: GHOST_RUN_ID)",
    )
    .action(async (ids: string[], opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }
        if (opts.order !== "steering" && opts.order !== "given") {
          console.error("Error: --order must be 'steering' or 'given'");
          process.exit(2);
          return;
        }

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const catalog = loaded.catalog;

        const requested = [...new Set(ids)];
        const allIds = [...catalog.nodes.keys()];
        const known = requested.filter((id) => catalog.nodes.has(id));
        const missed: PullMiss[] = requested
          .filter((id) => !catalog.nodes.has(id))
          .map((id) => ({ requested: id, suggested: closestIds(id, allIds) }));

        for (const miss of missed) {
          const hint =
            miss.suggested.length > 0
              ? ` (did you mean ${miss.suggested.map((s) => `\`${s}\``).join(", ")}?)`
              : "";
          console.error(`Warning: unknown node \`${miss.requested}\`${hint}`);
        }
        if (missed.length > 0) {
          console.error("Run `ghost gather` to list every node.");
        }

        const givenNodes = known.map(
          (id) => catalog.nodes.get(id) as GhostCatalogNode,
        );
        const nodes =
          opts.order === "given"
            ? givenNodes
            : orderPulledNodes(givenNodes, loaded.manifest.cover);
        const pulledNodes = await resolvePulledNodes(
          nodes,
          paths.packageDir,
          opts.materials !== false,
        );
        const counts = sumMaterialCounts(pulledNodes);

        if (opts.events !== false) {
          const runId = resolveRunId(opts.run);
          await appendGhostEvent(paths.packageDir, {
            event: "pull",
            ...(runId ? { run: runId } : {}),
            ids: known,
            inlinedMaterials: counts.inlined,
            omittedMaterials: counts.omitted,
            ...(missed.length > 0 ? { missed } : {}),
          });
        }

        if (known.length === 0) {
          process.exit(2);
          return;
        }

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "pull",
                ...(missed.length > 0 ? { missed } : {}),
                nodes: pulledNodes.map(({ node, materials }) => ({
                  id: node.id,
                  ...(node.kind !== undefined ? { kind: node.kind } : {}),
                  ...(node.description
                    ? { description: node.description }
                    : {}),
                  ...(node.materials !== undefined
                    ? {
                        materials:
                          opts.materials === false
                            ? node.materials
                            : materials.materials.map(formatJsonMaterial),
                      }
                    : {}),
                  body: stripSkeletonSections(node.body),
                })),
                skeletons: pulledSkeletons(pulledNodes),
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(formatPullMarkdown(pulledNodes));
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

async function resolvePulledNodes(
  nodes: GhostCatalogNode[],
  packageDir: string,
  inlineMaterials: boolean,
): Promise<PulledNode[]> {
  const repoRoot = await resolveGitRoot(process.cwd());
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

function orderPulledNodes(
  nodes: GhostCatalogNode[],
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
  locators: string[] | undefined,
  repoRoot: string,
  packageDir: string,
): MaterialTransportResult {
  return {
    materials: (locators ?? []).map((locator) => ({
      locator,
      tier:
        classifyMaterialLocator(locator).kind === "url"
          ? "url"
          : resolveLocalMaterialLocator(locator, {
              repoRoot,
              packageDir,
              materialsDir: GHOST_MATERIALS_DIR,
            }).tier,
    })),
    inlined: 0,
    omitted: 0,
  };
}

function sumMaterialCounts(nodes: PulledNode[]): {
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

function pulledSkeletons(nodes: PulledNode[]): PulledSkeleton[] {
  return nodes.flatMap(({ node }) =>
    extractSkeletonFences(node.body).map((fence) => ({
      nodeId: node.id,
      ...(fence.info ? { info: fence.info } : {}),
      content: fence.content,
    })),
  );
}

function formatJsonMaterial(material: TransportedMaterial): {
  locator: string;
  tier: TransportedMaterial["tier"];
  inlined?: string;
  omitted?: true;
  reason?: string;
  inspect?: string;
} {
  return {
    locator: material.locator,
    tier: material.tier,
    ...(material.inlined !== undefined ? { inlined: material.inlined } : {}),
    ...(material.omitted
      ? { omitted: true as const, reason: material.reason ?? "not inlined" }
      : {}),
    ...(material.reason === "binary inspect-pointer"
      ? { inspect: material.path ?? material.locator }
      : {}),
  };
}

function formatPullMarkdown(nodes: PulledNode[]): string {
  const sections: string[] = [];
  for (const { node, materials } of nodes) {
    const kind = node.kind ? ` _(${node.kind})_` : "";
    const lines = [`# \`${node.id}\`${kind}`];
    if (node.description) lines.push("", `> ${node.description}`);
    lines.push("", stripSkeletonSections(node.body).trim());
    if (materials.materials.length > 0) {
      lines.push("", "Materials:");
      for (const material of materials.materials) {
        if (material.inlined !== undefined) {
          const info = material.path ?? material.locator;
          lines.push("", `\`\`\`${info}`, material.inlined.trimEnd(), "```");
        } else if (material.reason === "binary inspect-pointer") {
          lines.push(
            `- inspect: ${material.path ?? material.locator} — view this image before generating`,
          );
        } else {
          const reason = material.omitted
            ? ` — ${material.reason ?? "not inlined"}`
            : "";
          lines.push(`- ${material.locator}${reason}`);
        }
      }
    }
    sections.push(lines.join("\n"));
  }

  const skeletons = pulledSkeletons(nodes);
  if (skeletons.length > 0) {
    const lines = [
      "# Skeletons — begin the artifact from this structure",
      "",
      "Begin the artifact from the matching structure below verbatim, then fill it.",
    ];
    for (const skeleton of skeletons) {
      lines.push("", `## From \`${skeleton.nodeId}\``, "");
      const info = skeleton.info ? skeleton.info : "";
      lines.push(`\`\`\`${info}`, skeleton.content.trimEnd(), "```");
    }
    sections.push(lines.join("\n"));
  }

  return `${sections.join("\n\n---\n\n")}\n`;
}
