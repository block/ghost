import { join } from "node:path";
import {
  type GhostCatalogNode,
  type GhostMaterial,
  materialLocator,
  normalizeMaterial,
} from "#ghost-core";
import { GHOST_MATERIALS_DIR } from "../scan/constants.js";
import type { LoadedGhostPackage } from "../scan/fingerprint-package.js";
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

export interface PacketCheck {
  id: string;
  severity: string | undefined;
  offered: "matched" | "always";
  via: string[];
  prose: string;
  baseline: BaselineProse[];
}

export interface ReviewPacket {
  packageId: string;
  /** @deprecated Use `packageId`. */
  fingerprintId: string;
  touchedFiles: string[];
  materialNodes: PacketMaterialNode[];
  checks: PacketCheck[];
  gaps: CoverageGap[];
  diff: string;
  untrusted: true;
}

export interface BuildReviewPacketOptions {
  /** Absolute path of the ghost package directory (default: cwd/.ghost). */
  packageDir?: string;
  cwd?: string;
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
  );

  const materialNodes: PacketMaterialNode[] = resolution.materialNodes.map(
    (matched) => materialNodeFromMatch(ghostPackage, matched),
  );

  const checks: PacketCheck[] = resolution.offeredChecks.map((offered) => {
    const check = ghostPackage.checks.get(offered.id);
    return {
      id: offered.id,
      severity: offered.severity,
      offered: offered.offered,
      via: offered.via,
      prose: check?.doc.body.trim() ?? "",
      baseline:
        check?.references
          .map((ref) => resolveBaseline(ref, ghostPackage.catalog))
          .filter((ref): ref is BaselineProse => ref !== null) ?? [],
    };
  });

  return {
    packageId: ghostPackage.manifest.id,
    fingerprintId: ghostPackage.manifest.id,
    touchedFiles: resolution.touchedFiles.map((file) => file.path),
    materialNodes,
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
      out.push("Files:");
      for (const file of node.files) out.push(`- \`${file}\``);
      out.push("");
    }
  }

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
          : `Always offered — no referenced material-backed node gates it: ${refs}`,
        "",
      );
      if (check.baseline.length > 0) {
        out.push("Baseline prose:");
        for (const baseline of check.baseline) {
          out.push(`- ${baseline.ref}`);
          if (baseline.warning) out.push(`  - ⚠ ${baseline.warning}`);
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
