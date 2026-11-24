import { join } from "node:path";
import {
  classifyMaterialLocator,
  type GhostCatalogNode,
  type GhostMaterial,
  materialLocator,
  normalizeMaterial,
} from "#ghost-core";
import { formatLoadDiagnostics } from "../internal/load-diagnostics.js";
import {
  CASCADE_RULE_AUTHORITY,
  cascadeClosure,
  type GhostCascade,
} from "../scan/cascade.js";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type { LoadedGhostPackage } from "../scan/ghost-package.js";
import type { GhostProvenance } from "../scan/package-hash.js";
import { resolveGitRoot } from "../scan/package-paths.js";
import {
  neutralizeSentinels,
  untrustedBegin,
  untrustedEnd,
} from "../untrusted-framing.js";
import { type BaselineProse, resolveBaseline } from "./baseline.js";
import type { CoverageGap } from "./resolve.js";
import { resolveReview } from "./resolve.js";

export type { BaselineProse };

export interface PacketMaterialNode {
  id: string;
  kind?: string;
  for?: string;
  requires?: readonly string[];
  prose: string;
  materials: GhostMaterial[];
  matchedMaterials: string[];
  files: string[];
}

/** Explicit guidance without invented touched-file or material-match claims. */
export type PacketExplicitNode = Omit<
  PacketMaterialNode,
  "matchedMaterials" | "files"
>;

type PacketReviewNode = { packageId: string; packageDir: string } & (
  | (PacketMaterialNode & { role: "matched" })
  | (PacketExplicitNode & { role: "explicit" | "check" | "context" })
);

/** The body may already appear as guidance elsewhere in a cascade packet. */
type PacketCheckBaseline = Omit<BaselineProse, "body"> & { body?: string };

export interface PacketCheck {
  id: string;
  severity: string | undefined;
  offered: "matched" | "always" | "explicit";
  via: string[];
  explicitVia?: string[];
  prose: string;
  baseline: PacketCheckBaseline[];
}

export interface ReviewPacket {
  packageId: string;
  provenance?: GhostProvenance;
  authority?: string;
  nodes?: PacketReviewNode[];
  /** Invalid guidance and check files skipped during loading. */
  diagnostics: ReadonlyArray<Readonly<{ file: string; message: string }>>;
  touchedFiles: string[];
  materialNodes?: PacketMaterialNode[];
  /** Present only when the host explicitly names guidance for this review. */
  explicitNodeIds?: string[];
  /** Selected nodes not already included in materialNodes. */
  explicitNodes?: PacketExplicitNode[];
  checks: PacketCheck[];
  gaps: CoverageGap[];
  diff: string;
  untrusted: true;
}

export interface BuildReviewPacketOptions {
  /** Absolute path of the ghost package directory (default: cwd/.ghost). */
  packageDir?: string;
  cwd?: string;
  nodeIds?: readonly string[];
}

