import { join } from "node:path";
import {
  type GhostCatalogNode,
  type GhostMaterial,
  materialLocator,
  normalizeMaterial,
} from "#ghost-core";
import { formatLoadDiagnostics } from "../internal/load-diagnostics.js";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type { LoadedGhostPackage } from "../scan/ghost-package.js";
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

export interface PacketCheck {
  id: string;
  severity: string | undefined;
  offered: "matched" | "always" | "explicit";
  via: string[];
  explicitVia?: string[];
  prose: string;
  baseline: BaselineProse[];
}

export interface ReviewPacket {
  packageId: string;
  /** Invalid guidance and check files skipped during loading. */
  diagnostics: ReadonlyArray<Readonly<{ file: string; message: string }>>;
  touchedFiles: string[];
  materialNodes: PacketMaterialNode[];
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
  const resolution = resolveReview(
    ghostPackage.catalog,
    ghostPackage.checks,
    diffText,
    {
      repoRoot: await resolveGitRoot(cwd),
      packageDir: options.packageDir ?? join(cwd, ".ghost"),
      materialsDir: GHOST_MATERIALS_DIR,
    },
    options.nodeIds,
  );

  const materialNodes: PacketMaterialNode[] = resolution.materialNodes.map(
    (matched) => materialNodeFromMatch(ghostPackage, matched),
  );

  const matchedIds = new Set(materialNodes.map((node) => node.id));
  const explicitNodes = resolution.explicitNodeIds
    .filter((id) => !matchedIds.has(id))
    .map((id): PacketExplicitNode => {
      const node = ghostPackage.catalog.nodes.get(id) as GhostCatalogNode;
      return {
        id: node.id,
        ...(node.kind !== undefined ? { kind: node.kind } : {}),
        ...(node.for !== undefined ? { for: node.for } : {}),
        prose: node.body,
        materials: node.materials ?? [],
      };
    });

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
          .filter((ref): ref is BaselineProse => ref !== null) ?? [],
    };
  });

  return {
    packageId: ghostPackage.manifest.id,
    diagnostics: [...ghostPackage.invalid, ...ghostPackage.invalidChecks],
    touchedFiles: resolution.touchedFiles.map((file) => file.path),
    materialNodes,
    ...(resolution.explicitNodeIds.length > 0
      ? { explicitNodeIds: resolution.explicitNodeIds, explicitNodes }
      : {}),
    checks,
    gaps: resolution.gaps,
    diff: diffText,
    untrusted: true,
  };
}

function materialNodeFromMatch(
  ghostPackage: LoadedGhostPackage,
  matched: { id: string; locators: string[]; files: string[] },
): PacketMaterialNode {
  const node = ghostPackage.catalog.nodes.get(matched.id) as GhostCatalogNode;
  return {
    id: node.id,
    ...(node.kind !== undefined ? { kind: node.kind } : {}),
    ...(node.for !== undefined ? { for: node.for } : {}),
    prose: node.body,
    materials: node.materials ?? [],
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

  if (packet.touchedFiles.length > 0) {
    out.push("## Touched files");
    for (const file of packet.touchedFiles) out.push(`- \`${file}\``);
    out.push("");
  }

  if (packet.materialNodes.length > 0) {
    out.push("## Matched material-backed nodes");
    for (const node of packet.materialNodes) {
      const kind = node.kind ? ` _(${node.kind})_` : "";
      out.push(`### \`${node.id}\`${kind}`);
      if (node.for) out.push(`_${node.for}_`, "");
      out.push(node.prose, "");
      out.push("Matched materials:");
      for (const locator of node.matchedMaterials) {
        const declaration = node.materials.find(
          (material) => materialLocator(material) === locator,
        );
        const note = declaration
          ? normalizeMaterial(declaration).note
          : undefined;
        out.push(`- \`${locator}\`${note ? ` — Note: ${note}` : ""}`);
      }
      if (packet.explicitNodeIds?.includes(node.id)) {
        const additional = node.materials.filter(
          (material) =>
            !node.matchedMaterials.includes(materialLocator(material)),
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
  }

  if (packet.explicitNodeIds?.length) {
    out.push(
      "## Explicit guidance",
      "",
      "The host supplied these nodes for this review. Weigh their applicability; selection does not establish a file match.",
      "",
    );
    const matchedIds = new Set(packet.materialNodes.map((node) => node.id));
    for (const id of packet.explicitNodeIds) {
      if (matchedIds.has(id)) out.push(`- \`${id}\` (prose shown above)`);
    }
    for (const node of packet.explicitNodes ?? []) {
      out.push(`### \`${node.id}\``, "");
      if (node.for) out.push(`Applies when: ${node.for}`, "");
      out.push(node.prose, "");
      if (node.materials.length > 0) {
        out.push("Declared materials (not diff matches):");
        for (const material of node.materials) {
          const { locator, note } = normalizeMaterial(material);
          out.push(`- \`${locator}\`${note ? `: ${note}` : ""}`);
        }
        out.push("");
      }
    }
    out.push("");
  }

  const shownNodes = new Set([
    ...packet.materialNodes.map((node) => node.id),
    ...(packet.explicitNodes ?? []).map((node) => node.id),
  ]);
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