export async function buildReviewPacket(
  ghostPackage: LoadedGhostPackage,
  diffText: string,
  options: BuildReviewPacketOptions = {},
): Promise<ReviewPacket> {
  const cwd = options.cwd ?? process.cwd();
  const packageDir = options.packageDir ?? join(cwd, ".ghost");
  const resolution = resolveReview(
    ghostPackage.catalog,
    ghostPackage.checks,
    diffText,
    {
      repoRoot: await resolveGitRoot(cwd),
      packageDir,
      materialsDir: GHOST_MATERIALS_DIR,
    },
    options.nodeIds,
    ghostPackage.cascade,
  );

  const materialNodes: PacketMaterialNode[] = resolution.materialNodes.map(
    (matched) => materialNodeFromMatch(ghostPackage, matched),
  );

  const { cascade, catalog } = ghostPackage;
  const matchedIds = new Set(materialNodes.map((node) => node.id));
  const explicitNodes = resolution.explicitNodeIds
    .filter((id) => !matchedIds.has(id))
    .map((id) =>
      guidanceNode(catalog.nodes.get(id) as GhostCatalogNode, !!cascade),
    );
  const checkNodeIds = new Set<string>();
  const checks: PacketCheck[] = resolution.offeredChecks.map((offered) => {
    const check = ghostPackage.checks.get(offered.id);
    return {
      id: offered.id,
      severity: offered.severity,
      offered: offered.offered,
      via: offered.via,
      ...(offered.explicitVia ? { explicitVia: offered.explicitVia } : {}),
      prose: check?.doc.body.trim() ?? "",
      baseline:
        check?.references
          .map((ref) => resolveBaseline(ref, ghostPackage.catalog))
          .filter((ref): ref is BaselineProse => ref !== null)
          .map((ref): PacketCheckBaseline => {
            if (!cascade) return ref;
            checkNodeIds.add(ref.nodeId);
            const { body, ...reference } = ref;
            return reference;
          }) ?? [],
    };
  });

  const closure = cascade
    ? cascadeClosure(
        catalog.nodes,
        [
          ...cascade.core,
          ...matchedIds,
          ...resolution.explicitNodeIds,
          ...checkNodeIds,
        ],
        cascade.universalNodeIds,
      )
    : [];
  // Keep the pull order while preserving how each node entered the review.
  const nodes = cascade
    ? orderReviewNodes(
        closure,
        materialNodes,
        explicitNodes,
        checkNodeIds,
        cascade,
        packageDir,
      )
    : undefined;

  return {
    packageId: ghostPackage.manifest.id,
    ...(cascade
      ? {
          provenance: cascade.provenance,
          authority: CASCADE_RULE_AUTHORITY,
          nodes,
        }
      : {}),
    diagnostics: [...ghostPackage.invalid, ...ghostPackage.invalidChecks],
    touchedFiles: resolution.touchedFiles.map((file) => file.path),
    ...(nodes ? {} : { materialNodes }),
    ...(resolution.explicitNodeIds.length > 0
      ? {
          explicitNodeIds: resolution.explicitNodeIds,
          ...(nodes ? {} : { explicitNodes }),
        }
      : {}),
    checks,
    gaps: resolution.gaps,
    diff: diffText,
    untrusted: true,
  };
}

function orderReviewNodes(
  closure: readonly Readonly<GhostCatalogNode>[],
  materialNodes: readonly PacketMaterialNode[],
  explicitNodes: readonly PacketExplicitNode[],
  checkNodeIds: ReadonlySet<string>,
  cascade: GhostCascade,
  packageDir: string,
): PacketReviewNode[] {
  const matched = new Map(materialNodes.map((node) => [node.id, node]));
  const explicit = new Map(explicitNodes.map((node) => [node.id, node]));
  const universalIds = new Set(cascade.universalNodeIds);
  return closure.map((node) => {
    const universal = universalIds.has(node.id);
    const owner = {
      packageId:
        (universal ? cascade.provenance.universal : cascade.provenance.package)
          ?.id ?? cascade.provenance.package.id,
      packageDir: universal ? (cascade.universalDir ?? packageDir) : packageDir,
    };
    const match = matched.get(node.id);
    if (match) return { ...match, ...owner, role: "matched" };
    const selection = explicit.get(node.id);
    if (selection) return { ...selection, ...owner, role: "explicit" };
    return {
      ...guidanceNode(node, true),
      ...owner,
      role: checkNodeIds.has(node.id) ? "check" : "context",
    };
  });
}

function guidanceNode(
  node: Readonly<GhostCatalogNode>,
  cascade: boolean,
): PacketExplicitNode {
  return {
    id: node.id,
    ...(node.kind !== undefined ? { kind: node.kind } : {}),
    ...(node.for !== undefined ? { for: node.for } : {}),
    ...(cascade && node.requires?.length ? { requires: node.requires } : {}),
    prose: node.body,
    materials: node.materials ?? [],
  };
}

function materialNodeFromMatch(
  ghostPackage: LoadedGhostPackage,
  matched: { id: string; locators: string[]; files: string[] },
): PacketMaterialNode {
  const node = ghostPackage.catalog.nodes.get(matched.id) as GhostCatalogNode;
  return {
    ...guidanceNode(node, !!ghostPackage.cascade),
    matchedMaterials: matched.locators,
    files: matched.files,
  };
}

export function formatReviewPacket(packet: ReviewPacket): string {
  const out: string[] = [];
  out.push(`# ghost review — package \`${packet.packageId}\``, "");
  if (packet.diagnostics.length > 0) {
    out.push(formatLoadDiagnostics(packet.diagnostics), "");
  }
  out.push(
    "You are reviewing a diff against ghost package guidance. The command has",
    "assembled the touched files, matched material-backed nodes, and offered",
    "checks. Weigh which checks apply. Do not invent obligations that are not grounded",
    "in the ghost package guidance or check text.",
    "",
  );

  if (packet.authority) out.push("## Authority", "", packet.authority, "");

  if (packet.touchedFiles.length > 0) {
    out.push("## Touched files");
    for (const file of packet.touchedFiles) out.push(`- \`${file}\``);
    out.push("");
  }

  if (packet.nodes) {
    if (packet.nodes.length) out.push("## Guidance", "");
    for (const node of packet.nodes) {
      const materialPackage =
        node.role !== "context" &&
        node.packageId !== packet.packageId &&
        node.materials.some(
          (material) =>
            classifyMaterialLocator(materialLocator(material)).kind === "local",
        )
          ? `Material package: \`${node.packageDir}\``
          : undefined;
      if (node.role === "matched") {
        appendMatchedNode(
          out,
          node,
          packet.explicitNodeIds?.includes(node.id),
          true,
          materialPackage,
        );
      } else {
        appendProseNode(out, node, node.role, materialPackage);
      }
    }
  } else {
    appendGroupedGuidance(out, packet);
  }

  const shownNodes = new Set(
    (
      packet.nodes ?? [
        ...(packet.materialNodes ?? []),
        ...(packet.explicitNodes ?? []),
      ]
    ).map((node) => node.id),
  );
  const shownSections = new Set<string>();
  out.push("## Offered checks — weigh which apply");
  if (packet.checks.length === 0) {
    out.push("_No checks were offered for this diff._", "");
  } else {
    for (const check of packet.checks) {
      out.push(
        `### checks/${check.id}${check.severity ? ` · ${check.severity}` : ""}`,
      );
      const refs = check.via.map((ref) => `\`${ref}\``).join(", ");
      out.push(
        check.offered === "matched"
          ? `Offered via material match: ${refs}`
          : check.offered === "explicit"
            ? `Offered via explicit guidance: ${refs}`
            : `Always offered — no referenced material-backed node gates it: ${refs}`,
        "",
      );
      if (check.explicitVia?.length && check.offered !== "explicit") {
        out.push(
          `Also selected explicitly: ${check.explicitVia.map((ref) => `\`${ref}\``).join(", ")}`,
          "",
        );
      }
      if (check.baseline.length > 0) {
        out.push("Baseline prose:");
        for (const baseline of check.baseline) {
          out.push(`- ${baseline.ref}`);
          if (baseline.warning) out.push(`  - ⚠ ${baseline.warning}`);
          // A missing heading falls back to the whole node, so later sections
          // can point back to it just as they can to a matched material node.
          const wholeNode =
            baseline.heading === undefined || baseline.warning !== undefined;
          const sectionKey = `${baseline.nodeId}\0${baseline.heading?.toLowerCase() ?? ""}`;
          if (
            baseline.body === undefined ||
            shownNodes.has(baseline.nodeId) ||
            (!wholeNode && shownSections.has(sectionKey))
          ) {
            out.push("  - Baseline prose shown above.", "");
            continue;
          }
          if (baseline.for) out.push(`  - Applies when: ${baseline.for}`);
          out.push(
            "",
            ...baseline.body.split(/\r?\n/).map((line) => `> ${line}`),
            "",
          );
          if (wholeNode) shownNodes.add(baseline.nodeId);
          else shownSections.add(sectionKey);
        }
        out.push("");
      }
      out.push(check.prose, "");
    }
  }

  if (packet.gaps.length > 0) {
    out.push("## Coverage gaps — report, do not grade");
    for (const gap of packet.gaps) {
      out.push(`- **${gap.kind}**: ${gap.detail}`);
      for (const file of gap.files ?? []) out.push(`  - \`${file}\``);
      for (const node of gap.nodes ?? []) out.push(`  - \`${node}\``);
    }
    out.push("");
  }

  out.push(
    "## Diff",
    untrustedBegin("diff"),
    "```diff",
    neutralizeSentinels(packet.diff.trimEnd()),
    "```",
    untrustedEnd("diff"),
    "",
  );
  out.push("## Produce findings");
  out.push(
    "For each applicable check, emit findings with severity, location, baseline,",
    "observable, and smallest coherent fix. If nothing drifts, say so plainly.",
  );
  return `${out.join("\n")}\n`;
}

function appendGroupedGuidance(out: string[], packet: ReviewPacket): void {
  if (packet.materialNodes?.length) {
    out.push("## Matched material-backed nodes");
    for (const node of packet.materialNodes) {
      appendMatchedNode(out, node, packet.explicitNodeIds?.includes(node.id));
    }
  }

  if (packet.explicitNodeIds?.length) {
    out.push(
      "## Explicit guidance",
      "",
      "The host supplied these nodes for this review. Weigh their applicability; selection does not establish a file match.",
      "",
    );
    const matchedIds = new Set(
      (packet.materialNodes ?? []).map((node) => node.id),
    );
    for (const id of packet.explicitNodeIds) {
      if (matchedIds.has(id)) out.push(`- \`${id}\` (prose shown above)`);
    }
    for (const node of packet.explicitNodes ?? []) {
      appendProseNode(out, node);
    }
    out.push("");
  }
}

function appendMatchedNode(
  out: string[],
  node: PacketMaterialNode,
  explicit = false,
  showRole = false,
  materialPackage?: string,
): void {
  const kind = node.kind ? ` _(${node.kind})_` : "";
  out.push(`### \`${node.id}\`${kind}`);
  if (showRole) {
    out.push(
      explicit
        ? "Matched material and explicitly requested."
        : "Matched material.",
      "",
    );
  }
  if (materialPackage) out.push(materialPackage, "");
  if (node.requires?.length)
    out.push(`requires: ${node.requires.join(", ")}`, "");
  if (node.for) out.push(`_${node.for}_`, "");
  out.push(node.prose, "");
  out.push("Matched materials:");
  for (const locator of node.matchedMaterials) {
    const declaration = node.materials.find(
      (material) => materialLocator(material) === locator,
    );
    const note = declaration ? normalizeMaterial(declaration).note : undefined;
    out.push(`- \`${locator}\`${note ? ` — Note: ${note}` : ""}`);
  }
  if (explicit) {
    const additional = node.materials.filter(
      (material) => !node.matchedMaterials.includes(materialLocator(material)),
    );
    if (additional.length > 0) {
      out.push("Other declared materials (not diff matches):");
      for (const material of additional) {
        const { locator, note } = normalizeMaterial(material);
        out.push(`- \`${locator}\`${note ? `: ${note}` : ""}`);
      }
    }
  }
  out.push("Files:");
  for (const file of node.files) out.push(`- \`${file}\``);
  out.push("");
}

function appendProseNode(
  out: string[],
  node: PacketExplicitNode,
  role?: "explicit" | "check" | "context",
  materialPackage?: string,
): void {
  out.push(`### \`${node.id}\``, "");
  if (role === "explicit") out.push("Explicitly requested.", "");
  if (role === "context") out.push("Automatic or prerequisite guidance.", "");
  if (materialPackage) out.push(materialPackage, "");
  if (node.requires?.length)
    out.push(`requires: ${node.requires.join(", ")}`, "");
  if (node.for) out.push(`Applies when: ${node.for}`, "");
  out.push(node.prose, "");
  if (role !== "context" && node.materials.length > 0) {
    out.push("Declared materials (not diff matches):");
    for (const material of node.materials) {
      const { locator, note } = normalizeMaterial(material);
      out.push(`- \`${locator}\`${note ? `: ${note}` : ""}`);
    }
    out.push("");
  }
}
